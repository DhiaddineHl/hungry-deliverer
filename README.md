# Hungry Deliverer 🛵

The courier app for Hungry — an Expo (SDK 57) React Native app built from the frames in `design/`.

## The courier flow

Every frame is the same persistent Google map with different overlays on top. A session state
machine drives which overlay is shown:

```
offline → finding → offer → toStore → orderReady → toCustomer → completed → …
```

| Phase | What the courier sees |
| --- | --- |
| `offline` | Demand pills over the map, "Go online" |
| `finding` | "Finding orders", Stop Session, nearest-busy-place carousel |
| `offer` | Route preview + offer card; tap either leg to preview it; the CTA fills as the offer expires |
| `toStore` | "Go near the store", collapsible order sheet, Navigate, call the store, full-screen pickup code |
| `orderReady` | "Order is ready" — Validate Order unlocks |
| `toCustomer` | "Customer is waiting !", slide to confirm the delivery |
| `completed` | "Great Work ! / Delivery Completed" |

The transitions are currently driven by timers over mock data
(`src/data/mock.ts`), so the whole journey is walkable without a backend. Swap
`src/features/session/session-context.tsx` for real API/socket calls and the UI needs no changes.

## Run it

```bash
npm install
npx expo start        # then open on Android with Expo Go — no API key needed
```

### Native builds (and iOS)

The app renders with `PROVIDER_GOOGLE` on both platforms, so a native build needs a Google Maps
SDK key. iOS cannot show Google Maps in Expo Go at all — use a dev build:

```bash
GOOGLE_MAPS_API_KEY=your_key npx expo run:android
GOOGLE_MAPS_API_KEY=your_key npx expo run:ios
```

The key is injected into the `react-native-maps` config plugin by `app.config.ts`. Without it the
map tiles render blank in a native build (Expo Go on Android is unaffected).

## Layout

```
src/app/                  routes: the map screen, the pickup-code modal, the side menu
src/features/session/     the state machine + the map-focus selector
src/data/mock.ts          Sousse coordinates, hotspots, order #2043, route polylines
src/components/map/       MapView, hotspot pills, ETA badge, route endpoints
src/components/overlays/  status pill, busy-area banner, carousel, Navigate
src/components/sheets/    offer card, active-order sheet
src/components/ui/        buttons, slide-to-confirm, Poppins text
src/constants/theme.ts    colours, spacing, radii, shadows
```
