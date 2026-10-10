# Hungry Rider (driver app) — Implementation spec

Companion to `DESIGN_SYSTEM.md`. That file defines tokens, type, icons and shared primitives; this one defines everything specific to the rider app. **Read DESIGN_SYSTEM.md §1–§7 first.** Where this file is silent, DESIGN_SYSTEM.md applies.

Visual reference: `Hungry Driver (offline).html`, also in `source/Hungry Driver.dc.html`. Every phone on the board has an ID (`D3`, `W2`…) that matches §6 here.

Stack assumptions: React Native + TypeScript, `lucide-react-native`, `react-native-maps` (or Mapbox), `@gorhom/bottom-sheet`, `react-native-reanimated` + `react-native-gesture-handler`. Reference frame 390×844 pt, light theme only.

---

## 0. Agent workflow
1. Copy `handoff/theme/` to `src/theme/`. This `icons.tsx` is a **superset** of the customer one (shared, customer and rider names). Use it in both apps.
2. Build the shared primitives from DESIGN_SYSTEM.md §6 that the rider app uses: PrimaryButton, SecondaryButton, TextLink, IconButton, TextField, PhoneField, Toggle, FilterChip, SegmentedControl (small and regular), Badge, Card, ListRow/ListGroup, Avatar, Skeleton, Spinner, Toast, ErrorBanner, StateView, SuccessScreen, AuthHeader/AuthSheet, EmailChip, TypeTile.
3. Build the rider components in §3 (`src/rider/components/`).
4. Implement the delivery state machine in §4 **before** the screens. Map screens are views of that one state.
5. Build the screens in §6 in the order of the flow: A1–A2 → D1 → D2 → D3 → D4/D5 → D6 → D7 → D8 → D9, then the menu (D10), W1–W2, H1, F1, S1–S2.
6. Apply the loading, error, empty and success patterns from §7 to every screen.
7. Check against §9 before calling it done.

---

## 1. What differs from the customer app
| Topic | Rider rule |
|---|---|
| Home | A full-screen map with a fixed top bar and one bottom sheet. No tab bar. Navigation is through the menu (drawer). |
| Top bar | Floating: menu IconButton (left) · **StatusPill** (centre) · help IconButton (right). All three white with the `floatingButton` shadow. |
| Primary actions | Same navy PrimaryButton. The only gesture-confirmed action is **Confirm delivery** (SlideToConfirm). |
| Orange | Still signal only: the status dot for "in progress", busy zones, step progress bars, the offer countdown bar, today's bar in charts. |
| Money | Earnings shown to the rider are always **what the rider earns** (8,5 DT). The order total (24,5 DT) appears only as **cash to collect**. Never show both without labels. |
| Language | English copy on the board. The original app is French; localise via i18n keys. Copy rules from DESIGN_SYSTEM.md §10 still apply (sentence case, no all-caps buttons). |
| Inner pages | White TopBar (back + title), the same as the customer app. **No** navy patterned headers. The pattern appears only on the sign-up header. |

---

## 2. Rider-specific tokens
Add these to `tokens.json` / `theme.tsx` (`rider` namespace). Everything else comes from the shared tokens.

