const { F1TelemetryClient } = require("f1-2021-udp");
const { updateState } = require("./broadcaster");
const fs = require('fs');
const path = require('path');

const mapDir = path.join(__dirname, 'trackMaps');
if (!fs.existsSync(mapDir)) {
    fs.mkdirSync(mapDir);
}

// Config Loader
const configPath = path.join(__dirname, 'config.json');
let config = { traceTarget: "Player", enableLapLimit: true, lapLimit: 2 };

function reloadConfig() {
    if (fs.existsSync(configPath)) {
        try {
            const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            config = { ...config, ...raw };
            console.log("[MAP RADAR] Config loaded/updated:", config);
        } catch(e) {
            console.error("Error parsing config.json", e);
        }
    }
}
reloadConfig();
fs.watchFile(configPath, reloadConfig);

const UDP_PORT = process.env.UDP_PORT || 20777;
const client = new F1TelemetryClient({ port: UDP_PORT });

let sessionId = null;
let sessionHistoryCache = {};
let participantsCache = {};
let carStatusCache = {};

let activeTrackId = -1;

// Map Memory
let trackPath = [];
let mapBounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
let lastPathPointTime = 0;
let mapDrawingLap = -1;
let mapDrawingFinished = false;

// Geolocation Markers
let mapFeatures = { finishLine: null, sector1: null, sector2: null };
let lastPlayerSector = -1;
let lastPlayerPosition = { x: 0, z: 0 };

let currentTraceTargetIdx = -1;

function getTraceCarIndex(header) {
    if (config.traceTarget === "Player" || !config.traceTarget) {
        return header.m_playerCarIndex;
    }
    
    // Look up target string dynamically
    for (const [idxStr, name] of Object.entries(participantsCache)) {
        if (name && name.toLowerCase().includes(config.traceTarget.toLowerCase())) {
            const targetIdx = parseInt(idxStr, 10);
            if (currentTraceTargetIdx !== targetIdx) {
                console.log(`[MAP RADAR] Successfully LOCKED ONTO trace target: ${name} (Car ${targetIdx})`);
                currentTraceTargetIdx = targetIdx;
            }
            return targetIdx;
        }
    }
    
    if (currentTraceTargetIdx !== header.m_playerCarIndex && Object.keys(participantsCache).length > 2) {
        console.log(`[MAP RADAR] Warning! Could not locate driver '${config.traceTarget}'. Reverting to tracing local Player. (Available: ${Object.values(participantsCache).join(', ')})`);
        currentTraceTargetIdx = header.m_playerCarIndex;
    }
    return header.m_playerCarIndex; // fallback safely to player
}

// ================= NORMALIZERS =================

function normalizeTelemetry(data) {
    if (!data?.m_header || !data?.m_carTelemetryData) return null;

    const playerCarIndex = data.m_header.m_playerCarIndex;
    const car = data.m_carTelemetryData[playerCarIndex];
    const status = carStatusCache[playerCarIndex];

    if (!car) return null;

    return {
        sessionId,
        speed: car.m_speed,
        throttle: car.m_throttle,
        brake: car.m_brake,
        gear: car.m_gear,
        rpm: car.m_engineRPM,
        drs: car.m_drs,
        
        ersStore: status?.m_ersStoreEnergy || 0,
        ersMode: status?.m_ersDeployMode || 0,

        // optional extras (use later in UI)
        tyresTemp: car.m_tyresSurfaceTemperature,
        tyresSurfaceTemperature: car.m_tyresSurfaceTemperature,
        tyreInnerTemperature: car.m_tyresInnerTemperature,
        tyrePressure: car.m_tyresPressure,
        brakeTemp: car.m_brakesTemperature,
        engineTemp: car.m_engineTemperature
    };
}

