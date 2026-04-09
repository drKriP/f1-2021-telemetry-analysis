# F1 2021 Telemetry Node Server (v1.2)

This is the robust backend UDP data processor capable of ingesting raw telemetry data directly from F1 2021 natively over port 20777, normalizing it, generating track topologies dynamically, and streaming it via websockets.

## Starting the Tracker
```bash
npm install
npm run dev -- --host
```

## Phase 2 Core Architectures

### 1. SQLite Persistence & Analytics
The backend has migrated from ephemeral memory to a persistent **SQLite 3** engine (`telemetry.db`). 
- **Auto-Migrations**: The system automatically updates database schemas on startup.
- **PB Storage**: Personal bests, including high-frequency speed/throttle/brake traces, are permanently saved per user and track.

### 2. Multi-User Profile System
Supports up to **4 distinct profiles** (Guest + 3 Custom Users).
- **Independent Tracking**: PBs are isolated by profile name.
- **Manual Switching**: Controlled via the frontend to ensure consistent data attribution.

### 3. Modular Data Sync (Concurrency Optimization)
To prevent network "choking" on mobile devices, the server employs a **Tiered Broadcast System**:
- **Lite Stream (10Hz)**: Real-time HUD data (Gears, RPM, Speed, Delta).
- **Heavy Stream (On-Demand)**: Thousands of lap sample points are only synchronized when exactly requested (e.g., when opening the Analysis tab) or when a lap finishes.

## Track Map Topography & Radar
The backend operates an automated **Map Discovery Engine**. 
1.  **Coordinate Interception**: Drops absolute coordinates using `m_carMotionData`.
2.  **Boundary Freeze (Lap Limit)**: Caches the final map to `/trackMaps/track_X.json` after the designated out-lap limit.
3.  **Auto-Loader**: Dynamically restores previously discovered track geometries on session start.

## Configuration Engine (`config.json`)
Manage live tracking priorities without restarting the server:
```json
{
  "traceTarget": "Player",
  "enableLapLimit": true,
  "lapLimit": 2
}
```

## Session Watchdog
The backend includes a **2-second heartbeat detection**. If the game stops sending data, the server broadcasts an `isLive: false` signal, triggering the frontend's Standby mode while preserving historical session data.