| Token | Value | Use |
|---|---|---|
| `rider.zoneHot.fill` | `rgba(234,134,8,0.20)` | Busy zone fill |
| `rider.zoneHot.stroke` | `rgba(234,134,8,0.55)` | Busy zone border, 1.5 |
| `rider.zone.fill` | `rgba(234,134,8,0.10)` | Moderate/quiet zone fill |
| `rider.zone.stroke` | `rgba(234,134,8,0.30)` | Moderate/quiet zone border |
| `rider.riderHalo` | `rgba(0,48,73,0.12)` | 64 pt halo around rider position |
| `rider.drawerScrim` | `rgba(0,48,73,0.40)` | Behind the drawer |
| `rider.routeCasing` | `#FFFFFF`, width 10 | Under the route line |
| `rider.route` | `ink`, width 5, round caps/joins | Active leg |
| `rider.routeNext` | `ink` @ 60 %, width 4, dash `[1, 9]` round | Upcoming leg (offer only) |
| `rider.chartBar` | `#E3E6E8` (`outlineSubtle`) | Non-current chart bars |
| `rider.chartBarCurrent` | `primary` | Today's bar |
| `size.slideToConfirm` | 56 h, radius 16, handle 48 radius 12, inset 4 | |
| `size.statusPill` | 44 h, radius 22, padding 0×16, gap 8 | |
| `size.mapMarker` | 36 circle, 2.5 white border, 3×8 stem | |
| `size.riderDot` | 22 white + 14 ink inner, 64 halo | |
| `size.vehicleTile` | 88 h, radius 16, 36 well | |
| `size.drawerWidth` | 312, right radius 28 | |
| `size.offerAmount` | 40/44, 800, −1 tracking, tabular | Offer and balance amounts |
| `size.successAmount` | 32/38, 800, −0.8 tracking | Delivery complete, month total |
| `motion.offerTimeoutS` | 30 | Offer expiry |
| `motion.slideThreshold` | 0.85 | Fraction of the track to confirm |
| `rider.confirmRadiusM` | 100 | Distance that unlocks Confirm delivery |

---

## 3. Rider components (`src/rider/components/`)

### MapScreen
The layout shell for D1–D8. It holds full-bleed `MapView`, plus `MapTopBar` on top, `BottomSheet` at the bottom, and floating controls anchored to the sheet's top edge. Map padding: top 112, bottom = current sheet height, so the camera never hides the route under chrome. Use a light map style (no dark map). POI labels stay muted; hide POI icons where the map SDK allows.

### MapTopBar
Absolute, top = safe area + 6, left/right 16, row with `space-between`, gap 10.
- **MenuButton**: floating IconButton, `menu`, opens the Drawer. `accessibilityLabel="Menu"`.
- **StatusPill**: white pill with `floatingButton` shadow, `chip`-size 14/700, ellipsizes. Leading element by session state:

| State | Lead | Text |
|---|---|---|
| offline | 8 dot `inkSubtle` | `Offline` |
| searching | 14 Spinner (ink) | `Finding orders` |
| online idle (drawer) | 8 dot `success` | `Online` |
| to store | 8 dot `primary` | `Head to the store` |
| at store, ready | 8 dot `success` | `Order is ready` |
| to customer | 8 dot `primary` | `Deliver by {16:00}` |
| arrived | 8 dot `primary` | `Customer is waiting` |

- **HelpButton**: floating IconButton, `help`, opens Help (F1) or an in-trip support sheet.

### MapFloatingControls
Sit 16 above the sheet's top edge and move with it.
- **NavigatePill** (left): 44 h pill, `ink` bg, 18 `navigate` white + `Navigate` 14/700 white, padding 0 16 0 12, `floatingButton` shadow. Opens Google Maps / Waze with the current leg's destination.
- **LocateButton** (right): floating IconButton, `locate`.

### Map overlays
- **RiderDot** — the rider's position. 64 halo `rider.riderHalo`, 22 white circle with shadow, 14 `ink` inner dot. Rotate a small heading wedge if available (optional).
- **MapMarker** — 36 circle (`ink` bg, 2.5 white border, `floatingButton` shadow) with a 16 white icon: `store` for pickup, `customer` for drop-off. Below it, a 3×8 stem in the same colour. Optional label to the right: white, radius 10, padding 4×10, 12/16 700, shadow. **Keep markers out from under the top bar and sheet** using map padding and `fitToCoordinates` with edge padding (top 140, sides 40).
- **RoutePolyline** — two polylines: casing then line (tokens in §2). The offer screen also draws the next leg as `rider.routeNext`.
- **EtaChip** — `ink` pill, radius 10, padding 4×10, 13/18 700 white, tabular. Placed at the route midpoint, offset so it doesn't cover the line.
- **ZoneOverlay** (finding orders) — circle polygons using zone tokens plus a centred white label pill (12/16 700, shadow, 4×8). Busy zones get a 14 `busyZone` icon in `primary` before the label. Labels: `Busy`, `Moderate`, `Quiet`.

### BottomSheet (rider)
The DESIGN_SYSTEM.md BottomSheet: white, top radius 28, `sheet` shadow, padding 10×24, gap 14–16, 36×4 grabber. Snap points: **collapsed** (one summary row, D5) and **expanded** (content height). It never covers more than 70 % of the screen; scroll inside if needed. The home indicator area is part of the sheet.

