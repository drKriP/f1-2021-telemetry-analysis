import React from 'react';

const Gear = ({ gear }) => {
  let displayGear = gear;
  if (gear === 0) displayGear = 'N';
  if (gear === -1) displayGear = 'R';

  return (
    <div className="gear-display">
      <div className="gear-value">{displayGear}</div>
      <div className="gear-label">Gear</div>
    </div>
  );
};

export default Gear;
