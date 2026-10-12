# Security review — Hungry Rider (hungry-deliverer)

- **Date:** 2026-10-10
- **Branch:** `redesign/driver-app`
- **Scope:** the whole mobile app (`src/`, `app.json`, `app.config.ts`, `eas.json`, dependencies, files in the project folder). The backend was not available for review; issues that only the backend can fix are listed separately in §4.
- **Method:** a manual code review using the vulnerability classes of the `security-guidance` plugin (secrets, injection, XSS, SSRF, IDOR, auth bypass, unsafe deserialization, path traversal, insecure transport), plus mobile-specific checks (token storage, deep links, backups, logging, session lifecycle). `npm audit` covered dependencies.

## 1. Summary

| ID | Severity | Issue | Status |
|---|---|---|---|
| F1 | High | Password login and session restore admit Keycloak accounts that are not riders | Fixed |
| F2 | High | Realtime (STOMP) connection survives logout, still authenticated as the previous rider | Fixed |
| F3 | High | Cleartext HTTP/WS allowed in every build; hard-coded private-IP fallbacks | Fixed |
| F4 | Medium | Concurrent token refreshes race under refresh-token rotation; JWT expiry check broken on Hermes | Fixed |
| F5 | Medium | Pickup and delivery shown as done before (and regardless of) the backend accepting them | Fixed |
| F6 | Medium | Demo coordinates reported to dispatch as the rider's real position | Fixed |
| F7 | Medium | Deep link can inject arbitrary "rejection reason" text into the application screen | Fixed |
| F8 | Medium | Server-side session end left the rider's data and shift running on the device | Fixed |
| F9 | Low | Android `allowBackup` enabled | Fixed |
| F10 | Low | Production logs exposed backend URLs, error bodies, push status, OAuth redirect | Fixed |
| F11 | Low | Server 5xx bodies shown verbatim to users | Fixed |
| F12 | Critical/High (deps) | `shell-quote` command injection (critical), `axios` prototype pollution, `nanoid`, others | Fixed where a compatible patch exists; rest in §5 |
| B1–B8 | — | Issues only the backend or ops can close | Open — see §4 |

## 2. Findings fixed in the app

### F1 — Non-rider accounts could sign in (High)
**Where:** `src/contexts/auth-context.tsx`

**Issue:** the Keycloak realm is shared with the customer app and brokers any Google account. The Google flow already turned away accounts without a Driver record, but the password login and the cold-start session restore did not. Any customer account could sign in with its password and reach the rider app's screens and API calls.

**Fix:** one `admitRider()` gate now runs after every way into a session (Google, password, stored-session restore). It accepts an account only if a Driver record exists for it, and signs everything else straight back out with a translated message (`auth.errorNotRider`). A failed lookup (network) still lets the session through, so riders aren't locked out by a network blip. The backend must still authorize every call (B1).

### F2 — Realtime connection leaked across accounts (High)
**Where:** `src/services/realtime/stomp-client.ts`, `auth-context.tsx`

**Issue:** the STOMP client is a module singleton that authenticates once, at CONNECT. Logout cleared the tokens but left the socket open with the old rider's identity and subscriptions. The next account signed in on that phone would receive the previous rider's offers and publish its GPS fixes under the previous rider's id.

**Fix:** a new `disconnectRealtime()` unsubscribes everything, deactivates the client and drops the singleton. It runs on every sign-out path. The next subscription connects again with the current token.

### F3 — Insecure transport (High)
**Where:** `app.json`, `app.config.ts`, `src/config/env.ts`, `src/services/api/client.ts`, `src/services/keycloak/config.ts`, `stomp-client.ts`

**Issue:**
- `usesCleartextTraffic: true` shipped in every build.
- The API, Keycloak and WebSocket URLs fell back to hard-coded `http://172.29.80.1` LAN addresses.
- Access/refresh tokens, the password grant and live rider positions could therefore travel unencrypted, or go to an unexpected host when an env var was missing.

**Fix:**
- All endpoints now come from `src/config/env.ts`, which fails closed. A missing variable throws with its name, and a release build (`__DEV__` false) refuses any non-`https://` URL. The WebSocket URL is derived from it, so `https` gives `wss`.
- `app.config.ts` allows cleartext only outside production. The EAS `production` profile now sets `APP_ENV=production`, which turns `usesCleartextTraffic` off; this was checked with `expo config`.

**Consequence:** any release-mode build (including the EAS `preview` profile) needs `https://` URLs in its env.

### F4 — Token refresh race and broken expiry check (Medium)
**Where:** `src/services/keycloak/auth-service.ts`

**Issue:**
- Parallel callers (REST interceptor, STOMP reconnect, userinfo) each started their own refresh. With refresh-token rotation, all but the first spend a token that is already invalid. Keycloak rejects them and the rider is logged out at random.
- `isTokenExpired` decoded base64url without padding. Hermes's `atob` throws on that, so tokens read as expired and every request triggered a refresh, which made the race much more frequent.
- There was no margin for clock skew.

