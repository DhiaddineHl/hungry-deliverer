# Keycloak auth in the deliverer app — what is wired, and how to run it

This is the concrete implementation of `keycloak-expo-integration-guide.md` for **this** app.
The guide describes the portable pattern; this file records the deliverer-specific choices, the
Keycloak/back-end setup it depends on, and how to verify the whole thing end to end.

| Placeholder in the guide | Value here |
| --- | --- |
| `<Entity>` / `<entities>` | `Driver` / `drivers` |
| `<scheme>` | `hungrydeliverer` |
| `<realm>` | `hungry` |
| `<client-id>` | `hungry-deliverer-app` |

## The one rule

The app never holds Keycloak admin credentials. It calls Keycloak for exactly four things —
token, authorize, userinfo, logout — and calls the **backend** for register, read and update.
`POST /drivers` and the two `POST /drivers/verification/*` endpoints are the only backend
endpoints open without a token, because the deliverer has no session at registration time.

```
                       Keycloak (realm: hungry)
  login / refresh ────► /token  /auth  /userinfo  /logout
  register / read ────► Hungry backend  ──admin REST──► Keycloak
                        POST/GET/PUT /drivers          (hungry-admin service account)
                        POST /drivers/me
                        POST /drivers/verification/send
                        POST /drivers/verification/confirm
```

## E-mail verification: the gate between sign-up and the app

Registration no longer signs anyone in. `POST /drivers` creates the Keycloak user with
`emailVerified = false` and mails a one-time numeric code; the app hands the address, the chosen
password and the first name to `usePendingVerificationStore` (in memory only — a password does not
belong in AsyncStorage) and pushes `/verification`. Entering the code calls
`POST /drivers/verification/confirm`, which flips the Keycloak account's `emailVerified` flag, and
only then does the screen sign in with the held password and continue to the region picker.

Keycloak stays the single source of truth: the flag surfaces as the `email_verified` claim, so the
router guard in `src/app/_layout.tsx` sends **any** session whose `user.email_verified === false`
back to `/verification`, whichever way it got there — a password login for an account that
abandoned the step, or a restored session. A realm that does not emit the claim reads as
`undefined`, which deliberately gates nobody. Arriving with a session and no code in flight sends
one automatically; arriving from sign-up does not, because registration already mailed one.

The code is single-use, expires (10 min), is attempt-capped (5) and refuses a resend inside the
cool-down (60 s) with a 429 that carries `retryAfterSeconds` — which the screen adopts for its
Resend timer instead of guessing. `410` (expired) and `429` (attempts spent) clear the boxes and
point at Resend; `400` is just a wrong code. All four knobs are backend properties
(`hungry.driver.verification.*`), and `codeLength` comes back on every send, so the screen draws
whatever the backend actually generates rather than assuming six.

A Google sign-in skips all of this: Keycloak brokers the account already verified.

Backend side, this mirrors the customer flow exactly — the code exchange itself lives once in
`delivery.hungry.core.application.service.EmailVerificationService`, and
`DriverVerificationService` only says which accounts it speaks for (Driver records, resolved by
e-mail). That scoping is what stops the deliverer app from mailing a code to a customer's address.

## Vehicle class: one choice, three effects

The sign-up form requires a **vehicle class** (`BICYCLE`, `MOTORCYCLE`, `SCOOTER`, `CAR`, `VAN`,
`TRUCK` — the backend `VehicleType` enum). Picking it at registration is what lets the backend,
in a single transaction:

1. create the Keycloak user with the realm roles **`DRIVER` + `VEHICLE_<CLASS>`**, so every
   access token says what the deliverer drives (`realm_access.roles`) with no DB round-trip;
2. create the **`vehicle` row** and link it to the new `driver` row (`Driver.vehicle`);
3. mirror the class in the Keycloak user's `vehicleClass` attribute for display/queries.

Motorized classes also ask for a licence plate (required) and a driving-licence number
(optional). A new driver is persisted as `PENDING_APPROVAL` — the back-office approves before
dispatch. Changing the class later through `PUT /drivers` swaps `VEHICLE_<OLD>` for
`VEHICLE_<NEW>`; `DRIVER` is never touched.

## Google sign-in and the driver record

"Continue with Google" is the browser-based **Authorization Code + PKCE** flow, with
`kc_idp_hint=google` so Keycloak skips its own login page and jumps straight to Google. Two
redirect hops, and they are not interchangeable:

```
App --(1)--> Keycloak --(2)--> Google --(2 back)--> Keycloak --(1 back)--> App
```

- **Hop 1** (app <-> Keycloak) uses the app's own `redirect_uri` - `hungrydeliverer://auth/callback`
  in a native build, an `exp://...` URL in Expo Go. It must be in the client's *Valid redirect URIs*.
