let latestTelemetry = null;
let latestLap = null;

function updateState({ telemetry, lap }) {
    if (telemetry) latestTelemetry = telemetry;
    if (lap) latestLap = lap;
}

function startBroadcast(io) {
    setInterval(() => {
        if (!latestTelemetry) return;

        io.emit("telemetry", {
            ...latestTelemetry,
            lap: latestLap || null
        });
    }, 100); // 10 FPS
}

module.exports = {
    updateState,
    startBroadcast
};