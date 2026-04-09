# Phase 2 Technical Documentation: Persistence & Modular Sync (v1.2)

This document details the architectural evolution of the F1 Telemetry Suite in Version 1.2, focusing on persistent data management and network optimization for multi-device environments.

---

## 1. Data Persistence: SQLite Engine
In v1.2, the system migrated from ephemeral JSON storage and in-memory arrays to a robust **SQLite 3** backend using the `better-sqlite3` driver.

### 1.1 Database Schema
The database (`telemetry.db`) consists of two primary tables:

#### `users`
Tracks the global profile list.
| Column | Type | Description |
| :--- | :--- | :--- |
| `name` | TEXT (PK) | Unique identifier for the driver profile. |
| `created_at` | DATETIME | Timestamp of profile creation. |

#### `best_laps`
Stores high-fidelity telemetry traces for personal bests.
| Column | Type | Description |
| :--- | :--- | :--- |
| `profile_name` | TEXT (FK) | Reference to the `users` table. |
| `track_id` | INTEGER | F1 2021 Track Identifier. |
| `lap_time` | REAL | Total lap time in seconds. |
| `samples_json` | TEXT (JSON) | Compressed array of telemetry sample points (Speed, Throttle, etc). |
| `PRIMARY KEY` | - | (profile_name, track_id) |

### 1.2 Automated Migrations
The `DatabaseManager` handles self-healing schema updates. On startup, it verifies column existence (e.g., `profile_name`) and performs `ALTER TABLE` operations to ensure backward compatibility with Phase 1 data.

---

## 2. Network Architecture: Modular Sync Engine
The most significant architectural shift in Phase 2 is the transition from unified broadcasting to a **Modular Sync** system.

### 2.1 The "Choking" Problem
In Phase 1, sending the entire lap history (thousands of points) every 100ms caused network saturation, especially on mobile devices, leading to `ECONNRESET` errors.

### 2.2 Tiered Data Delivery
Version 1.2 implements a tiered delivery model via Socket.io:

1.  **Lite Real-time Stream (10Hz)**:
    - **Payload**: Gears, Speed, RPM, Live Delta, Session Time.
    - **Purpose**: Provides zero-latency feedback for the dashboard HUD.
2.  **Heavy Sync Stream (On-Demand)**:
    - **Payload**: Full Personal Best `pbSamples` and current lap `currentSamples`.
    - **Trigger**: Only fires when the user switches to the **ANALYSIS** tab or when a lap is completed.
    - **Efficiency**: Reduces background data usage by >90% during active driving.

---

## 3. Multi-Device Connectivity Strategy
To allow reliable access from phones/tablets on the local WiFi:

### 3.1 Vite Proxy "Bridge"
The frontend (Port 5173) acts as a reverse proxy for the backend (Port 3000). By connecting to the frontend port on a mobile device, Socket.io traffic is automatically routed to the backend via `127.0.0.1`, bypassing complex Windows Firewall rules.

### 3.2 Dynamic Relative URLs
The `SOCKET_URL` in the frontend is set to a relative string `""`. This forces the client to connect back to the host IP used to load the dashboard, ensuring seamless "it just works" connectivity for any device on the network.

---

## 4. Analysis Logic: Delta & Comparison
Comparative analytics use a **Closest-Distance Discovery** algorithm:
1.  As the player drives, the `PerformanceAnalyzer` finds the closest sample in the recorded PB based on `m_lapDistance`.
2.  **Delta Calculation**: `(Current Lap Time) - (PB Sample Time)`.
3.  **Trace Rendering**: SVG paths are generated using normalized coordinates mapped to the track's maximum distance, ensuring charts always fill the screen regardless of track length.

---

## 5. Security & Safety
- **Delete Confirmation**:Destructive actions (Clear PB) are protected by a state-driven confirmation loop in the UI.
- **Guest Logic**: The `Guest` profile is treated as volatile; its telemetry is processed in-memory but excluded from SQLite commits to prevent database bloat.
