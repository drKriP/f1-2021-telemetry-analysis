# F1 2021 React Telemetry Dashboard (v1.2)

High-fidelity React HUD Dashboard designed to analyze and compare real-time UDP telemetry from F1 2021.

## Quickstart
```bash
npm install
npm run dev -- --host
```

## Phase 2 Core Features

### 1. Advanced Performance Analysis
A dedicated tab for professional lap comparison:
- **Dual Traces**: Compare P1 and P2 telemetry (Speed, Throttle, Brake) relative to the lap distance.
- **Delta Tracking**: Real-time numerical delta (e.g., +0.123s) calculated against the personal best.
- **Interactive Charts**: Responsive SVG-based telemetry graphs with infinite scaling.

### 2. Multi-User Profile Management
- **Profile Selector**: Switch between up to 4 users (Guest + 3 Named) to load specific lap records.
- **PB Management**: Destructive "Clear PB" controls with safety confirmation dialogues.

### 3. Modular Sync Engine
To ensure stability on mobile devices and slow connections:
- **Lite State**: The main dashboard receives high-speed status updates (10Hz).
- **On-Demand History**: Heavy analysis data is only synchronized when you specifically open the Analysis tab.

## Features

### Advanced Dashboard Telemetry UI
-   **F1 Steering Assembly**: A purely CSS steering console with dynamic glowing RPM LED arrays.
-   **Stable Layout System**: Uses `tabular-nums` and rigid grid containers to provide a jitter-free viewing experience.
-   **Integrated Pedals**: Throttle and brake application graphs integrated into the dash.

### Interactive Live Radar Map System
Powered by the backend geometry engine to provide a real-time topology layout.
-   **Vector Scaling**: Text labels and car dots scale inversely to zoom levels, ensuring crisp legibility up to 30x magnification.
-   **Pan & Rotate**: Full mouse/touch support for panning (Left Click) and rotating (Right Click) the track view.

## Connectivity & Mobile Support
The dashboard is optimized for secondary screens (Phones/Tablets).
- **Vite Proxy**: Port 5173 acts as a bridge to the backend on Port 3000, simplifying firewall configuration.
- **Auto-Host**: Using the `--host` flag allows devices on your local network to access the dashboard via your computer's IP address.

## Dashboard Intelligence
- **Session Indicators**: Top-right status bar showing `Offline`, `Standby`, and `Live`.
- **Graceful Standby**: Preserves historical data and classifications even after the race session terminates.
