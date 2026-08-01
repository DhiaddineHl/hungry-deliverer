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
`POST /drivers` is the only backend endpoint open without a token, because the deliverer has no
session at registration time.

```
                       Keycloak (realm: hungry)
  login / refresh ────► /token  /auth  /userinfo  /logout
  register / read ────► Hungry backend  ──admin REST──► Keycloak
                        POST/GET/PUT /drivers          (hungry-admin service account)
```

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

## Files

```
src/services/keycloak/
  config.ts          endpoints derived from EXPO_PUBLIC_* env vars (no admin endpoints)
  token-storage.ts   SecureStore on native, localStorage on web
  auth-service.ts    token/userinfo/logout calls, JWT expiry + realm-role decoding
src/services/api/
  client.ts          axios + Bearer interceptor (refreshes before the request) + ApiError
  types.ts           backend DTOs (DriverInput/Driver, VehicleInput/Vehicle, VehicleType)
  driver-service.ts  registerDriver / getDriverByAccount / updateDriver
  query-keys.ts      driverKeys factory
  query-client.ts    QueryClient defaults + AppState → focusManager bridge
src/store/driver-store.ts    persisted { keycloakUserId, driverId, vehicleClass }
src/hooks/use-driver.ts      driverQueryOptions + useDriver / useRegisterDriver / useUpdateDriver
src/contexts/auth-context.tsx AuthProvider + useAuth (+ wasCancelled helper)
src/components/auth/vehicle-class-field.tsx  the class picker used by the sign-up form
```

The router guard lives in `src/app/_layout.tsx`: it waits for `isLoading` (so no login-screen
flash on cold start), treats the index route and `register` as the auth group, and bounces
everything else to `/` while signed out.

## Environment

`.env` (see `.env.example`; every `EXPO_PUBLIC_*` value ships in the bundle in plaintext):

```dotenv
EXPO_PUBLIC_KEYCLOAK_URL=http://<lan-ip>:8081
EXPO_PUBLIC_KEYCLOAK_REALM=hungry
EXPO_PUBLIC_KEYCLOAK_CLIENT_ID=hungry-deliverer-app
EXPO_PUBLIC_API_URL=http://<lan-ip>:8080
```

On a physical device `localhost` is the phone — use the dev machine's LAN IP for both. Android
debug builds already allow cleartext (`usesCleartextTraffic` in the debug manifest).

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
- **Google login** (optional) — Identity provider alias `google`; the app passes
  `kc_idp_hint=google`. Google's authorized redirect URI is Keycloak's broker endpoint
  (`https://<host>/realms/hungry/broker/google/endpoint`), never `hungrydeliverer://`.
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
- [ ] Kill and relaunch → still signed in, no login-screen flash.
- [ ] Shorten the access-token lifespan to 1 min → the next API call refreshes silently.
- [ ] Revoke the session in the Keycloak console → next refresh fails → back to the login screen.
- [ ] Log out from the drawer → SecureStore empty, query cache and driver store cleared, and
      "Continue with Google" shows the account picker again (proves `id_token_hint` worked).
- [ ] Point `EXPO_PUBLIC_KEYCLOAK_URL` at an unreachable IP → login fails in ≤15 s with the
      timeout message instead of hanging.
- [ ] `grep -r "ADMIN" .env* src/services/` finds nothing.