**Fix:**
- Refresh is single-flight: concurrent callers share one in-flight promise.
- A new `decodeJwtPayload` pads the base64 correctly. The decoded claims are used only to schedule the next refresh, never to grant access.
- Tokens refresh 30 s before expiry.
- An unused, signature-less `rolesFromToken` was removed so it can't be mistaken for an authorization check.

### F5 — Trip state not confirmed by the backend (Medium)
**Where:** `src/features/session/session-context.tsx`, `src/components/sheets/active-order-sheet.tsx`

**Issue:** pickup and delivery moved the UI forward first and sent `POST /api/deliveries/{id}/status` fire-and-forget, logging any failure. A refused or lost request (a 409 conflict, no network) left the rider believing the order was delivered while the backend still had it in progress. The rider then went back online with the order stranded.

**Fix:**
- A new `report()` awaits the backend and moves the phase only on success.
- While waiting, the pickup button shows a spinner and the slider shows "Confirming…".
- On failure the trip stays where it was, an error banner explains it, and the action becomes "Try again". This is the D6–D8 error state from the design spec.

### F6 — Fake position sent as real (Medium)
**Where:** `session-context.tsx`, `src/components/sheets/session-sheets.tsx`

**Issue:** before the first GPS fix, the session used the demo city-centre point (`COURIER_START`). It sent that point in `PUT /drivers/me/availability` and in pickup/delivery status reports, so dispatch matched offers against a place the rider wasn't.

**Fix:**
- Only a real fix (`locationRef`) is ever reported.
- Go online is disabled ("Finding your location…") until a fix exists.
- Without location permission, the offline sheet asks for it and links to the system settings.
- A refused go-online now shows an error and a retry instead of silently dropping back offline.

### F7 — Content spoofing through deep links (Medium)
**Where:** `src/features/auth/applicant-route.ts`, `src/app/register.tsx`, `src/store/applicant-store.ts` (new)

**Issue:** every route can be opened by a `hungrydeliverer://` link. The application screen took `reapply` and `rejectionReason` from route params and showed them as the team's verdict. A link like `hungrydeliverer://register?email=…&reapply=1&rejectionReason=<anything>` could put arbitrary text in front of an applicant, for example to steer them to a phishing contact.

**Fix:** the lookup outcome now goes into an in-memory store, written only by `routeForApplicant` from the backend's answer. The form reads it only for the same email address. The params are ignored, and the store is cleared once the application is submitted.

### F8 — Session end on the server was not a sign-out (Medium)
**Where:** `auth-service.ts`, `auth-context.tsx`, `session-context.tsx`

