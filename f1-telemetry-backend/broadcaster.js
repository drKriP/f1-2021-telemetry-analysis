let latestTelemetry = null;
let latestLap = null;
let latestMap = null;
let latestPerformanceLite = null;
let latestPerformanceHistory = null;
let lastTelemetryPing = 0;

function updateState({ telemetry, lap, map, performance, performanceHistory }) {
    if (telemetry) {
        latestTelemetry = telemetry;
        lastTelemetryPing = Date.now();
    }
    if (lap) latestLap = lap;
    if (map) latestMap = map;
    if (performance) latestPerformanceLite = performance;
    if (performanceHistory) latestPerformanceHistory = performanceHistory;
}

function startBroadcast(io) {
    // 1. Lite Real-time Loop (10 FPS)
    setInterval(() => {
        const isLive = (Date.now() - lastTelemetryPing) < 2000;

        io.emit("telemetry", {
            ...(latestTelemetry || {}),
            isLive,
            lap: latestLap || null,
            map: latestMap || null,
            performance: latestPerformanceLite || null
        });
    }, 100);
}

function syncHistory(socket) {
    if (!latestPerformanceHistory) return;
    socket.emit("telemetry_history", latestPerformanceHistory);
}

module.exports = {
    updateState,
    startBroadcast,
    syncHistory
};