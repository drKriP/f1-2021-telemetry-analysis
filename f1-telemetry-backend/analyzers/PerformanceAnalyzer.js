const DatabaseManager = require('../utils/DatabaseManager');
const { normalizeTelemetry } = require('../utils/normalizers');

class PerformanceAnalyzer {
    constructor() {
        this.reset();
    }

    reset() {
        this.activeTrackId = -1;
        this.driverName = "Guest";
        this.personalBest = null; 
        this.currentLapData = []; 
        
        this.isRecordingSession = true;
        this.isActiveLapRecording = false;
        this.recordingLapNum = -1;
        this.lastLapNum = -1;
        
        this.lastSampleDistance = -1;
        this.currentDelta = 0;
        this.lastSector = -1;
        this.sector1Dist = -1;
        this.sector2Dist = -1;
        this.lastDist = -1;
        this.isLapInvalid = false;
        this.sessionLaps = [];
        this.lastCompletedLap = null;
        this.lastSessionTime = -1;
    }

    handleSession(data) {
        const newTrackId = data?.m_trackId;
        const currentSessionTime = data?.m_header?.m_sessionTime || 0;

        // Reset if track changes OR if session restarted (time jumped backwards)
        if (this.activeTrackId !== newTrackId || (this.lastSessionTime > 2 && currentSessionTime < this.lastSessionTime - 2)) {
            console.log(`[PERF] Session Reset Detected (Time: ${currentSessionTime} < ${this.lastSessionTime}). Clearing traces.`);
            this.reset();
            this.activeTrackId = newTrackId;
            this.loadPB();
        }
        
        this.lastSessionTime = currentSessionTime;
    }

    setDriver(name) {
        if (this.driverName !== name) {
            this.driverName = name || "Guest";
            this.personalBest = null; // Clear memory PB on switch
            this.loadPB();
        }
    }

    loadPB() {
        if (this.activeTrackId === -1 || !this.driverName || this.driverName === "Guest") return;
        const pb = DatabaseManager.getBestLap(this.driverName, this.activeTrackId);
        if (pb) {
            this.personalBest = pb;
            console.log(`[PERF] Loaded PB for ${this.driverName}: ${this.personalBest.lapTime}s`);
        } else {
            this.personalBest = null;
        }
    }

    setRecordingSession(status) {
        this.isRecordingSession = status;
        if (!status) this.isActiveLapRecording = false;
    }

    clearPB() {
        this.personalBest = null;
        this.currentLapData = [];
        this.currentDelta = 0;
        console.log(`[PERF] PB Data Cleared for ${this.driverName}`);
    }

    handleLapData(data, traceIdx, config, motionData, telemetryData, carStatusCache) {
        const lap = data.m_lapData[traceIdx];
        if (!lap) return;

        const currentDist = lap.m_lapDistance;
        const lapNum = lap.m_currentLapNum;
        
        // --- LAP VALIDATION ---
        // If the game marks the lap as invalid (e.g. corner cut), we flag it.
        if (lap.m_currentLapInvalid === 1) {
            this.isLapInvalid = true;
        }

        const lapIncremented = (this.lastLapNum !== -1 && lapNum > this.lastLapNum);
        const distanceReset = (this.lastDist > 1000 && currentDist >= 0 && currentDist < 50);

        if (this.isRecordingSession) {
            if (lapIncremented || distanceReset) {
                if (this.isActiveLapRecording) {
                    this.finalizeLap(lap.m_lastLapTimeInMS / 1000);
                }
                this.startNewLapRecording(lapNum);
                this.captureSample(currentDist, lap, motionData, telemetryData, carStatusCache, traceIdx);
            }

            if (!this.isActiveLapRecording) {
                this.startNewLapRecording(lapNum);
                this.captureSample(currentDist, lap, motionData, telemetryData, carStatusCache, traceIdx);
            }

            if (this.isActiveLapRecording) {
                const sector = lap.m_sector;
                if (this.lastSector === 0 && sector === 1) this.sector1Dist = currentDist;
                else if (this.lastSector === 1 && sector === 2) this.sector2Dist = currentDist;
                this.lastSector = sector;
 
                this.captureSample(currentDist, lap, motionData, telemetryData, carStatusCache, traceIdx);
                this.lastSampleDistance = currentDist;
            }
        }

        this.lastLapNum = lapNum;
        this.lastDist = currentDist;

        if (this.personalBest && this.personalBest.samples) {
            const ghostSample = this.findClosestSample(currentDist, this.personalBest.samples);
            if (ghostSample) {
                this.currentDelta = (lap.m_currentLapTimeInMS / 1000) - ghostSample.time;
            }
        }
    }

