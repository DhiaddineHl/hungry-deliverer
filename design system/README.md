# Hungry Rider — design export (driver app + design system)

## Start here (Claude Code)
1. Read `handoff/DESIGN_SYSTEM.md`: tokens, typography, icons, shared primitives, state patterns.
2. Read `handoff/DRIVER_APP.md`: rider components, delivery state machine, screen inventory (D1–D10, W1–W2, H1, F1, S1–S2, A1–A2), states and copy.
3. Copy `handoff/theme/` to `src/theme/` (React Native). `icons.tsx` covers both the customer and rider apps (`lucide-react-native`).
4. Use `handoff/tokens.json` as the source of truth for any value.
5. Compare against the visual references by screen ID.

## Visual references (open in a browser, work offline)
- `Hungry Driver (offline).html`: every rider-app screen with design notes per flow.
- `Design System Guide (offline).html`: colours, type scale, spacing, radius, elevation, icons, primitives, state patterns.

## Folder map
- `handoff/DESIGN_SYSTEM.md`: shared design-system spec.
- `handoff/DRIVER_APP.md`: rider-app spec.
- `handoff/tokens.json`: machine-readable tokens.
- `handoff/theme/`: `colors.ts`, `typography.ts`, `theme.tsx`, `icons.tsx`, `index.ts`.
- `handoff/assets/icons/`: reference SVGs for every icon/colour pair used (code uses Lucide).
- `handoff/assets/brand/`: Hungry logo, food pattern, Google mark.
- `source/`: editable design files (`.dc.html`) and their assets. Serve the folder locally to open them (`npx serve source`).

Notes
- The map image, routes and markers on the board are illustrations. Use a live map SDK (see DRIVER_APP.md §3).
- Copy on the board is English; French equivalents are in DRIVER_APP.md §8.