### StepHeader
Top of every in-trip sheet.
- Row: `Step {1|2} of 2 · {Pickup|Drop-off}` (13/18 600 `inkMuted`) left; status on the right (13/18 700, tabular): `15 min left`, `At the store`, `4 min away`, `Arrived 15:55`.
- Below: 2 segments, 4 h, radius 2, gap 4. Done/current `primary`, upcoming `surfaceSunken`.

### ContactBlock
44 icon well (`surfaceSunken`, radius 14, 20 icon: `store` or `customer`), then name 18/24 700 (−0.2), address 13/18 `inkMuted` (wraps), optional detail 12/16 600 `inkMuted` (`DIAGBENZ · Floor 2`). On the right, a **CallButton**: 44 circle `ink`, 18 `phone` white, `accessibilityLabel="Call {name}"`. Use `Linking.openURL('tel:')` or a masked-number API.

### OrderSummary (collapsible)
Card (1 `divider`, radius 16, padding 12×14, gap 10). Header: `Order #2043` 15/20 700 + ` · 3 items` 500 `inkMuted`, with a chevron-up/down 18 on the right. Expanded: a divider, then lines `1×` bold + item name, 14/20, gap 6.
- **Checklist mode** (D6): each line gets a Checkbox (22), gap 10 between lines. Tapping a line toggles its box.

### CashToCollect
`primarySoft` row, radius 14, padding 12×14, gap 12: 20 `cash` icon, `Collect in cash` 14/20 600, amount 16/700 tabular on the right. Shown only when `order.paymentMethod === 'cash'`.

### SlideToConfirm
- Track: 56 h, radius 16.
- Handle: 48 square, radius 12, inset 4, with a 22 `slide` icon.
- Label: centred 16/700, offset 40 to the right of the handle.
- **Locked** (rider further than `confirmRadiusM` from the drop-off): `surfaceSunken` track, white handle with a 1.5 `outline` border, muted icon and label. Show a helper below: `Available within 100 m of the drop-off` (12/16 `inkMuted`, centred). Gestures are ignored.
- **Ready**: `ink` track, white label, white handle with an `ink` icon.
- **Gesture**: drag the handle (Reanimated). Past `slideThreshold` it snaps to the end, haptic success fires, `onConfirm()` runs, and the label becomes a spinner plus `Confirming…`. Below the threshold it springs back.
- **Error**: spring back and show an ErrorBanner above it.
- **Accessibility**: expose it as a button (`accessibilityRole="button"`, `accessibilityLabel="Confirm delivery"`, `accessibilityActions=[{name:'activate'}]`) so screen-reader users can activate it without the gesture.

### OfferCard (D3 sheet content)
- **Header:** Badge `New order` (`primarySoft`), plus a countdown on the right (16 `countdown` icon + `0:24`, 13/700, tabular).
- **Countdown bar:** 4 h, `surfaceSunken` track with a `primary` fill draining from 100 % to 0 over `offerTimeoutS`. It sits −6 below the header.
- **Earnings row:** `You earn` caption, then the amount in `size.offerAmount`. Right-aligned: `20 min · 3,5 km` 13/700, then `Cash order · 24,5 DT` (or `Paid online`) 13 `inkMuted`.
- **Stops card:** two rows separated by a divider. Each row has a 32 well (radius 10, 16 icon: `store` / `pin`), a caption (`Pickup · 1,2 km` / `Drop-off · 2,3 km`), the name 15/20 700, and the address 13/18 `inkMuted`.
- **Actions:** SecondaryButton `Decline` (fixed 120 width), then PrimaryButton `Accept` (flex 1), gap 12.
- **Expiry:** when the timer hits 0, auto-decline, close the sheet, return to searching, and show a Toast `Offer expired`.

### BusyAreaCard (D2)
Card radius 16, padding 12×14, gap 14:
- 44 well (`primarySoft`, `busyZone` `primary`).
- `Nearest busy area` caption, name 15/20 700, then `1,2 km · more orders here` 13 `inkMuted`.
- A 44 `ink` circle with a white `navigate` icon, which opens navigation to the zone.

