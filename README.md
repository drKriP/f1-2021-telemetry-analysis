# F1 2021 High-Fidelity Telemetry Suite

A professional-grade real-time telemetry analyzer and dashboard for F1 2021. This suite features a robust Node.js backend for UDP processing and a high-performance React frontend with an interactive vector-based radar system.

## Performance HUD Showcase
- **Interactive Track Radar**: Vector-native zooming, panning, and rotation with persistent circuit caching.
- **Steering Wheel HUD**: Real-time RPM LEDs, gear telemetry, and integrated pedal trackers.
- **Session Intelligence**: Automated track mapping, sector bests, and live leaderboard tracking with cross-session persistence.

---

## Project Structure

### [Backend (Node.js)](./f1-telemetry-backend)
The core engine that listens for F1 2021 UDP packets (Port 20777). It performs:
- **Normalization**: Translates raw byte streams into clean JSON telemetry.
- **Map Tracing**: Algorithmic track discovery using car movement vectors.
- **WebSocket Broadcasting**: Streams processed data to the frontend at 10Hz.

### [Frontend (React + Vite)](./f1-telemetry-frontend)
The visual interface built for speed and clarity:
- **SVG Graphics**: Infinite-resolution track mapping.
- **Neon UI**: Sleek, high-contrast dashboard inspired by professional racing cockpits.
- **Standby Logic**: Automatic session detection to preserve data after the race ends.

---

## Getting Started

### 1. Requirements
- Node.js (v16+)
- F1 2021 (Telemetry enabled in game settings to `127.0.0.1:20777`)

### 2. Installation
Clone the repository and install dependencies in both folders:

```bash
# Setup Backend
cd f1-telemetry-backend
npm install

# Setup Frontend
cd ../f1-telemetry-frontend
npm install
```

### 3. Running
Start both services in separate terminals:

```bash
# Terminal 1: Backend
cd f1-telemetry-backend
npm run dev

# Terminal 2: Frontend
cd f1-telemetry-frontend
npm run dev
```

---

## Phase 1 Technical Achievements
For a deep dive into the mathematical models, data structures, and architectural decisions, see the [Phase 1 Technical Documentation](./PHASE_1_TECHNICAL_DOCUMENTATION.md).
