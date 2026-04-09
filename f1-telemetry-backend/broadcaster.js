let latestTelemetry = null;
let latestLap = null;
let latestMap = null;
let lastTelemetryPing = 0;

function updateState({ telemetry, lap, map }) {
    if (telemetry) {
        latestTelemetry = telemetry;
        lastTelemetryPing = Date.now();
    }
    if (lap) latestLap = lap;
    if (map) latestMap = map;
}

function startBroadcast(io) {
    setInterval(() => {
        if (!latestTelemetry) return;
        
        const isLive = (Date.now() - lastTelemetryPing) < 2000;

        io.emit("telemetry", {
            ...latestTelemetry,
            isLive,
            lap: latestLap || null,
            map: latestMap || null
        });
    }, 100); // 10 FPS
}

module.exports = {
    updateState,
    startBroadcast
};