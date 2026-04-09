# F1 2021 React Telemetry Dashboard

High-fidelity React HUD Dashboard designed to seamlessly analyze the incoming stream of UDP data provided securely by the local F1 2021 Node Server via Socket.io.

## Quickstart
```bash
npm install
npm run dev
```

## Features

### Advanced Dashboard Telemetry UI
-   **F1 Steering Assembly**: A purely CSS-implemented steering console displaying live gear telemetry centrally with dynamic glowing RPM LED arrays explicitly styled based on true revolution parameters.
-   **Stable Layout System**: Font metrics employ strictly designated `tabular-nums` and layout wrappers utilize rigid flex bindings to prevent UI jittering wildly at peak top speeds or chaotic telemetry updates.
-   **Integrated Pedals**: Throttle and break application graphs integrated physically flush against the steering chassis walls.

### Dynamic Telemetry Sorting
-   **Live Leaderboard**: Continuously scrapes standard classification positions to output driver names dynamically down a leaderboard ranked entirely chronologically.
-   **Session History Best Tracks**: Evaluates sector outputs to print dynamic Fastest Laps per standard race session.

### Interactive Live Radar Map System (`TrackMap.jsx`)
Powered tightly by the server's backend geometry caching, placing you on an algorithmic real-time topology layout natively.

-   **High Vector Resolving Strategy**: Operates firmly on infinite resolution `<svg><g transform>` elements rather than CSS matrix transformations. This implies that text fields, tracking icons, and track line widths inversely scale down relative to coordinate zooming. As you scale inward by *30x limits*, vector text labels remain perfectly crisp rendering at nominal reading scales.
-   **Interactive Drag Limits**:
    *   **Drag Panning**: Left Click anywhere universally inside the SVG array bounds to strictly pan mapping coordinate nodes relative exclusively around tracking view boundaries.
    *   **Rotating Coordinates**: Right Click anywhere on the map to spin your topographical trajectory grid exactly over the absolute center of your internal camera scope logically.
-   **Sector Identifiers**: Perfectly renders perpendicular checkpoint lines (S1, S2, FL) using tangent-based rotation math.

## Environment Setup (`.env`)
```env
VITE_PORT=5173
VITE_WS_URL=http://localhost:3000
```

## Dashboard Intelligence
- **Session Indicators**: Top-right status bar showing `Offline` (No Server), `Standby` (No Game Data), and `Live` (Active Racing).
- **Graceful Standby**: When a session ends, the dashboard enters a "Garage Standby" mode. Non-essential live views (HUD, Map) collapse to placeholders, while the **Leaderboard** and **Sector Bests** remain frozen on screen for performance review.