    startNewLapRecording(lapNum) {
        this.isActiveLapRecording = true;
        this.recordingLapNum = lapNum;
        this.currentLapData = [];
        this.lastSampleDistance = -1;
        this.lastSector = 0;
        this.sector1Dist = -1;
        this.sector2Dist = -1;
        this.isLapInvalid = false; // Reset for new lap
        console.log(`[PERF] Recording Lap ${lapNum} for ${this.driverName}...`);
    }

    captureSample(currentDist, lap, motionData, telemetryData, carStatusCache, traceIdx) {
        if (!motionData || !telemetryData) return;
        const motion = motionData.m_carMotionData[traceIdx];
        const tel = normalizeTelemetry(telemetryData, carStatusCache, traceIdx);
        
        if (motion) {
            this.currentLapData.push({
                dist: currentDist,
                time: lap.m_currentLapTimeInMS / 1000,
                speed: Math.sqrt(motion.m_worldVelocityX**2 + motion.m_worldVelocityY**2 + motion.m_worldVelocityZ**2) * 3.6,
                x: motion.m_worldPositionX,
                z: motion.m_worldPositionZ,
                throttle: tel?.throttle || 0,
                brake: tel?.brake || 0
            });
        }
    }

    findClosestSample(dist, samples) {
        let low = 0;
        let high = samples.length - 1;
        while (low <= high) {
            let mid = Math.floor((low + high) / 2);
            if (samples[mid].dist < dist) low = mid + 1;
            else if (samples[mid].dist > dist) high = mid - 1;
            else return samples[mid];
        }
        return samples[low] || samples[samples.length - 1];
    }

    finalizeLap(lapTime) {
        if (!this.currentLapData.length || lapTime <= 0) return;

        if (this.isLapInvalid) {
            console.log(`[PERF] Lap ${this.recordingLapNum} by ${this.driverName} was INVALID. Discarding.`);
        } else {
            const isNewPB = !this.personalBest || (lapTime < this.personalBest.lapTime);
            if (isNewPB) {
                this.personalBest = {
                    lapTime,
                    sector1Dist: this.sector1Dist,
                    sector2Dist: this.sector2Dist,
                    samples: [...this.currentLapData]
                };

                if (this.driverName !== "Guest") {
                    DatabaseManager.saveBestLap(
                        this.driverName, 
                        this.activeTrackId, 
                        lapTime, 
                        this.sector1Dist, 
                        this.sector2Dist, 
                        this.currentLapData
                    );
                }
                console.log(`[PERF] New Session PB for ${this.driverName}: ${lapTime}s`);
            }
        }

        this.lastCompletedLap = {
            lapNum: this.recordingLapNum,
            lapTime: lapTime,
            samples: [...this.currentLapData],
            sector1Dist: this.sector1Dist,
            sector2Dist: this.sector2Dist,
            isInvalid: this.isLapInvalid
        };

        this.sessionLaps.unshift({
            id: Date.now(),
            lapNum: this.recordingLapNum,
            lapTime: lapTime,
            isInvalid: this.isLapInvalid
        });
        if (this.sessionLaps.length > 20) this.sessionLaps.pop();
    }

    getState() {
        return {
            driverName: this.driverName,
            delta: this.currentDelta,
            isRecording: this.isRecordingSession,
            isLapStarted: this.isActiveLapRecording,
            isLapInvalid: this.isLapInvalid,
            pbLapTime: this.personalBest?.lapTime || null,
            pbSector1Dist: this.personalBest?.sector1Dist || -1,
            pbSector2Dist: this.personalBest?.sector2Dist || -1,
            lastLapNum: this.recordingLapNum,
            sessionLaps: this.sessionLaps.map(l => ({ id: l.id, lapNum: l.lapNum, lapTime: l.lapTime, isInvalid: l.isInvalid }))
        };
    }

    getHistory() {
        return {
            pbSamples: this.personalBest?.samples || [],
            currentSamples: [...this.currentLapData]
        };
    }
}

module.exports = PerformanceAnalyzer;