- **Hop 2** (Keycloak <-> Google) uses Keycloak's broker endpoint, configured in the Google Cloud
  Console: `https://<keycloak-host>/realms/hungry/broker/google/endpoint`. Google requires HTTPS
  (a LAN IP will not be accepted), and it never sees the `hungrydeliverer://` scheme.

`app/auth/callback.tsx` exists purely to catch hop 1's deep link. `expo-auth-session` consumes
that URL itself, but expo-router *also* receives it - without the route the app would land on
the built-in "Unmatched Route" screen even on a successful sign-in. The screen owns no auth
logic; the root navigator routes once `isAuthenticated` flips.

The request sends `prompt=login` so Keycloak cannot silently resume its browser SSO session: the
`KEYCLOAK_IDENTITY` cookie outlives our back-channel logout, which only revokes the refresh
token. Keycloak must **also** be told to forward an account chooser to Google - *Identity
providers > google > Advanced > Prompt = `select_account`* - or Google auto-selects its
remembered account on hop 2.

### Where the driver record comes from

Keycloak provisions a brokered account **itself**, so nothing ever called `POST /drivers` for it
and that endpoint would answer 409 if it did (it always creates a new Keycloak user). The gap is
closed by `POST /drivers/me`:

| | in-app sign-up | Google sign-in |
| --- | --- | --- |
| Keycloak user | created by the backend (`POST /drivers`) | created by Keycloak's Google broker |
| Driver row | same transaction as the user | `POST /drivers/me`, after the token exchange |
| Realm roles | `DRIVER` + `VEHICLE_<CLASS>` at creation | `DRIVER` via `ensureRealmRoles` |
| Vehicle class | required by the form | **none** - no sign-up form to carry one |
| Status | `PENDING_APPROVAL` | `PENDING_APPROVAL` |

