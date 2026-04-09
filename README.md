# F1 2021 High-Fidelity Telemetry Suite (v1.2 - Phase 2)

A professional-grade real-time telemetry analyzer and dashboard for F1 2021. Version 1.2 introduces high-fidelity analytics, persistent database storage, and a modular network architecture designed for zero-latency multi-device support.

## Performance HUD Showcase
- **Interactive Track Radar**: Vector-native zooming, panning, and rotation with persistent circuit caching.
- **Steering Wheel HUD**: Real-time RPM LEDs, gear telemetry, and integrated pedal trackers.
- **Session Intelligence**: Automated track mapping, sector bests, and live leaderboard tracking.
- **Modular Data Sync (NEW)**: Tiered data streaming (Lite 10Hz dashboard vs. On-Demand history) to prevent mobile connection drops.

## Phase 2 Core Features (v1.2)
- **Multi-User Profile System**: Dedicated profile switching for up to 4 users (Guest + 3 Custom Profiles) to track PBs independently.
- **SQLite Database Persistence**: All best laps and telemetry traces are permanently stored in `telemetry.db` using `better-sqlite3`.
- **Comparative Analysis**: Split-screen P1/P2 telemetry tracking with dual-colored traces (Cyan/Orange) for competitive lap matching.
- **Safety Controls**: Integrated "Clear PB" safety logic with confirmation warnings for permanent record management.

---

## Project Structure

### [Backend (Node.js)](./f1-telemetry-backend)
The core engine that listens for F1 2021 UDP packets (Port 20777).
- **SQLite Manager**: Handles schema migrations and optimized lap lookups.
- **Performance Analyzers**: Stateless and stateful lap comparison engines.
- **Vite Proxy Support**: Configured for seamless local network connectivity.

### [Frontend (React + Vite)](./f1-telemetry-frontend)
The visual interface built for speed and clarity:
- **SVG Graphics**: Infinite-resolution track mapping and high-fidelity charts.
- **Neon UI**: Sleek, high-contrast dashboard with responsive grid layouts.
- **Modular Sync Client**: Intelligent merging of real-time status and heavy lap history.

---

## Getting Started

### 1. Requirements
- Node.js (v16+)
- F1 2021 (Telemetry enabled in game settings to `[Your-PC-IP]:20777`)

### 2. Installation
Install dependencies in both folders:

```bash
# Setup Backend
cd f1-telemetry-backend
npm install

# Setup Frontend
cd ../f1-telemetry-frontend
npm install
```

### 3. Running
Start both services:

```bash
# Terminal 1: Backend
npm run dev -- --host

# Terminal 2: Frontend
npm run dev -- --host
```

---

## Technical Documentation
- [Phase 1: Foundations & UDP Logic](./PHASE_1_TECHNICAL_DOCUMENTATION.md)
- [Phase 2: Persistence & Modular Sync Architecture (v1.2)](./PHASE_2_TECHNICAL_DOCUMENTATION.md)
