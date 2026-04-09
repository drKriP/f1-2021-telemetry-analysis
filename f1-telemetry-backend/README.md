# F1 2021 Telemetry Node Server

This is the robust backend UDP data processor capable of ingesting raw telemetry data directly from F1 2021 natively over port 20777, normalizing it, generating track topologies dynamically, and streaming it via websockets.

## Starting the Tracker
```bash
npm install
npm run dev
```

## Track Map Topography & Radar
The backend operates an automated **Map Discovery Engine**. 
Because F1 does not strictly provide explicit tracking topologies via UDP, the system traces your physical path to build JSON geometries algorithmically.

1.  **Coordinate Interception**: By monitoring your `m_carMotionData`, the server drops absolute coordinates onto a tracker array.
2.  **Boundary Freeze (Lap Limit)**: The exact millisecond your `m_currentLapNum` ticks +2 times (enabling outlaps to cleanly cover start/finish lines natively), the mapping completely caches locally to `/trackMaps/track_X.json`.
3.  **Sector Tracking**: Internal detectors actively observe `m_sector` crossings. If it senses a transit, it captures and embeds the exact global track coordinate as the Finish Line, Sector 1, or Sector 2 indicator natively inside the database.
4.  **Auto-Loader**: When you start a race, the backend dynamically queries your local database to see if `track_X.json` was previously discovered. If found, it skips all topography mapping completely and restores your physical radar seamlessly.

## Environment Setup (`.env`)
The server uses environment variables for flexible port mapping:
```env
PORT=3000
UDP_PORT=20777
```

## Configuration Engine (`config.json`)
Manage live tracking priorities without restarting the server:
```json
{
  "traceTarget": "VERSTAPPEN",
  "enableLapLimit": true,
  "lapLimit": 2
}
```
*   `traceTarget`: Follow a specific AI driver (e.g., "VERSTAPPEN") or "Player" to generate the map.
*   `enableLapLimit`: Automatically save the map after a set number of laps.

## Session Watchdog
The backend includes a **2-second heartbeat detection**. If the game stops sending data, the server broadcasts an `isLive: false` signal, triggering the frontend's Standby mode while preserving historical session data.