`POST /drivers/me` is **authenticated and idempotent**. It takes the account from the token's
`sub` (never from the body, so a client cannot bind a record to someone else's identity) and
reads email/first/last name back from Keycloak; the body only contributes optional extras. A
second call returns the existing record instead of failing, which is why `ensureDriverForAccount`
can run after *every* login and session restore - including for accounts that predate it.

`AuthProvider` calls it fire-and-forget after login, Google sign-in and session restore, and
exposes `isDriverResolved` for screens that would rather wait than render an empty profile. A
backend hiccup there must not lock a deliverer with a valid session out of the app.

> **A Google-registered deliverer has no vehicle class**, so no `VEHICLE_<CLASS>` role and no
> `vehicle` row. They are `PENDING_APPROVAL` like every other new deliverer and not dispatchable
> until the class is set - through `PUT /drivers` (`useUpdateDriver`), which grants the role at
> that point - or the back-office intervenes. There is no in-app screen for that yet.

## Files

```
src/services/keycloak/
  config.ts          endpoints derived from EXPO_PUBLIC_* env vars (no admin endpoints)
  token-storage.ts   SecureStore on native, localStorage on web
  auth-service.ts    token/userinfo/logout calls, JWT expiry + realm-role decoding
src/services/api/
  client.ts          axios + Bearer interceptor (refreshes before the request) + ApiError
  types.ts           backend DTOs (DriverInput/Driver, VehicleInput/Vehicle, VehicleType)
  driver-service.ts  registerDriver / createDriverForAccount / getDriverByAccount / updateDriver
                     + sendVerificationCode / confirmVerificationCode
  query-keys.ts      driverKeys factory
  query-client.ts    QueryClient defaults + AppState → focusManager bridge
src/store/driver-store.ts    persisted { keycloakUserId, driverId, vehicleClass }
src/store/pending-verification-store.ts  in-memory sign-up -> code-screen hand-off
src/hooks/use-driver.ts      driverQueryOptions + ensureDriverForAccount
                             + useDriver / useRegisterDriver / useUpdateDriver
src/contexts/auth-context.tsx AuthProvider + useAuth (+ wasCancelled helper)
src/app/auth/callback.tsx    landing route for the OAuth deep link (see above)
src/app/verification.tsx     the one-time-code screen (see above)
src/components/auth/vehicle-class-field.tsx  the class picker used by the sign-up form
```

The router guard lives in `src/app/_layout.tsx`: it waits for `isLoading` (so no login-screen
flash on cold start), treats the index route, `register`, `auth` and `verification` as the auth
group - `auth` belongs there so an arrival at the OAuth callback is not bounced back to login while
the token exchange is still in flight, and `verification` because sign-up reaches it before any
session exists - and bounces everything else to `/` while signed out. With a session it applies two
rules in order: an unverified e-mail goes to `/verification`, then a missing service area goes to
`/region-selection`.

## Environment

`.env` (see `.env.example`; every `EXPO_PUBLIC_*` value ships in the bundle in plaintext):

```dotenv
EXPO_PUBLIC_KEYCLOAK_URL=http://localhost:8081
EXPO_PUBLIC_KEYCLOAK_REALM=hungry
EXPO_PUBLIC_KEYCLOAK_CLIENT_ID=hungry-deliverer-app
EXPO_PUBLIC_API_URL=http://<lan-ip>:8082
```

The two hosts differ on purpose, and mixing them up breaks Google sign-in:

- **`EXPO_PUBLIC_API_URL` must be reachable from the device** — it is only ever called by the
  app, so on a physical device it is the dev machine's LAN IP, and the port is the
  jfwk-gateway edge (`:8082`), not hungry-app (`:8080`).
- **`EXPO_PUBLIC_KEYCLOAK_URL` must match `KC_HOSTNAME`**, which backend compose pins to
  `http://localhost:8081`. Keycloak builds every browser-facing redirect from `KC_HOSTNAME`,
  so pointing this at the LAN IP does not keep the flow on the LAN IP — the first redirect
  bounces the browser to `localhost:8081` anyway, and on a device that cannot reach it that
  is the **"localhost refused to connect"** error. This is the same value the customer app
  uses, where Google sign-in works.

The password login keeps working with either host, which is the tell: it is a back-channel
POST to the token endpoint with no browser and no redirect. When only the Google button is
broken, suspect this pair.

If you do move Keycloak to another host (an HTTPS tunnel, say), `KC_HOSTNAME` and
`KEYCLOAK_ISSUER_URI` on **both** hungry-app and the gateway have to move with it — they are
matched against the token's `iss` claim.

Android debug builds already allow cleartext (`usesCleartextTraffic` in the debug manifest).

`expo-secure-store` and `expo-web-browser` are config plugins, so a native build must be
re-prebuilt/rebuilt after this change (`npx expo run:android`); Expo Go picks them up as is.

## Keycloak setup (realm `hungry`)

`hungry-backend/keycloak/hungry-realm.json` now provisions all of this on a **fresh** realm
import. An existing realm needs it applied by hand in the admin console:

- **Client `hungry-deliverer-app`** — public, Standard flow **on**, PKCE `S256`, Direct access
  grants **on** (the app has a native login form; see the ROPC note in the guide), service
  accounts off. Valid redirect URIs: `hungrydeliverer://auth/callback` **and** the `exp://…` URL
  the app logs at startup (`[Auth] OAuth redirect_uri = …`) — they must match byte for byte.
  Web origins `+`.
- **Realm roles** — `DRIVER` and `VEHICLE_BICYCLE|MOTORCYCLE|SCOOTER|CAR|VAN|TRUCK`. The backend
  auto-creates a missing role, which is why the `hungry-admin` service account needs
  `manage-realm` as well as `manage-users`.
- **Google login** — Identity provider alias `google` (the app passes `kc_idp_hint=google`), with
  *Advanced > Prompt = `select_account`* so the account picker survives a logout. Google's
  authorized redirect URI is Keycloak's broker endpoint
  (`https://<host>/realms/hungry/broker/google/endpoint`), never `hungrydeliverer://`. See
  "Google sign-in and the driver record" above.
- **`phoneNumber` / `vehicleClass` attributes** — map them into the userinfo claims if you want
  `fetchUserInfo()` to return them; otherwise patch them in via `reloadUser(overrides)`.

Backend side: `hungry.security.enabled=true` to exercise the real flow (dev defaults to `false`,
which opens every endpoint). See `hungry-backend/KEYCLOAK.md`.

## Verify (on a physical device)

- [ ] `GET {KEYCLOAK_URL}/realms/hungry/.well-known/openid-configuration` loads in the phone's browser.
- [ ] Sign up with a vehicle class → one `POST /drivers` → the `driver` row, the `vehicle` row and
      the Keycloak user all exist, `keycloakUserId == sub`, and the user has `DRIVER` +
      `VEHICLE_<CLASS>`.
- [ ] The app logs in automatically right after sign-up and lands on `/delivery`.
- [ ] "Continue with Google" with a Google account that has never used the app -> lands on
      `/delivery` (never on "Unmatched Route"), and one `POST /drivers/me` creates a `driver` row
      with `keycloakUserId == sub`, `code == sub`, status `PENDING_APPROVAL`, no vehicle, and the
      `DRIVER` realm role added to the brokered Keycloak user.
- [ ] Sign in with Google **again** -> `GET /drivers/by-account/{sub}` hits and no second
      `POST /drivers/me` row is created (the endpoint is idempotent).
- [ ] Kill and relaunch → still signed in, no login-screen flash.
- [ ] Shorten the access-token lifespan to 1 min → the next API call refreshes silently.
- [ ] Revoke the session in the Keycloak console → next refresh fails → back to the login screen.
- [ ] Log out from the drawer → SecureStore empty, query cache and driver store cleared, and
      "Continue with Google" shows the account picker again (proves `id_token_hint` worked).
- [ ] Point `EXPO_PUBLIC_KEYCLOAK_URL` at an unreachable IP → login fails in ≤15 s with the
      timeout message instead of hanging.
- [ ] `grep -r "ADMIN" .env* src/services/` finds nothing.
