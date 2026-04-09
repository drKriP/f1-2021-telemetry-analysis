import React from 'react';

const getTyreStatus = (temp) => {
  if (temp < 80) return 'safe'; // Cold
  if (temp > 110) return 'danger'; // Overheating
  return 'warning'; // Optimal/Warm
};

const getEngineStatus = (temp) => {
  if (temp < 90) return 'safe';
  if (temp > 120) return 'danger';
  return 'warning';
};

const getBrakeStatus = (temp) => {
  if (temp < 400) return 'safe';
  if (temp > 1000) return 'danger';
  return 'warning';
};

const TyreNode = ({ label, tyreTemp, brakeTemp }) => (
  <div className={`tyre-node ${getTyreStatus(tyreTemp)}`}>
    <div className="health-label" style={{alignSelf: 'flex-start'}}>{label}</div>
    <div className="tyre-metric">
       <span>Sur:</span> 
       <span className="val tyre-val">{tyreTemp}°C</span>
    </div>
    <div className="tyre-metric">
       <span>Brk:</span> 
       <span className="val brake-val">{brakeTemp}°C</span>
    </div>
  </div>
);

const CarHealth = ({ telemetry, isLive }) => {
  if (!telemetry) {
    return (
       <div className="data-box" style={{ width: '100%', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.1)', opacity: 0.5 }}>
          <div className="label">[ SENSORS OFFLINE ]</div>
       </div>
    );
  }

  const tEngine = telemetry.engineTemp || 0;
  
  // Index: 0=RL, 1=RR, 2=FL, 3=FR
  const tyresObj = telemetry.tyresTemp || [0,0,0,0];
  const brakesObj = telemetry.brakeTemp || [0,0,0,0];

  return (
    <>
      <div className="car-top-view">
         <div className="car-chassis-bg"></div>
         {/* Top Row: Front */}
         <TyreNode label="FL" tyreTemp={tyresObj[2]} brakeTemp={brakesObj[2]} />
         <TyreNode label="FR" tyreTemp={tyresObj[3]} brakeTemp={brakesObj[3]} />
         
         {/* Bottom Row: Rear */}
         <TyreNode label="RL" tyreTemp={tyresObj[0]} brakeTemp={brakesObj[0]} />
         <TyreNode label="RR" tyreTemp={tyresObj[1]} brakeTemp={brakesObj[1]} />
      </div>

      <div className="health-grid" style={{ marginTop: '1rem' }}>
        <div className={`health-item ${getEngineStatus(tEngine)}`} style={{ gridColumn: '1 / -1' }}>
          <div className="health-label">Engine Temp</div>
          <div className="health-value">{tEngine}°C</div>
        </div>
      </div>
    </>
  );
};

export default CarHealth;
