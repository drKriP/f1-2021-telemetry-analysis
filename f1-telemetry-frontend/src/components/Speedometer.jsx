import React from 'react';

const Speedometer = ({ telemetry }) => {
  const speed = telemetry?.speed || 0;
  const rpm = telemetry?.rpm || 0;
  
  // Calculate stroke offset based on RPM (Assume max roughly 13500 for visualization)
  const maxRpm = 13500;
  const percentage = Math.min(Math.max(rpm / maxRpm, 0), 1);
  const ringCircumference = 2 * Math.PI * 120; // r=120
  const strokeDashoffset = ringCircumference - (percentage * (0.75 * ringCircumference));

  return (
    <div className="speed-ring-container">
      <svg className="speed-ring-svg" viewBox="0 0 280 280">
        <circle 
          className="speed-ring-bg" 
          cx="140" cy="140" r="120" 
          strokeDasharray={`${ringCircumference * 0.75} ${ringCircumference * 0.25}`}
        />
        <circle 
          className="speed-ring-fg" 
          cx="140" cy="140" r="120" 
          strokeDasharray={`${ringCircumference * 0.75} ${ringCircumference * 0.25}`}
          style={{ strokeDashoffset }}
        />
      </svg>
      
      <div className="speed-info">
        <div className="speed-value">{speed}</div>
        <div className="speed-unit">KM/H</div>
        <div className="rpm-value">{rpm} RPM</div>
      </div>
    </div>
  );
};

export default Speedometer;