function normalizeLap(data) {
    if (!data?.m_header || !data?.m_lapData) return null;

    const playerCarIndex = data.m_header.m_playerCarIndex;
    const lap = data.m_lapData[playerCarIndex];

    if (!lap) return null;

    // ===== DEFAULTS =====
    let fastestLap = null;
    let sector1 = null;
    let sector2 = null;
    let sector3 = null;

    let BestLap = null;
    let sector1Time = null;
    let sector2Time = null;
    let sector3Time = null;

    // ===== SESSION HISTORY =====
    if (sessionHistoryCache[playerCarIndex]?.m_lapHistoryData) {
        const history = sessionHistoryCache[playerCarIndex];
        
        // NEW FIELDS
        BestLap = history.m_bestLapTimeLapNum
        sector1Time= history.m_bestSector1LapNum
        sector2Time= history.m_bestSector2LapNum
        sector3Time= history.m_bestSector3LapNum

        const bestLapIndex = BestLap - 1;
        if (bestLapIndex >= 0) {
            const bestLap = history.m_lapHistoryData[bestLapIndex];
            if (bestLap) fastestLap = bestLap.m_lapTimeInMS / 1000;
        }

        const bestS1Index = sector1Time - 1;
        if (bestS1Index >= 0) {
            const lap1 = history.m_lapHistoryData[bestS1Index];
            if (lap1 && lap1.m_sector1TimeInMS) sector1 = lap1.m_sector1TimeInMS / 1000;
        }

        const bestS2Index = sector2Time - 1;
        if (bestS2Index >= 0) {
            const lap2 = history.m_lapHistoryData[bestS2Index];
            if (lap2 && lap2.m_sector2TimeInMS) sector2 = lap2.m_sector2TimeInMS / 1000;
        }

        const bestS3Index = sector3Time - 1;
        if (bestS3Index >= 0) {
            const lap3 = history.m_lapHistoryData[bestS3Index];
            if (lap3 && lap3.m_sector3TimeInMS) sector3 = lap3.m_sector3TimeInMS / 1000;
        }
    }

    // ===== GLOBAL SESSION BESTS =====
    let globalBest = {
        lap: { time: Infinity, driver: "Unknown" },
        s1: { time: Infinity, driver: "Unknown" },
        s2: { time: Infinity, driver: "Unknown" },
        s3: { time: Infinity, driver: "Unknown" }
    };

    for (const [carIdxStr, history] of Object.entries(sessionHistoryCache)) {
        const carIdx = parseInt(carIdxStr, 10);
        const driverName = participantsCache[carIdx] || `Car ${carIdx}`;
        
        const bLapIdx = history.m_bestLapTimeLapNum - 1;
        if (bLapIdx >= 0 && history.m_lapHistoryData[bLapIdx]) {
            const t = history.m_lapHistoryData[bLapIdx].m_lapTimeInMS / 1000;
            if (t > 0 && t < globalBest.lap.time) globalBest.lap = { time: t, driver: driverName };
        }
        
        const s1Idx = history.m_bestSector1LapNum - 1;
        if (s1Idx >= 0 && history.m_lapHistoryData[s1Idx]) {
            const t = history.m_lapHistoryData[s1Idx].m_sector1TimeInMS / 1000;
            if (t > 0 && t < globalBest.s1.time) globalBest.s1 = { time: t, driver: driverName };
        }

        const s2Idx = history.m_bestSector2LapNum - 1;
        if (s2Idx >= 0 && history.m_lapHistoryData[s2Idx]) {
            const t = history.m_lapHistoryData[s2Idx].m_sector2TimeInMS / 1000;
            if (t > 0 && t < globalBest.s2.time) globalBest.s2 = { time: t, driver: driverName };
        }

        const s3Idx = history.m_bestSector3LapNum - 1;
        if (s3Idx >= 0 && history.m_lapHistoryData[s3Idx]) {
            const t = history.m_lapHistoryData[s3Idx].m_sector3TimeInMS / 1000;
            if (t > 0 && t < globalBest.s3.time) globalBest.s3 = { time: t, driver: driverName };
        }
    }

    if (globalBest.lap.time === Infinity) globalBest.lap = null;
    if (globalBest.s1.time === Infinity) globalBest.s1 = null;
    if (globalBest.s2.time === Infinity) globalBest.s2 = null;
    if (globalBest.s3.time === Infinity) globalBest.s3 = null;

    // ===== LEADERBOARD =====
    const leaderboard = [];
    for (let i = 0; i < 22; i++) {
        const pLap = data.m_lapData[i];
        if (pLap && pLap.m_carPosition > 0 && participantsCache[i]) {
            let bestLapSecs = "NA";
            const hist = sessionHistoryCache[i];
            if (hist && hist.m_bestLapTimeLapNum > 0) {
                const bIdx = hist.m_bestLapTimeLapNum - 1;
                if (bIdx >= 0 && hist.m_lapHistoryData[bIdx]) {
                    bestLapSecs = hist.m_lapHistoryData[bIdx].m_lapTimeInMS / 1000;
                }
            }
            leaderboard.push({
                carIdx: i,
                position: pLap.m_carPosition,
                driver: participantsCache[i],
                currentLap: pLap.m_currentLapNum,
                bestLap: bestLapSecs,
                isPlayer: i === playerCarIndex
            });
        }
    }
    leaderboard.sort((a, b) => a.position - b.position);

    return {
        sessionId,

        lapNumber: lap.m_currentLapNum,
        lapTime: lap.m_currentLapTimeInMS / 1000,
        position: lap.m_carPosition,

        BestLap: BestLap,
        sector1Time: sector1Time,
        sector2Time: sector2Time,
        sector3Time: sector3Time,

        fastestLap: fastestLap ?? "NA",
        sector1: sector1 ?? "NA",
        sector2: sector2 ?? "NA",
        sector3: sector3 ?? "NA",
        
        globalBest,
        leaderboard
    };
}