### SessionSummaryRow (D2)
- Left: 8 dot `success` plus `Online · 1 h 12 min` 15/700.
- Right: `Today 3 trips · 25,5 DT` 13 `inkMuted`, tabular.

### VehicleRow (D1)
Card radius 16, padding 12×14: 36 well with the vehicle icon, caption `Delivering with`, `Scooter · 123 TUN 4567` 15/600, and a `Change` TextLink.

### Drawer (D10)
- **Panel:** left 312, white, right radius 28. `rider.drawerScrim` covers the rest, and tapping it closes the drawer.
- **Header (margin 12×20):** Avatar 56 (`primarySoft`, initials 18/700), name 18/24 700, status line (8 dot + `Online · Scooter` 13 `inkMuted`).
- **Today card:** `surfaceMuted`, radius 16, padding 12×14. Two columns: `Today` with the amount, and `Trips` with the count (16/700).
- **Rows:** 56 h, padding 0×12, a 36 well, the label 15/600, and a chevron. The items are **Earnings · Delivery history · Shifts · Help · Settings**.
- **Footer:** `Log out` row pinned to the bottom (`dangerSoft` well, red icon and label).

### StatGrid (W1)
Card radius 16, 3 equal columns with 1 `divider` lines between them. Each cell has padding 12, the value 18/24 700 tabular (no wrap), and the label 12 `inkMuted`.

### WeeklyBarChart (W1, W2)
- **Layout:** 7 bars (Mon–Sun), height 120, gap 8. Bars are radius 8, `rider.chartBar` colour, height relative to the week's maximum.
- **Today:** the bar uses `rider.chartBarCurrent` and has its amount above it (11/700 tabular).
- **Day labels:** 12, 500 `inkMuted`; today 700 `ink`.
- **Accessibility:** each bar is accessible with `{day}: {amount}`.

### BalanceCard (W1)
Card radius 20, padding 20, gap 14:
- Caption `Available to withdraw`.
- Amount in `size.offerAmount`, **`ink`**. Do not use orange; prices are ink (DESIGN_SYSTEM.md §2.3).
- PrimaryButton `Withdraw now` with a `withdraw` icon.
- Fee line: `Instant · 1 DT fee · arrives in a few minutes` (12/16 `inkMuted`, centred).

### PayoutMethodCard (W2)
Card radius 16: 36 `ink` well with a white `payoutCard` icon, `•••• 4821` 15/700 with +1 tracking, and `Bank card · Primary` 12 `inkMuted`. A `Manage` link sits in the section header.

### TransactionRow (W2)
- **Layout:** padding 12×0, a 36 well, the title 15/20 600 (ellipsis), and a sub line 12 `inkMuted` (`Today, 15:55`).
- **Amount:** 15/700 tabular on the right. Credits are `success` with `+` (`+8,5 DT`); debits are `ink` with `−` (U+2212).
- **Icons:** order → `delivery`, bonus → `bonus` on a `primarySoft` well, withdrawal → `withdraw`.

### MonthSummaryCard (H1)
Card radius 20, padding 16:
- `Earned in October` caption.
- Amount in `size.successAmount`.
- `48 trips` 13 `inkMuted`.
- On the right, a trend pill: 30 h, `successSoft`, `success` 13/600, 14 `trendUp` icon, `+12% vs Sept`. For a negative trend use `dangerSoft`/`danger` and a down arrow.

