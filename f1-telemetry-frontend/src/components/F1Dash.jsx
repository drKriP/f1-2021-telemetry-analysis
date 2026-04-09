import React from 'react';

const formatTime = (timeInSecs) => {
  if (!timeInSecs || timeInSecs === "NA") return "--:--.---";
  const m = Math.floor(timeInSecs / 60);
  const s = Math.floor(timeInSecs % 60);
  const ms = Math.floor((timeInSecs % 1) * 1000);
  return `${m > 0 ? m + ':' : ''}${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

const F1Dash = ({ telemetry, lap, isLive }) => {
  if (!telemetry || !isLive) {
    return (
      <div className="f1-hud-assembly" style={{ opacity: 0.5, filter: 'grayscale(0.8)' }}>
        <div className="data-box" style={{ width: '100%', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.1)' }}>
          <div className="label" style={{ fontSize: '1.2rem', letterSpacing: '4px' }}>[ GARAGE STANDBY ]</div>
        </div>
      </div>
    );
  }

  const speed = telemetry.speed || 0;
  const rpm = telemetry.rpm || 0;
  let gear = telemetry.gear || 0;
  if (gear === 0) gear = 'N';
  if (gear === -1) gear = 'R';

  const drs = telemetry.drs || false;
  const ersEnergy = telemetry.ersStore || 0;
  const ersPercent = Math.min(Math.round((ersEnergy / 4000000) * 100), 100);

  const throttle = telemetry.throttle || 0;
  const brake = telemetry.brake || 0;

  // RPM LEDs (Assuming redline around 13000, max 14000)
  const maxRpm = 13500;
  const numLeds = 15;
  const activeLeds = Math.min(Math.floor((rpm / maxRpm) * numLeds), numLeds);

  const getLedClass = (index) => {
    if (index >= activeLeds) return 'off';
    if (index < 5) return 'green';
    if (index < 10) return 'red';
    return 'blue';
  };

  return (
    <div className="f1-hud-assembly">
      
      {/* Brake Bar (Left Side) */}
      <div className="integrated-pedal">
        <div className="integrated-pedal-label">BRK</div>
        <div className="integrated-pedal-bar">
          <div className="integrated-fill brake-fill" style={{ height: `${brake * 100}%` }}></div>
        </div>
      </div>

      {/* Main Steering Wheel Screen */}
      <div className="f1-steering-wrapper">
        <div className="f1-dash-leds">
          {Array.from({ length: numLeds }).map((_, i) => (
            <div key={i} className={`led ${getLedClass(i)}`}></div>
          ))}
        </div>
        
        <div className="f1-dash-screen">
          <div className="screen-left block-column">
            <div className="screen-stat">
              <span className="stat-value">{speed}</span>
              <span className="stat-label">KM/H</span>
            </div>
            <div className="screen-stat">
              <span className="stat-value">{rpm}</span>
              <span className="stat-label">RPM</span>
            </div>
          </div>

          <div className="screen-center block-column" style={{ alignItems: 'center', justifyContent: 'space-between', gap: '0' }}>
            <div style={{ display: 'flex', gap: '1.2rem', color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 'bold' }}>
              <span>LAP {lap?.lapNumber || '--'}</span>
              <span style={{ color: 'var(--neon-cyan)' }}>P{lap?.position || '--'}</span>
            </div>
            
            <span className="gear-text">{gear}</span>

            <div style={{ fontFamily: 'var(--font-display)', color: 'var(--neon-green)', fontSize: '1.4rem', fontWeight: 'bold' }}>
              {formatTime(lap?.lapTime)}
            </div>
          </div>

          <div className="screen-right block-column">
            <div className="screen-stat" style={{ alignItems: 'flex-end' }}>
              <span className="stat-value" style={{ color: 'var(--neon-green)' }}>{ersPercent}%</span>
              <span className="stat-label">ERS STORE</span>
            </div>
            <div className={`drs-box ${drs ? 'drs-on' : ''}`}>
              DRS
            </div>
          </div>
        </div>
      </div>

      {/* Throttle Bar (Right Side) */}
      <div className="integrated-pedal">
        <div className="integrated-pedal-label">THR</div>
        <div className="integrated-pedal-bar">
          <div className="integrated-fill throttle-fill" style={{ height: `${throttle * 100}%` }}></div>
        </div>
      </div>
      
    </div>
  );
};

export default F1Dash;
