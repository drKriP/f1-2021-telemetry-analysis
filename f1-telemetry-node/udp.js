const { F1TelemetryClient } = require("f1-2021-udp");
const { updateState } = require("./broadcaster");

const client = new F1TelemetryClient({ port: 20777 });

let sessionId = null;
let sessionHistoryCache = null;

// ================= NORMALIZERS =================

function normalizeTelemetry(data) {
    if (!data?.m_header || !data?.m_carTelemetryData) return null;

    const playerCarIndex = data.m_header.m_playerCarIndex;
    const car = data.m_carTelemetryData[playerCarIndex];

    if (!car) return null;

    return {
        sessionId,
        speed: car.m_speed,
        throttle: car.m_throttle,
        brake: car.m_brake,
        gear: car.m_gear,
        rpm: car.m_engineRPM,
        drs: car.m_drs,

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
    if (sessionHistoryCache?.m_lapHistoryData) {
        const history = sessionHistoryCache;
        
        const bestLapIndex = history.m_bestLapTimeLapNum - 1;

        // NEW FIELDS
        BestLap = history.m_bestLapTimeLapNum
        sector1Time= history.m_bestSector1LapNum
        sector2Time= history.m_bestSector2LapNum
        sector3Time= history.m_bestSector3LapNum

        if (bestLapIndex >= 0) {
            const bestLap = history.m_lapHistoryData[bestLapIndex];

            if (bestLap) {
                fastestLap = bestLap.m_lapTimeInMS / 1000;
                sector1 = bestLap.m_sector1TimeInMS / 1000;
                sector2 = bestLap.m_sector2TimeInMS / 1000;
                sector3 = bestLap.m_sector3TimeInMS / 1000;
            }
        }
    }

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
        sector3: sector3 ?? "NA"
    };
}

// ================= LISTENERS =================

function startUDP() {

  client.on("session", (data) => {
    const newSessionId = data?.m_header?.m_sessionUID;

    if (!newSessionId) return;

    // only update if session actually changed
    if (sessionId !== newSessionId.toString()) {
        sessionId = newSessionId?.toString();
        console.log("New session:", sessionId);
    }
  });

    client.on("carTelemetry", (data) => {
        const telemetry = normalizeTelemetry(data);
        if (telemetry) updateState({ telemetry });
    });

    client.on("sessionHistory", (data) => {
      if (!data) return;

      sessionHistoryCache = data;
    });

    client.on("lapData", (data) => {
        const lap = normalizeLap(data);
        if (lap) updateState({ lap });
    });

    client.on("error", (err) => {
        console.error("UDP Error:", err);
    });

    client.start();
    console.log("Listening for telemetry...");
}

module.exports = { startUDP };