### HistoryRow (H1)
Grouped under overlines (`Today · 24 Oct`, `Yesterday · 23 Oct`, then dates). Each row has a 36 well with a category icon (`categoryRestaurant | Pharmacy | Grocery | Cafe`), the store name 15/20 700 (ellipsis), `14:20 · Completed` 12 `inkMuted`, and the earnings 15/700 tabular. Tapping a row opens the delivery detail (not designed yet; reuse D9's card layout).

### FaqAccordion (F1)
Card radius 20:
- **Header:** padding 14×16, a 40 well (radius 12; `primarySoft` for Getting started, `surfaceSunken` otherwise), the title 16/700, and a chevron.
- **Expanded:** question rows 14/20 600 with a chevron and dividers between them.
- **Topic chips above:** FilterChip with a 16 leading icon: `Quick guide` (quickGuide), `Rules` (rules), `Payments` (earnings).
- **Footer:** a BottomBar SecondaryButton `Contact support` with a `phone` icon.

### VehicleTile (A2)
- **Layout:** three across, gap 10. Each tile is 88 h, radius 16, 2 border; a 36 well over the label 14/600, gap 8, centred.
- **States:** rest is `surfaceMuted` with a transparent border and a white well with an ink icon. Selected is a white tile with an `ink` border and an `ink` well with a white icon.
- **Options:** Motorcycle (`vehicleMotorcycle`), Scooter (`vehicleScooter`), Car (`vehicleCar`).

---

## 4. Delivery state machine
One store (Zustand / Redux / XState). Every map screen renders from `session.state`; the sheet content, StatusPill, overlays and actions are derived from it. Never navigate between map "screens"; change the state.

```ts
type SessionState =
  | { kind: 'offline' }                                   // D1
  | { kind: 'searching'; since: Date }                    // D2
  | { kind: 'offer'; offer: Offer; expiresAt: Date }      // D3
  | { kind: 'toStore'; job: Job }                         // D4 / D5 (sheet snap)
  | { kind: 'atStore'; job: Job; ready: boolean; checked: string[] } // D6
  | { kind: 'toCustomer'; job: Job }                      // D7
  | { kind: 'arrived'; job: Job }                         // D8
  | { kind: 'completed'; job: Job; summary: TripSummary } // D9 (full screen)

type Offer = { id: string; earnings: Money; totalKm: number; totalMin: number;
  payment: 'cash' | 'online'; orderTotal: Money; pickup: Stop; dropoff: Stop };
type Stop = { name: string; address: string; detail?: string; coord: LatLng; phone: string; distanceKm: number };
type Job = Offer & { orderNumber: string; items: { qty: number; name: string }[]; deliverBy: Date };
type TripSummary = { earnings: Money; cashCollected?: Money; km: number; minutes: number;
  arrivedAt: Date; deltaMin: number; today: { trips: number; earnings: Money } };
type Money = { amount: number; currency: 'TND' }; // format: 8,5 DT
```

| From | Event | To | Side effects |
|---|---|---|---|
| offline | `goOnline()` | searching | Start location tracking; show the zones |
| searching | `goOffline()` | offline | Stop tracking |
| searching | push `offer` | offer | Haptic + sound; start the countdown |
| offer | `accept()` | toStore | Fit the camera to rider + store |
| offer | `decline()` / timeout | searching | Toast `Offer expired` on timeout |
| toStore | geofence ≤ 100 m or `arrivedAtStore()` | atStore | Button `I’ve arrived at the store` is a fallback |
| atStore | push `orderReady` | atStore(ready=true) | Success line in the sheet |
| atStore | toggle item | atStore(checked) | |
| atStore | `confirmPickup()` (all checked, ready) | toCustomer | Fit camera to rider + customer |
| toCustomer | geofence ≤ `confirmRadiusM` | arrived | Unlock the slider; notify the customer |
| arrived | `confirmDelivery()` | completed | Haptic success |
| completed | `findNext()` | searching | |
| completed | `goOffline()` | offline | |

Persist `session` so a cold start resumes mid-trip. Location updates: 5 s / 10 m while in a trip, 15 s while searching.

---

## 5. Navigation
- **Root stack:** `Auth` (A1 → A2) | `Main`.
- **Main stack:**
  - `Map` (D1–D8) is the root and is wrapped by the `Drawer`.
  - `TripComplete` (D9) is a modal screen.
  - `Earnings` (W1, scroll → W2), `History` (H1), `Shifts` (not designed), `Help` (F1), `Settings` (S1 → scroll → S2).
- Menu items push onto the stack from the drawer and close it.
- Android back on Map: closes the drawer, then collapses the sheet; it never leaves an active trip.

---

## 6. Screen inventory
IDs match the board. "Sheet" means the BottomSheet content, top to bottom.

| ID | State / route | Contents |
|---|---|---|
| **D1** | offline | Map, RiderDot, TopBar (`Offline`), LocateButton. Sheet: `You’re offline` (heading 20/26) + `Go online to start receiving orders near you.`; VehicleRow; PrimaryButton `Go online` with a `power` icon |
| **D2** | searching | Zones (2 busy, 1 moderate, 1 quiet), RiderDot, TopBar (spinner + `Finding orders`), LocateButton. Sheet: SessionSummaryRow; BusyAreaCard; SecondaryButton `Go offline` with a `power` icon |
| **D3** | offer | Map with `scrim`, RoutePolyline (to store) + next leg (dashed), RiderDot, store + customer markers. Sheet: OfferCard. No TopBar (the offer takes focus) |
| **D4** | toStore (expanded) | Route, RiderDot, store marker labelled `After Eight`, EtaChip `3 min`, TopBar (`Head to the store`), NavigatePill + LocateButton. Sheet: StepHeader(1, `15 min left`); ContactBlock(store); OrderSummary expanded; PrimaryButton `I’ve arrived at the store` |
| **D5** | toStore (collapsed) | As D4; sheet collapsed to one row: `Pickup · 15 min left` (13/600 muted) over the store name 16/700, plus chevron-up |
| **D6** | atStore ready | Rider at the store. Sheet: StepHeader(1, `At the store`); success line (`successSoft`, `The kitchen marked the order as ready`); ContactBlock; `Check the bag before you leave` + OrderSummary in checklist mode; PrimaryButton `Confirm pickup · 2 of 3 checked` disabled until all are checked, then `Confirm pickup` |
| **D7** | toCustomer | Route, RiderDot, customer marker labelled `DIAGBENZ`, EtaChip `4 min`, TopBar (`Deliver by 16:00`), NavigatePill. Sheet: StepHeader(2, `4 min away`); ContactBlock(customer, with detail); CashToCollect; OrderSummary collapsed; SlideToConfirm locked + helper |
| **D8** | arrived | Rider at the drop-off, TopBar (`Customer is waiting`). Sheet: StepHeader(2, `Arrived 15:55`); ContactBlock; CashToCollect; OrderSummary expanded; SlideToConfirm ready |
| **D9** | completed | SuccessScreen: `successSoft` well + `success` icon, `Delivered, great work`, `Arrived 15:55 · 5 min early`. Card: `You earned` + 8,5 DT + `Order #2043 · After Eight → DIAGBENZ`; rows Cash collected · Distance · Today. Actions: PrimaryButton `Find next order` + TextLink `Go offline` |
| **D10** | Drawer | See Drawer in §3 |
| **W1** | Earnings | TopBar `Earnings` + `History` link; BalanceCard; `This week` + weekly total; StatGrid (Trips, Online, Avg / trip); WeeklyBarChart |
| **W2** | Earnings scrolled | Divider under the TopBar; chart; `Payout method` + `Manage` + PayoutMethodCard; `Recent activity` + `See all` + 3 TransactionRows |
| **H1** | History | TopBar; SegmentedControl `This week / October`; MonthSummaryCard; grouped HistoryRows |
| **F1** | Help | TopBar; `How can we help?` (title 24/30); SearchField `Search for an answer`; topic chips; FaqAccordion (Getting started open, Technical support closed); BottomBar `Contact support` |
| **S1** | Settings | Overline `Account`: list rows (caption above value) Full name · Email · Phone number · Password. `Preferences`: Language (small segment English/Français) · Dark mode (Toggle, off; dark theme not built yet) |
| **S2** | Settings bottom | `Vehicle` row · `Legal`: Terms of use, Privacy policy (`externalLink`) · `Session`: Log out (danger) · `Hungry Rider v1.0.0` |
| **A1** | Sign up 1/2 | AuthHeader compact (180) + AuthSheet: `Become a rider` + subtitle; EmailChip; First/Last name (2 columns); PhoneField; Password + Confirm (eye); BottomBar `Continue` |
| **A2** | Sign up 2/2 | AuthHeader compact; `Step 2 of 2` + `How do you deliver?`; VehicleTiles; Licence plate (focused example); Driving licence number + helper `Optional for scooters under 50 cc.`; terms; BottomBar `Create account` |

Sign in, forgot password and verification reuse the customer screens A1–A5 (DESIGN_SYSTEM.md §9, section 3a). Only the copy changes (`driver` wording).

---

## 7. States (apply the patterns in DESIGN_SYSTEM.md §7)
| Screen | Loading | Error | Empty | Success |
|---|---|---|---|---|
| D1 Go online | Button spinner `Going online…` | Location permission denied → StateView in the sheet (`pinOff`, `Allow location to go online`, `Open settings`); no network → ErrorBanner + `Try again` | — | StatusPill switches to searching |
| D2 Searching | Zones as skeleton circles (`skeleton`) | Zones failed → hide zones, keep searching, small banner `Busy areas unavailable` | No busy area near → BusyAreaCard replaced by `No busy areas right now` row | — |
| D3 Offer | — | Accept failed / taken by another rider → Toast `This order was taken` → searching | — | Haptic, camera animates to the pickup |
| D4–D6 Pickup | Order details skeleton in OrderSummary | Store unreachable → ErrorBanner with `Call support`; arrived outside the geofence → helper under the button | — | `Order is ready` push → success line + StatusPill |
| D7–D8 Drop-off | Slider `Confirming…` | Confirm failed → spring back + ErrorBanner `Couldn’t confirm. Check your connection.`; customer unreachable → `Call support` row | — | D9 |
| W1/W2 | Skeleton balance, stats, bars | ErrorBanner + `Try again`; withdraw failed → banner on the card | No trips this week → chart with all bars at minimum height + `No trips yet this week` | Toast `42 DT on its way to •••• 4821` |
| H1 | Skeleton rows | ErrorBanner + `Try again` | StateView `No deliveries yet` (`history` icon) | — |
| S1/S2 | — | Field errors as in customer P3 | — | Toast `Changes saved` |
| A1/A2 | Button spinner | Field errors (plate format `123 TUN 4567`, phone 8 digits) | — | Goes to D1 |

---

## 8. Copy keys (English on the board → French source)
`Offline` (Hors ligne) · `Go online` (Passer en ligne) · `Finding orders` (Recherche de commandes) · `Go offline` (Arrêter la session) · `New order` (Commande trouvée) · `Accept` (Accepter) · `Decline` (Refuser) · `Head to the store` (Allez vers le magasin) · `I’ve arrived at the store` (Je suis arrivé) · `Order is ready` (Commande prête) · `Confirm pickup` (Valider la commande) · `Deliver by 16:00` (Arrivée prévue : 16h00) · `Customer is waiting` (Le client attend) · `Slide to confirm delivery` (Glisser pour confirmer la livraison) · `Delivered, great work` (Livraison terminée, bravo) · `Earnings` (Revenus) · `Delivery history` (Historique des livraisons) · `Shifts` (Créneaux) · `Help` (Assistance) · `Settings` (Paramètres) · `Log out` (Se déconnecter) · `Withdraw now` (Retirer maintenant) · `Become a rider` (Inscription à Hungry) · `How do you deliver?` (Comment livrez-vous ?).

Formatting: money `8,5 DT` (comma decimal, trailing zeros dropped, `tabular-nums`); times `16:00` (not `16h00`); durations `6 h 20`, `1 h 12 min`; dates `24 Oct` / `24 oct.` by locale; negative amounts use U+2212.

---

## 9. Done checklist
- [ ] All values come from `useTheme()`; the rider tokens from §2 are added to the theme.
- [ ] Icons only through `<Icon name>` with the names in `icons.tsx`.
- [ ] One session state machine drives D1–D8; the sheet, pill, overlays and actions derive from it.
- [ ] Markers and route stay clear of the top bar and sheet (map padding + `fitToCoordinates`).
- [ ] Offer shows the rider's earnings; the order total appears only as cash to collect.
- [ ] Confirm pickup is disabled until every item is checked and the order is ready.
- [ ] SlideToConfirm is locked outside `confirmRadiusM`, has haptics, and has an accessible action.
- [ ] Orange is never a button fill or body text; amounts are ink (credits `success`).
- [ ] Every screen has its states from §7.
- [ ] The session resumes after an app restart mid-trip.
- [ ] Touch targets ≥ 44; StatusPill and texts support Dynamic Type up to 1.3×.