// ================= LISTENERS =================

function startUDP() {

    client.on("session", (data) => {
      const newSessionId = data?.m_header?.m_sessionUID;
      const newTrackId = data?.m_trackId;
  
      if (!newSessionId) return;
  
      // only update if session actually changed uniquely
      if (sessionId !== newSessionId.toString() || activeTrackId !== newTrackId) {
          sessionId = newSessionId?.toString();
          activeTrackId = newTrackId;
          console.log("New session:", sessionId, "Track ID:", activeTrackId);
          
          sessionHistoryCache = {};
          
          // MAP RESTORATION
          const mapFile = path.join(mapDir, `track_${activeTrackId}.json`);
          if (fs.existsSync(mapFile)) {
              console.log(`[MAP RADAR] Found cached map for track_${activeTrackId}! Restoring instantly...`);
              const mapCache = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
              trackPath = mapCache.trackPath;
              mapBounds = mapCache.mapBounds;
              mapFeatures = mapCache.mapFeatures || { finishLine: null, sector1: null, sector2: null };
              mapDrawingFinished = true;
          } else {
              console.log(`[MAP RADAR] No cached map for track_${activeTrackId}. Initializing Live Radar Tracing...`);
              trackPath = [];
              mapBounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
              mapFeatures = { finishLine: null, sector1: null, sector2: null };
              lastPathPointTime = 0;
              mapDrawingLap = -1;
              mapDrawingFinished = false;
          }
      }
    });

    client.on("carTelemetry", (data) => {
        const telemetry = normalizeTelemetry(data);
        if (telemetry) updateState({ telemetry });
    });

    client.on("motion", (data) => {
        if (!data?.m_header || !data?.m_carMotionData) return;
        const playerCarIndex = data.m_header.m_playerCarIndex;

        const positions = [];
        for (let i = 0; i < 22; i++) {
            const car = data.m_carMotionData[i];
            if (car) {
                const x = car.m_worldPositionX;
                const z = car.m_worldPositionZ;
                if (x !== 0 || z !== 0) {
                    if (x < mapBounds.minX) mapBounds.minX = x;
                    if (x > mapBounds.maxX) mapBounds.maxX = x;
                    if (z < mapBounds.minZ) mapBounds.minZ = z;
                    if (z > mapBounds.maxZ) mapBounds.maxZ = z;
                    
                    positions.push({
                        carIdx: i,
                        driver: participantsCache[i] || `X`,
                        x, z,
                        isPlayer: i === playerCarIndex
                    });
                }
            }
        }

        const now = Date.now();
        if (!mapDrawingFinished) {
             const traceIdx = getTraceCarIndex(data.m_header);
             const pCar = data.m_carMotionData[traceIdx];
             if (pCar && (pCar.m_worldPositionX !== 0 || pCar.m_worldPositionZ !== 0)) {
                 lastPlayerPosition = { x: pCar.m_worldPositionX, z: pCar.m_worldPositionZ };
                 
                 // Render path line points strictly occasionally based on time
                 if (now - lastPathPointTime > 250) {
                     trackPath.push(lastPlayerPosition);
                     // Protect memory limit if lap drawing bounds are turned completely off
                     if (!config.enableLapLimit && trackPath.length > 5000) {
                         trackPath.shift();
                     }
                     lastPathPointTime = now;
                 }
             }
        }

        updateState({
            map: {
                trackId: activeTrackId,
                bounds: mapBounds,
                features: mapFeatures,
                positions,
                trackPath
            }
        });
    });

    client.on("sessionHistory", (data) => {
      if (!data) return;

      sessionHistoryCache[data.m_carIdx] = data;
    });

    client.on("participants", (data) => {
      if (!data?.m_participants) return;
      data.m_participants.forEach((p, idx) => {
          if (p.m_name) participantsCache[idx] = p.m_name;
      });
    });

    client.on("lapData", (data) => {
        // Track actively targeted driver for lap/sector trace lines
        const traceIdx = getTraceCarIndex(data?.m_header);
        
        if (traceIdx !== undefined && data.m_lapData[traceIdx]) {
           const lapNum = data.m_lapData[traceIdx].m_currentLapNum;
           const sector = data.m_lapData[traceIdx].m_sector;

           if (!mapDrawingFinished) {
               // Track the start/finish Checkered line
               if (mapDrawingLap !== -1 && lapNum > mapDrawingLap && !mapFeatures.finishLine) {
                    mapFeatures.finishLine = { ...lastPlayerPosition };
               }
               
               // Track Sectors
               if (lastPlayerSector !== -1 && sector !== lastPlayerSector) {
                   if (lastPlayerSector === 0 && sector === 1 && !mapFeatures.sector1) {
                       mapFeatures.sector1 = { ...lastPlayerPosition };
                   }
                   if (lastPlayerSector === 1 && sector === 2 && !mapFeatures.sector2) {
                       mapFeatures.sector2 = { ...lastPlayerPosition };
                   }
               }
               lastPlayerSector = sector;
           }

           if (mapDrawingLap === -1 && lapNum > 0) {
               mapDrawingLap = lapNum; // Lock onto current lap
           } else if (config.enableLapLimit && !mapDrawingFinished && mapDrawingLap !== -1 && lapNum >= mapDrawingLap + config.lapLimit) {
               mapDrawingFinished = true; // Limits crossed, fully mapped logic triggered!
               
               // Dump to JSON map cache!!
               if (activeTrackId !== undefined && activeTrackId !== -1) {
                   const mapFile = path.join(mapDir, `track_${activeTrackId}.json`);
                   try {
                      fs.writeFileSync(mapFile, JSON.stringify({ trackPath, mapBounds, mapFeatures }));
                      console.log(`[MAP RADAR] Track ${activeTrackId} fully mapped! Cached dynamically.`);
                   } catch(e) {
                      console.error("Failed storing Map File:", e);
                   }
               }
           }
        }

        const lap = normalizeLap(data);
        if (lap) updateState({ lap });
    });
    
    client.on("carStatus", (data) => {
        if (!data?.m_header || !data?.m_carStatusData) return;
        const pIdx = data.m_header.m_playerCarIndex;
        carStatusCache[pIdx] = data.m_carStatusData[pIdx];
    });

    client.on("error", (err) => {
        console.error("UDP Error:", err);
    });

    client.start();
    console.log("Listening for telemetry...");
}

module.exports = { startUDP };