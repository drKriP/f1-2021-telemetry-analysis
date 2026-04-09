const Database = require('better-sqlite3');
const path = require('path');

class DatabaseManager {
    constructor() {
        const dbPath = path.join(__dirname, '..', 'telemetry.db');
        this.db = new Database(dbPath);
        this.init();
    }

    init() {
        // 1. Ensure users table exists
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                name TEXT PRIMARY KEY,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            INSERT OR IGNORE INTO users (name) VALUES ('Guest');
        `);

        // 2. Check if best_laps needs migration
        const tableInfo = this.db.prepare("PRAGMA table_info(best_laps)").all();
        const hasProfileName = tableInfo.some(col => col.name === 'profile_name');

        if (tableInfo.length > 0 && !hasProfileName) {
            console.log("[DB] Migrating best_laps table to include profile_name...");
            this.db.transaction(() => {
                // Rename old table
                this.db.exec("ALTER TABLE best_laps RENAME TO best_laps_old");
                
                // Create new table with correct schema
                this.db.exec(`
                    CREATE TABLE best_laps (
                        profile_name TEXT,
                        track_id INTEGER,
                        lap_time REAL,
                        sector1_dist REAL,
                        sector2_dist REAL,
                        samples_json TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (profile_name, track_id),
                        FOREIGN KEY (profile_name) REFERENCES users(name)
                    )
                `);

                // Migrate data (default to 'Guest')
                this.db.exec(`
                    INSERT INTO best_laps (profile_name, track_id, lap_time, sector1_dist, sector2_dist, samples_json, created_at)
                    SELECT 'Guest', track_id, lap_time, sector1_dist, sector2_dist, samples_json, created_at
                    FROM best_laps_old
                `);

                // Drop old table
                this.db.exec("DROP TABLE best_laps_old");
            })();
        } else {
            // Standard creation if table doesn't exist at all
            this.db.exec(`
                CREATE TABLE IF NOT EXISTS best_laps (
                    profile_name TEXT,
                    track_id INTEGER,
                    lap_time REAL,
                    sector1_dist REAL,
                    sector2_dist REAL,
                    samples_json TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (profile_name, track_id),
                    FOREIGN KEY (profile_name) REFERENCES users(name)
                )
            `);
        }
        console.log("[DB] SQLite Initialized with Profiles at telemetry.db");
    }

    getUsers() {
        return this.db.prepare('SELECT name FROM users ORDER BY created_at ASC').all();
    }

    addUser(name) {
        // Enforce 4 users limit (Guest + 3)
        const count = this.db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        if (count >= 4) throw new Error("Maximum of 4 users reached.");
        
        const stmt = this.db.prepare('INSERT OR IGNORE INTO users (name) VALUES (?)');
        stmt.run(name);
        return { name };
    }

    getBestLap(profileName, trackId) {
        const stmt = this.db.prepare('SELECT * FROM best_laps WHERE profile_name = ? AND track_id = ?');
        const row = stmt.get(profileName, trackId);
        if (row) {
            return {
                ...row,
                samples: JSON.parse(row.samples_json)
            };
        }
        return null;
    }

    saveBestLap(profileName, trackId, lapTime, sector1Dist, sector2Dist, samples) {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO best_laps (profile_name, track_id, lap_time, sector1_dist, sector2_dist, samples_json)
            VALUES (?, ?, ?, ?, ?, ?)
        `);
        stmt.run(profileName, trackId, lapTime, sector1Dist, sector2Dist, JSON.stringify(samples));
        console.log(`[DB] Saved PB for Profile:${profileName} on Track:${trackId}: ${lapTime}s`);
    }

    deleteBestLap(profileName, trackId) {
        const stmt = this.db.prepare('DELETE FROM best_laps WHERE profile_name = ? AND track_id = ?');
        stmt.run(profileName, trackId);
        console.log(`[DB] Deleted PB for Profile:${profileName} on Track:${trackId}`);
    }
}

module.exports = new DatabaseManager();
