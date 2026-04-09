import React, { useState } from 'react';

const formatTime = (timeInSecs) => {
  if (!timeInSecs || timeInSecs === "NA" || timeInSecs === null) return "--:--.---";
  const m = Math.floor(timeInSecs / 60);
  const s = Math.floor(timeInSecs % 60);
  const ms = Math.floor((timeInSecs % 1) * 1000);
  return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

const PerformanceAnalysis = ({ telemetry, lap, socket }) => {
  React.useEffect(() => {
    if (socket) {
      socket.emit("REQUEST_ANALYSIS_SYNC");
    }
  }, [socket]);

  if (!telemetry) return null;
  
  const perf = telemetry?.performance || {};
  const p1 = perf.p1 || {};
  const p2 = perf.p2 || {};
  const showGhost = p1.showGhost ?? true;

  const getPoints = (samples, maxValue, dataKey, maxDist) => {
    if (!samples || samples.length === 0) return [];
    return samples.map((s) => ({
      x: (s.dist / (maxDist || 4000)) * 800,
      y: 120 - (Math.min(s[dataKey] || 0, maxValue) / (maxValue || 1)) * 120
    })).filter(p => !isNaN(p.x) && !isNaN(p.y));
  };

  // Calculate max track distance from all available traces
  const allSamples = [
    ...(p1.pbSamples || []), 
    ...(p1.currentSamples || []),
    ...(p2.pbSamples || []),
    ...(p2.currentSamples || [])
  ].filter(s => s && typeof s.dist === 'number');
  
  const maxDist = Math.max(
    allSamples.reduce((max, s) => (s.dist > max ? s.dist : max), 0),
    4000
  );

  const width = 800;
  const height = 120;

  const TraceGroup = ({ samples, pbSamples, color, dataKey, maxValue, playerName }) => {
    const livePoints = getPoints(samples, maxValue, dataKey, maxDist);
    const pbPoints = getPoints(pbSamples, maxValue, dataKey, maxDist);

    const livePath = livePoints.length > 1 
      ? livePoints.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ')
      : "";
    
    const pbPath = pbPoints.length > 1
      ? pbPoints.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ')
      : "";

    return (
      <g className={`trace-group-${playerName}`}>
        {pbPath && (
          <path d={pbPath} fill="none" stroke={color} strokeWidth="2.0" strokeOpacity="0.4" strokeDasharray="6 4" className="pb-path" />
        )}
        {livePath && (
          <path d={livePath} fill="none" stroke={color} strokeWidth="2.5" className="live-path" filter={`drop-shadow(0 0 3px ${color})`} />
        )}
        {livePoints.length > 0 && (
          <circle 
            cx={livePoints[livePoints.length-1].x} 
            cy={livePoints[livePoints.length-1].y} 
            r="4" 
            fill={color}
            className="live-cursor"
            style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          />
        )}
      </g>
    );
  };

  const ChartStack = ({ title, dataKey, maxValue, unit }) => (
    <div className="sub-graph-container">
      <div className="sub-graph-header">
        <span className="title">{title} ({unit})</span>
        <div className="mini-legend">
            <span className="leg-item"><span className="dot" style={{background: 'var(--neon-cyan)'}}></span> {p1.driverName || 'P1'}</span>
            {p2.driverName && (
              <span className="leg-item"><span className="dot" style={{background: 'var(--neon-orange)'}}></span> {p2.driverName}</span>
            )}
        </div>
      </div>
      <div className="svg-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <line x1="0" y1="0" x2={width} y2="0" stroke="rgba(255,255,255,0.05)" />
          <line x1="0" y1={height} x2={width} y2={height} stroke="rgba(255,255,255,0.05)" />
          
          <TraceGroup samples={p1.currentSamples} pbSamples={p1.pbSamples} color="var(--neon-cyan)" dataKey={dataKey} maxValue={maxValue} playerName="p1" />
          {p2.driverName && (
            <TraceGroup samples={p2.currentSamples} pbSamples={p2.pbSamples} color="var(--neon-orange)" dataKey={dataKey} maxValue={maxValue} playerName="p2" />
          )}

          {/* Sector Markers (from P1 PB) */}
          {p1.pbSector1Dist > 0 && (
            <g>
              <line x1={(p1.pbSector1Dist / maxDist) * width} y1="0" x2={(p1.pbSector1Dist / maxDist) * width} y2={height} stroke="var(--neon-cyan)" strokeWidth="1" strokeDasharray="4 2" opacity="0.4" />
              <text x={(p1.pbSector1Dist / maxDist) * width} y="10" fontSize="8" fill="var(--neon-cyan)" textAnchor="middle" opacity="0.6">S1</text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );

  const formatDelta = (d) => {
    if (typeof d !== 'number') return "0.000";
    if (d === 0) return "0.000";
    return (d > 0 ? "+" : "") + d.toFixed(3);
  };

  return (
    <div className="analysis-page high-fidelity">
      <div className="analysis-top-row">
        <div className={`panel stat-panel driver-p1 ${p1.isLapInvalid ? 'invalid' : ''}`}>
          <div className="label">{p1.driverName || 'PLAYER 1'} PB</div>
          <div className="value" style={{color: 'var(--neon-cyan)'}}>{formatTime(p1.pbLapTime)}</div>
          {p1.isLapInvalid && <div className="invalid-pill">INVALID LAP</div>}
        </div>

        <div className="panel stat-panel delta-panel">
          <div className="label">LIVE DELTA (P1)</div>
          <div className="value" style={{ color: p1.delta < 0 ? 'var(--neon-green)' : (p1.delta > 0 ? 'var(--f1-red)' : 'var(--text-main)') }}>
            {formatDelta(p1.delta)}
          </div>
        </div>
        
        {p2.driverName ? (
           <div className={`panel stat-panel driver-p2 ${p2.isLapInvalid ? 'invalid' : ''}`}>
            <div className="label">{p2.driverName} PB</div>
            <div className="value" style={{color: 'var(--neon-orange)'}}>{formatTime(p2.pbLapTime)}</div>
            {p2.isLapInvalid && <div className="invalid-pill">INVALID LAP</div>}
          </div>
        ) : (
          <div className="panel stat-panel live">
            <div className="label">CURRENT LAP</div>
            <div className="value">{formatTime(lap?.lapTime)}</div>
            {p1.isLapStarted && <div className="live-pill">TRACING...</div>}
          </div>
        )}
      </div>

      <div className="analysis-charts">
        <ChartStack title="SPEED" dataKey="speed" maxValue={360} unit="KPH" />
        <ChartStack title="THROTTLE" dataKey="throttle" maxValue={1} unit="%" />
        <ChartStack title="BRAKE" dataKey="brake" maxValue={1} unit="%" />
      </div>

      <div className="panel control-panel" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'row', gap: '2rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <button 
            className={`action-btn ${p1.isRecording ? 'recording' : ''}`}
            style={{ width: 'auto', padding: '0.8rem 2rem' }}
            onClick={() => socket.emit("SET_RECORDING", !p1.isRecording)}
          >
            {p1.isRecording ? 'STOP SESSION' : 'START SESSION'}
          </button>
        </div>

        <button 
          className="action-btn clear-pb-btn" 
          style={{ 
            width: 'auto',
            borderColor: 'var(--f1-red)', 
            color: 'var(--f1-red)', 
            background: 'rgba(225, 6, 0, 0.05)',
            padding: '0.8rem 1.5rem',
            fontSize: '0.8rem'
          }}
          onClick={() => {
            if (window.confirm("Warning: This will delete the record permanently. Are you sure?")) {
              socket.emit("CLEAR_PB");
            }
          }}
        >
          CLEAR PERSONAL BEST
        </button>
      </div>
    </div>
  );
};

export default PerformanceAnalysis;
