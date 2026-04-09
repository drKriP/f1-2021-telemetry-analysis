const fs = require('fs');
const path = require('path');

class TrackMapper {
    constructor(mapDir) {
        this.mapDir = mapDir;
        this.reset();
    }

    reset() {
        this.trackPath = [];
        this.mapBounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
        this.mapFeatures = { finishLine: null, sector1: null, sector2: null };
        this.activeTrackId = -1;
        this.mapDrawingLap = -1;
        this.mapDrawingFinished = false;
        this.lastPathPointTime = 0;
        this.lastPlayerSector = -1;
        this.lastPlayerPosition = { x: 0, z: 0 };
        this.positions = []; // Store current car dots
    }

    handleSession(data) {
        const newTrackId = data?.m_trackId;
        if (this.activeTrackId !== newTrackId) {
            this.reset();
            this.activeTrackId = newTrackId;
            const mapFile = path.join(this.mapDir, `track_${this.activeTrackId}.json`);
            
            if (fs.existsSync(mapFile)) {
                console.log(`[TRACK MAPPER] Restoring map for track_${this.activeTrackId}`);
                const cache = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
                this.trackPath = cache.trackPath;
                this.mapBounds = cache.mapBounds;
                this.mapFeatures = cache.mapFeatures || this.mapFeatures;
                this.mapDrawingFinished = true;
            }
        }
    }

    handleMotion(data, traceIdx, participantsCache) {
        if (!data?.m_carMotionData) return;
        const pIdx = data.m_header.m_playerCarIndex;
        const pCar = data.m_carMotionData[traceIdx];
        
        // Update car dots
        this.positions = [];
        data.m_carMotionData.forEach((car, i) => {
            const x = car.m_worldPositionX;
            const z = car.m_worldPositionZ;
            if (x !== 0 || z !== 0) {
                // Bounds tracking
                if (x < this.mapBounds.minX) this.mapBounds.minX = x;
                if (x > this.mapBounds.maxX) this.mapBounds.maxX = x;
                if (z < this.mapBounds.minZ) this.mapBounds.minZ = z;
                if (z > this.mapBounds.maxZ) this.mapBounds.maxZ = z;

                this.positions.push({
                    carIdx: i,
                    driver: participantsCache?.[i] || `X`,
                    x, z,
                    isPlayer: i === pIdx
                });
            }
        });

        if (pCar && (pCar.m_worldPositionX !== 0 || pCar.m_worldPositionZ !== 0)) {
            const pos = { x: pCar.m_worldPositionX, z: pCar.m_worldPositionZ };
            this.lastPlayerPosition = pos;

            if (!this.mapDrawingFinished) {
                const now = Date.now();
                if (now - this.lastPathPointTime > 250) {
                    this.trackPath.push(pos);
                    this.lastPathPointTime = now;
                }
            }
        }
    }

    handleLapData(data, traceIdx, config) {
        if (this.mapDrawingFinished) return;
        const lap = data.m_lapData[traceIdx];
        if (!lap) return;

        const lapNum = lap.m_currentLapNum;
        const sector = lap.m_sector;

        // Finish Line Detection
        if (this.mapDrawingLap !== -1 && lapNum > this.mapDrawingLap && !this.mapFeatures.finishLine) {
            this.mapFeatures.finishLine = { ...this.lastPlayerPosition };
        }

        // Sector Detection
        if (this.lastPlayerSector !== -1 && sector !== this.lastPlayerSector) {
            if (this.lastPlayerSector === 0 && sector === 1 && !this.mapFeatures.sector1) {
                this.mapFeatures.sector1 = { ...this.lastPlayerPosition };
            }
            if (this.lastPlayerSector === 1 && sector === 2 && !this.mapFeatures.sector2) {
                this.mapFeatures.sector2 = { ...this.lastPlayerPosition };
            }
        }
        this.lastPlayerSector = sector;

        if (this.mapDrawingLap === -1 && lapNum > 0) {
            this.mapDrawingLap = lapNum;
        } else if (config.enableLapLimit && lapNum >= this.mapDrawingLap + config.lapLimit) {
            this.finalize();
        }
    }

    finalize() {
        this.mapDrawingFinished = true;
        if (this.activeTrackId !== -1) {
            const mapFile = path.join(this.mapDir, `track_${this.activeTrackId}.json`);
            fs.writeFileSync(mapFile, JSON.stringify({
                trackPath: this.trackPath,
                mapBounds: this.mapBounds,
                mapFeatures: this.mapFeatures
            }));
            console.log(`[TRACK MAPPER] Saved map for track_${this.activeTrackId}`);
        }
    }

    getState() {
        return {
            trackId: this.activeTrackId,
            bounds: this.mapBounds,
            features: this.mapFeatures,
            trackPath: this.trackPath,
            positions: this.positions
        };
    }
}

module.exports = TrackMapper;
