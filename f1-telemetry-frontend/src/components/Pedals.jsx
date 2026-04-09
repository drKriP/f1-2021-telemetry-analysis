import React from 'react';

const Pedals = ({ throttle, brake }) => {
  return (
    <div className="pedals-container">
      <div className="pedal">
        <div className="pedal-label">BRK</div>
        <div className="pedal-fill brake-fill" style={{ height: `${brake * 100}%` }}></div>
      </div>
      <div className="pedal">
        <div className="pedal-label">THR</div>
        <div className="pedal-fill throttle-fill" style={{ height: `${throttle * 100}%` }}></div>
      </div>
    </div>
  );
};

export default Pedals;
