import React from 'react';

const formatTime = (timeInSecs) => {
  if (!timeInSecs || timeInSecs === "NA") return "--:--.---";
  const m = Math.floor(timeInSecs / 60);
  const s = Math.floor(timeInSecs % 60);
  const ms = Math.floor((timeInSecs % 1) * 1000);
  return `${m > 0 ? m + ':' : ''}${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
};

const renderSector = (label, myTime, globalData) => {
  let isPurple = false;
  let isGreen = false;
  let delta = null;

  if (myTime !== 'NA' && globalData && globalData.time !== "NA" && globalData.time > 0) {
    if (myTime <= globalData.time + 0.001) {
      isPurple = true; // Set absolute fastest
    } else {
      delta = (myTime - globalData.time).toFixed(3);
    }
  }

  // Fallback for when there's no global data but we have my time
  if (!isPurple && myTime !== 'NA' && (!globalData || globalData.time === "NA")) {
      isGreen = true; // Assume personal best if no global exists yet
  }

  const myTimeColor = isPurple ? 'var(--neon-purple)' : (isGreen ? 'var(--neon-green)' : 'var(--text-main)');

  return (
    <div className="data-box sector-box">
      <div className="label">{label}</div>
      
      {globalData && globalData.time !== "NA" && globalData.time > 0 && (
        <div className="global-best">
           <span className="purple-text">{formatTime(globalData.time)}</span>
           <span className="driver-name">{globalData.driver}</span>
        </div>
      )}
      
      <div className="my-time">
         <span style={{ color: myTimeColor }}>
           ME: {formatTime(myTime)}
         </span>
         {delta && <span className="delta-red">+{delta}</span>}
      </div>
    </div>
  );
}

const LapInfo = ({ lap }) => {
  if (!lap) return <div className="data-box"><div className="label">Waiting for lap data...</div></div>;

  return (
    <>
      {renderSector("Fastest Lap", lap.fastestLap, lap.globalBest?.lap)}
      {renderSector("Sector 1", lap.sector1, lap.globalBest?.s1)}
      {renderSector("Sector 2", lap.sector2, lap.globalBest?.s2)}
      {renderSector("Sector 3", lap.sector3, lap.globalBest?.s3)}
    </>
  );
};

export default LapInfo;
