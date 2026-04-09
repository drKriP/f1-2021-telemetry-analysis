function normalizeTelemetry(data, carStatusCache, targetIdx = null) {
    if (!data?.m_header || !data?.m_carTelemetryData) return null;
    const pIdx = targetIdx !== null ? targetIdx : data.m_header.m_playerCarIndex;
    const car = data.m_carTelemetryData[pIdx];
    const status = carStatusCache?.[pIdx];
    if (!car) return null;

    return {
        speed: car.m_speed,
        throttle: car.m_throttle,
        brake: car.m_brake,
        gear: car.m_gear,
        rpm: car.m_engineRPM,
        drs: car.m_drs,
        ersStore: status?.m_ersStoreEnergy || 0,
        engineTemp: car.m_engineTemperature,
        tyresTemp: car.m_tyresSurfaceTemperature,
        brakeTemp: car.m_brakesTemperature
    };
}

function normalizeLap(data, participantsCache, sessionId, sessionHistoryCache = {}) {
    if (!data?.m_header || !data?.m_lapData) return null;
    const pIdx = data.m_header.m_playerCarIndex;
    const lap = data.m_lapData[pIdx];
    if (!lap) return null;

    const history = sessionHistoryCache[pIdx];
    let fastestLap = "NA";
    let sector1 = "NA";
    let sector2 = "NA";
    let sector3 = "NA";

    if (history && history.m_lapHistoryData) {
        // Player Best Lap
        if (history.m_bestLapTimeLapNum > 0 && history.m_bestLapTimeLapNum <= history.m_lapHistoryData.length) {
            const bestLapHistory = history.m_lapHistoryData[history.m_bestLapTimeLapNum - 1];
            if (bestLapHistory.m_lapTimeInMS > 0) fastestLap = bestLapHistory.m_lapTimeInMS / 1000;
        }

        // Player Best Sectors (Personal Best)
        if (history.m_bestSector1LapNum > 0 && history.m_bestSector1LapNum <= history.m_lapHistoryData.length) {
            const bS1 = history.m_lapHistoryData[history.m_bestSector1LapNum - 1];
            if (bS1.m_sector1TimeInMS > 0) sector1 = bS1.m_sector1TimeInMS / 1000;
        }
        if (history.m_bestSector2LapNum > 0 && history.m_bestSector2LapNum <= history.m_lapHistoryData.length) {
            const bS2 = history.m_lapHistoryData[history.m_bestSector2LapNum - 1];
            if (bS2.m_sector2TimeInMS > 0) sector2 = bS2.m_sector2TimeInMS / 1000;
        }
        if (history.m_bestSector3LapNum > 0 && history.m_bestSector3LapNum <= history.m_lapHistoryData.length) {
            const bS3 = history.m_lapHistoryData[history.m_bestSector3LapNum - 1];
            if (bS3.m_sector3TimeInMS > 0) sector3 = bS3.m_sector3TimeInMS / 1000;
        }
    } else {
        // Fallback to live lap data if history isn't populated yet
        if (lap.m_sector1TimeInMS > 0) sector1 = lap.m_sector1TimeInMS / 1000;
        if (lap.m_sector2TimeInMS > 0) sector2 = lap.m_sector2TimeInMS / 1000;
    }

    let globalBest = { 
        lap: { time: "NA", driver: "" }, 
        s1: { time: "NA", driver: "" }, 
        s2: { time: "NA", driver: "" }, 
        s3: { time: "NA", driver: "" } 
    };

    // Calculate Global Bests from all car histories
    for (const [cIdxStr, h] of Object.entries(sessionHistoryCache)) {
        const cIdx = parseInt(cIdxStr, 10);
        const driverName = participantsCache[cIdx] || `Car ${cIdx}`;
        if (!h.m_lapHistoryData) continue;
        
        // Global Fastest Lap
        if (h.m_bestLapTimeLapNum > 0 && h.m_bestLapTimeLapNum <= h.m_lapHistoryData.length) {
            const bLap = h.m_lapHistoryData[h.m_bestLapTimeLapNum - 1];
            if (bLap.m_lapTimeInMS > 0) {
                const time = bLap.m_lapTimeInMS / 1000;
                if (globalBest.lap.time === "NA" || time < globalBest.lap.time) {
                    globalBest.lap = { time, driver: driverName };
                }
            }
        }
        // Global Fastest Sector 1
        if (h.m_bestSector1LapNum > 0 && h.m_bestSector1LapNum <= h.m_lapHistoryData.length) {
             const bS1 = h.m_lapHistoryData[h.m_bestSector1LapNum - 1];
             if (bS1.m_sector1TimeInMS > 0) {
                 const time = bS1.m_sector1TimeInMS / 1000;
                 if (globalBest.s1.time === "NA" || time < globalBest.s1.time) {
                     globalBest.s1 = { time, driver: driverName };
                 }
             }
        }
        // Global Fastest Sector 2
        if (h.m_bestSector2LapNum > 0 && h.m_bestSector2LapNum <= h.m_lapHistoryData.length) {
             const bS2 = h.m_lapHistoryData[h.m_bestSector2LapNum - 1];
             if (bS2.m_sector2TimeInMS > 0) {
                 const time = bS2.m_sector2TimeInMS / 1000;
                 if (globalBest.s2.time === "NA" || time < globalBest.s2.time) {
                     globalBest.s2 = { time, driver: driverName };
                 }
             }
        }
        // Global Fastest Sector 3
        if (h.m_bestSector3LapNum > 0 && h.m_bestSector3LapNum <= h.m_lapHistoryData.length) {
             const bS3 = h.m_lapHistoryData[h.m_bestSector3LapNum - 1];
             if (bS3.m_sector3TimeInMS > 0) {
                 const time = bS3.m_sector3TimeInMS / 1000;
                 if (globalBest.s3.time === "NA" || time < globalBest.s3.time) {
                     globalBest.s3 = { time, driver: driverName };
                 }
             }
        }
    }

    const leaderboard = [];
    for (let i = 0; i < 22; i++) {
        const pLap = data.m_lapData[i];
        if (pLap && pLap.m_carPosition > 0 && participantsCache?.[i]) {
            // Get best lap for this driver to show in the ranking
            let driverBestLap = "NA";
            const h = sessionHistoryCache[i];
            if (h && h.m_bestLapTimeLapNum > 0 && h.m_lapHistoryData && h.m_lapHistoryData[h.m_bestLapTimeLapNum - 1]) {
                const bLap = h.m_lapHistoryData[h.m_bestLapTimeLapNum - 1];
                if (bLap.m_lapTimeInMS > 0) driverBestLap = bLap.m_lapTimeInMS / 1000;
            }

            leaderboard.push({
                carIdx: i,
                position: pLap.m_carPosition,
                driver: participantsCache[i],
                currentLap: pLap.m_currentLapNum,
                bestLap: driverBestLap,
                isPlayer: i === pIdx
            });
        }
    }
    leaderboard.sort((a,b) => a.position - b.position);

    return {
        sessionId,
        lapNumber: lap.m_currentLapNum,
        lapTime: lap.m_currentLapTimeInMS / 1000,
        lapDistance: lap.m_lapDistance,
        position: lap.m_carPosition,
        leaderboard,
        fastestLap,
        sector1,
        sector2,
        sector3,
        globalBest
    };
}

module.exports = { normalizeTelemetry, normalizeLap };
