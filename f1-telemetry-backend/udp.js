const { F1TelemetryClient } = require("f1-2021-udp");
const { updateState, syncHistory } = require("./broadcaster");
const fs = require('fs');
const path = require('path');

const { normalizeTelemetry, normalizeLap } = require("./utils/normalizers");
const TrackMapper = require('./analyzers/TrackMapper');
const PerformanceAnalyzer = require('./analyzers/PerformanceAnalyzer');
const DatabaseManager = require('./utils/DatabaseManager');

const mapDir = path.join(__dirname, 'trackMaps');
const pbDir = path.join(__dirname, 'bestLaps');

if (!fs.existsSync(mapDir)) fs.mkdirSync(mapDir);
if (!fs.existsSync(pbDir)) fs.mkdirSync(pbDir);

// Config Loader
const configPath = path.join(__dirname, 'config.json');
let config = { 
    traceTarget: "Player", 
    enableLapLimit: true, 
    lapLimit: 2,
    samplingIntervalMeters: 10 
};

function reloadConfig() {
    if (fs.existsSync(configPath)) {
        try {
            const raw = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            config = { ...config, ...raw };
            console.log("[UDP DISPATCHER] Config updated:", config);
        } catch(e) {
            console.error("Error parsing config.json", e);
        }
    }
}
reloadConfig();
fs.watchFile(configPath, reloadConfig);

const mapper = new TrackMapper(mapDir);
const p1Analyzer = new PerformanceAnalyzer();
const p2Analyzer = new PerformanceAnalyzer();

let participantsCache = {};
let carStatusCache = {};
let sessionId = null;
let lastMotionData = null;
let lastTelemetryRaw = null;
let sessionHistoryCache = {};

function startUDP(io) {
    const UDP_PORT = process.env.UDP_PORT || 20777;
    const client = new F1TelemetryClient({ port: UDP_PORT });

    // Handle incoming UI commands
    io.on("connection", (socket) => {
        // Initial setup for new client
        socket.emit("USER_LIST_UPDATE", DatabaseManager.getUsers());

        socket.on("GET_USERS", () => {
            socket.emit("USER_LIST_UPDATE", DatabaseManager.getUsers());
        });

        socket.on("ADD_USER", (name) => {
            try {
                DatabaseManager.addUser(name);
                const users = DatabaseManager.getUsers();
                io.emit("USER_LIST_UPDATE", users);
            } catch (e) {
                socket.emit("ERROR", e.message);
            }
        });

        socket.on("SET_PROFILES", (profiles) => {
            if (profiles.p1) p1Analyzer.setDriver(profiles.p1);
            if (profiles.p2) p2Analyzer.setDriver(profiles.p2);
            console.log(`[UDP] Profiles Active: P1:${profiles.p1 || 'None'} / P2:${profiles.p2 || 'None'}`);
        });

        socket.on("SET_RECORDING", (status) => {
            p1Analyzer.setRecordingSession(status);
            p2Analyzer.setRecordingSession(status);
        });
        
        socket.on("SET_GHOST_VISIBLE", (visible) => {
            p1Analyzer.setGhostVisible(visible);
            p2Analyzer.setGhostVisible(visible);
        });

        socket.on("CLEAR_PB", () => {
            const p1Driver = p1Analyzer.driverName;
            const trackId = p1Analyzer.activeTrackId;
            
            p1Analyzer.clearPB();
            p2Analyzer.clearPB();

            if (p1Driver && p1Driver !== "Guest" && trackId !== -1) {
                DatabaseManager.deleteBestLap(p1Driver, trackId);
            }
        });

        socket.on("REQUEST_ANALYSIS_SYNC", () => {
            syncHistory(socket);
        });
    });

    client.on("session", (data) => {
        const newId = data?.m_header?.m_sessionUID?.toString();
        if (sessionId !== newId) {
            sessionId = newId;
            mapper.handleSession(data);
            p1Analyzer.handleSession(data);
            p2Analyzer.handleSession(data);
        }
    });

    client.on("participants", (data) => {
        data.m_participants.forEach((p, idx) => {
            if (p.m_name) participantsCache[idx] = p.m_name;
        });
    });

    client.on("carStatus", (data) => {
        data.m_carStatusData.forEach((status, idx) => {
            carStatusCache[idx] = status;
        });
    });

    client.on("sessionHistory", (data) => {
        sessionHistoryCache[data.m_carIdx] = data;
    });

    client.on("motion", (data) => {
        lastMotionData = data;
        const p1Idx = data.m_header.m_playerCarIndex;
        mapper.handleMotion(data, p1Idx, participantsCache);
        
        updateState({ 
            map: mapper.getState(), 
            performance: {
                p1: p1Analyzer.getState(),
                p2: data.m_header.m_secondaryPlayerCarIndex !== 255 ? p2Analyzer.getState() : null
            },
            performanceHistory: {
                p1: p1Analyzer.getHistory(),
                p2: data.m_header.m_secondaryPlayerCarIndex !== 255 ? p2Analyzer.getHistory() : null
            }
        });
    });

    client.on("carTelemetry", (data) => {
        lastTelemetryRaw = data;
        const p1Idx = data.m_header.m_playerCarIndex;
        const tel = normalizeTelemetry(data, carStatusCache, p1Idx);
        if (tel) {
            updateState({ 
                telemetry: tel, 
                isLive: true,
                performance: {
                    p1: p1Analyzer.getState(),
                    p2: data.m_header.m_secondaryPlayerCarIndex !== 255 ? p2Analyzer.getState() : null
                },
                performanceHistory: {
                    p1: p1Analyzer.getHistory(),
                    p2: data.m_header.m_secondaryPlayerCarIndex !== 255 ? p2Analyzer.getHistory() : null
                }
            });
        }
    });

    client.on("lapData", (data) => {
        const p1Idx = data.m_header.m_playerCarIndex;
        const p2Idx = data.m_header.m_secondaryPlayerCarIndex;

        mapper.handleLapData(data, p1Idx, config);
        
        // Dispatch to Analyzers (Manual profile names are already set via SET_PROFILES)
        p1Analyzer.handleLapData(data, p1Idx, config, lastMotionData, lastTelemetryRaw, carStatusCache); 
        if (p2Idx !== 255) {
            p2Analyzer.handleLapData(data, p2Idx, config, lastMotionData, lastTelemetryRaw, carStatusCache);
        }
        
        const lap = normalizeLap(data, participantsCache, sessionId, sessionHistoryCache);
        if (lap) {
            updateState({ 
                lap, 
                performance: {
                    p1: p1Analyzer.getState(),
                    p2: p2Idx !== 255 ? p2Analyzer.getState() : null
                },
                performanceHistory: {
                    p1: p1Analyzer.getHistory(),
                    p2: p2Idx !== 255 ? p2Analyzer.getHistory() : null
                },
                map: mapper.getState()
            });
        }
    });

    client.on("error", (err) => console.error("UDP Error:", err));

    client.start();
    console.log("[UDP] Service Started with Profile Management. Port:", UDP_PORT);
}

module.exports = { startUDP };