**Issue:** when a refresh token was rejected (revoked, expired, password changed elsewhere), only the tokens were deleted. Several things kept running:
- the persisted driver store and the query cache (another rider's data)
- the realtime socket
- the shift itself (availability and position reports)

**Fix:**
- `refreshAccessToken` notifies `onSessionEnded` listeners.
- `AuthProvider` runs the same local cleanup as logout (`dropLocalSession`).
- `SessionProvider` stops the shift whenever the app is no longer authenticated.

### F9 — Android backups (Low)
`android.allowBackup` was left at its default (on), so app data could be pulled with `adb backup` or restored onto another device. It is now set to `false` in `app.config.ts`.

### F10 — Logging in production (Low)
Release builds wrote these to the device log:
- the OAuth redirect URI (on every render)
- the WebSocket URL
- raw error objects from offer, accept, location and status calls
- push-registration results

All `console.*` calls in `src/` now run only under `__DEV__`.

### F11 — Server error bodies shown to users (Low)
**Where:** `src/services/api/client.ts`

The response interceptor showed `detail`/`message` from any error response. A 5xx body can carry stack traces, SQL or internal hostnames. 5xx responses now map to a generic message. 4xx details, which are validation messages written for the user, still pass through.

### F12 — Dependencies
`npm audit fix` (semver-compatible only) fixed:
- `shell-quote` command injection (critical)
- `axios` 1.19 prototype-pollution gadgets (now 1.20.0, which matters at runtime)
- `nanoid`, `postcss`, `brace-expansion` and others

Production-tree totals went from 1 critical / 30 high / 13 moderate to **0 critical / 21 high / 11 moderate**. What remains is listed in §5. I did not apply `npm audit fix --force`: its proposals downgrade Expo to SDK 44 and React Native to 0.72, which would break the app.

## 3. Checked and found sound

- **Tokens:** stored in `expo-secure-store` on device. The `localStorage` fallback exists only for the dev web preview, which is not shipped (B8).
- **Browser sign-in:** Authorization Code + PKCE through `expo-auth-session`, which also validates `state`. `prompt=login` prevents silent re-authentication as the previous account.
- **Backend credentials:** no admin or service credentials in the bundle. Every `EXPO_PUBLIC_*` value is public client data.
- **Firebase admin key:** the service-account file is gitignored and has never been committed (`git log --all` is empty for it).
- **Untrusted data:** realtime payloads are validated before use (`parseDriverNotification` / `parseDeliveryOffer`). There is no `eval`, `new Function`, `dangerouslySetInnerHTML`, HTML WebView or dynamic `require`.
- **URL construction:** path segments in API URLs are `encodeURIComponent`-escaped.
- **Outbound links:** `Linking.openURL` builds only `tel:` URLs, and legal links are fixed `https://hungry.tn/…` constants.
- **Secrets in memory:** the password-reset ticket and the pending sign-up password are held in memory only (zustand, not persisted) and cleared on logout or completion.
- **Permissions:** location is foreground only (no background permission), the camera is requested only when needed, and the microphone is disabled.

## 4. Open — backend and operations (cannot be fixed in the app)

| ID | Severity | Issue | Recommendation |
|---|---|---|---|
| B1 | High | **Authorization must not rely on the app.** The app sends `driverId` in `/app/drivers/{driverId}/location`, in the delivery-status body, and reads `/drivers/by-account/{keycloakUserId}`. These are IDOR risks if the server trusts the ids. F1 is defence in depth only. | Take the driver from the token's principal (`sub` → Driver) on every endpoint and STOMP destination. Reject a mismatched path id or body id. Require the rider role/realm scope, not just a valid token. |
| B2 | High | **Geofences are enforced only on the client.** The 120 m pickup and 200 m delivery radii are checked in the app; the status controller ignores the coordinates. GPS can be spoofed. | Validate the position (and plausibility: speed, freshness) server-side before accepting `PICKED_UP` / `DELIVERED`. |
| B3 | High | **Google Maps / Routes API key ships in the app** (`EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`, manifest). Anyone can extract it and spend the quota. | Restrict the Maps SDK key to the Android package + signing SHA-1 and the iOS bundle id. Proxy Routes API calls through the backend (rider-authenticated, rate-limited) and remove the Routes key from the bundle. |
| B4 | Medium | **Applicant lookup enables enumeration and exposes data.** `POST /driver-requests/verification/lookup` is unauthenticated and reveals whether an address has an account or application, and the rejection reason. | Rate-limit per IP/device. Return the rejection reason only after the code/email proves ownership. Consider uniform responses. |
| B5 | Medium | **Document upload is authorized only by knowing a request id.** `/driver-requests/{id}/{document}` is unauthenticated. | Issue a short-lived upload token with the created request. Validate the MIME type with magic bytes and cap file size server-side. Store files outside any public path. |
| B6 | Medium | **Resource-owner password grant** is used for the native login (deprecated in OAuth 2.1; the app handles the raw password). | Move to the browser Authorization Code + PKCE flow, which already exists for Google. If ROPC stays, enable brute-force detection in Keycloak. |
| B7 | Medium | **Firebase Admin SDK private key in the mobile project folder** (`hungry-delivery-app-…-adminsdk-….json`). It is gitignored, but it sits in a client workspace (copied in zips, synced folders, EAS uploads if `.gitignore` handling changes). | Move it to the backend's secret store and delete it from this folder. If the folder was ever shared, rotate the key in Google Cloud. |
| B8 | Low | **Web build stores tokens in `localStorage`** (XSS-readable). | Keep the web target dev-only, or switch to an httpOnly-cookie BFF before shipping web. |

## 5. Remaining dependency advisories

The 21 high / 11 moderate findings left are inside the Expo / Metro / React Native toolchain (`@expo/cli`, `metro*`, `micromatch`/`braces`, `node-forge` in code-signing tooling, `image-size`, `xcode`, `uuid`). Some packages that do ship in the app (`react-native`, `react-native-reanimated`, `-screens`, `-maps`, `-worklets`) are flagged too, but only because they depend on that toolchain; the fixes npm proposes are downgrades. Most of this code runs at build time on the developer machine and is not part of the app bundle. These clear with the next Expo SDK upgrade; track them then rather than force-downgrading.

## 6. Verification

- `npx tsc --noEmit` passes.
- `npx expo lint`: no errors, no warnings.
- `npx expo export --platform android` builds. The bundle contains no hard-coded `172.29.80.1` fallback.
- `expo config` with `APP_ENV=production` shows `usesCleartextTraffic: false` and `allowBackup: false`. The development profile keeps cleartext for the LAN backend.

None of these flows has been run against a live backend or a device yet. Before shipping, check on a device:
- sign-in with a customer account is refused
- logout then login as another rider gets only that rider's offers
- a failed delivery confirmation shows the banner and keeps the trip
- a release build with `http://` env values refuses to start
