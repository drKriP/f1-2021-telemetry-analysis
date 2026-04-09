import React from 'react';
import { TRACK_NAMES } from '../utils/constants';

const formatTime = (timeInSecs) => {
  if (!timeInSecs || timeInSecs === "NA") return "--:--.---";
  const m = Math.floor(timeInSecs / 60);
  const s = Math.floor(timeInSecs % 60);
  const ms = Math.floor((timeInSecs % 1) * 1000);
  return `${m > 0 ? m + ':' : ''}${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

const Leaderboard = ({ leaderboard, trackId }) => {
  const trackName = trackId !== undefined ? TRACK_NAMES[trackId] : '';

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="leaderboard-wrapper">
        <h2>Live Ranking {trackName && <span style={{ color: 'var(--neon-purple)', fontSize: '0.8em' }}>[{trackName}]</span>}</h2>
        <div className="data-box"><div className="label">Waiting for race data...</div></div>
      </div>
    );
  }

  return (
    <div className="leaderboard-wrapper">
      <h2>Live Ranking {trackName && <span style={{ color: 'var(--neon-purple)', fontSize: '0.8em' }}>[{trackName}]</span>}</h2>
      <div className="leaderboard-list">
        {leaderboard.map((row) => (
          <div key={row.carIdx} className={`leaderboard-row ${row.isPlayer ? 'player-row' : ''}`}>
            <div className="lb-pos">{row.position}</div>
            <div className="lb-details">
                <div className="lb-driver">{row.driver || `Car ${row.carIdx}`}</div>
                <div className="lb-stats">
                   <span className="lb-lap">Lap {row.currentLap}</span>
                   <span className="lb-best">{formatTime(row.bestLap)}</span>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;
