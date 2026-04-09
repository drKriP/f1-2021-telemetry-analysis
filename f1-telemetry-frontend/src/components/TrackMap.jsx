import React, { useState } from 'react';
import { TRACK_NAMES } from '../utils/constants';

const TrackMap = ({ mapData, isLive }) => {
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1, rotation: 0 });
  const [dragState, setDragState] = useState({ isDragging: false, isRotating: false, startX: 0, startY: 0, initX: 0, initY: 0, initRot: 0 });

  const trackName = (mapData?.trackId !== undefined && TRACK_NAMES[mapData.trackId]) ? TRACK_NAMES[mapData.trackId] : 'Circuit';

  if (!mapData || !mapData.bounds || mapData.bounds.minX === Infinity || !isLive) {
    return (
      <div className="map-container panel" style={{ gridColumn: '1 / -1', opacity: 0.6 }}>
         <h2>Live Ground Radar <span style={{ color: 'var(--neon-purple)', fontSize: '0.8em', marginLeft:'0.5rem' }}>[{trackName}]</span></h2>
         <div className="data-box" style={{height: '400px', display: 'flex', alignItems:'center', justifyContent: 'center', border: '2px dashed rgba(255,255,255,0.05)'}}>
            <div className="label" style={{ letterSpacing: '2px' }}>[ MAP STANDBY - AWAITING SESSION ]</div>
         </div>
      </div>
    );
  }

  const { bounds, positions, trackPath } = mapData;
  const { minX, maxX, minZ, maxZ } = bounds;

  const width = Math.max(maxX - minX, 100);
  const height = Math.max(maxZ - minZ, 100);

  const paddingX = width * 0.08;
  const paddingZ = height * 0.08;

  const vBoxMinX = minX - paddingX;
  const vBoxMinZ = minZ - paddingZ;
  const vBoxWidth = width + (paddingX * 2);
  const vBoxHeight = height + (paddingZ * 2);

  // Natively scale the ViewBox so vector math re-evaluates cleanly without pixelation
  const zoomVBoxWidth = vBoxWidth / transform.scale;
  const zoomVBoxHeight = vBoxHeight / transform.scale;

  // Re-center around the missing box space
  const dWidth = vBoxWidth - zoomVBoxWidth;
  const dHeight = vBoxHeight - zoomVBoxHeight;

  const finalMinX = vBoxMinX + (dWidth / 2) + transform.x;
  const finalMinZ = vBoxMinZ + (dHeight / 2) + transform.y;

  const viewBox = `${finalMinX} ${finalMinZ} ${zoomVBoxWidth} ${zoomVBoxHeight}`;

  const cameraCenterX = finalMinX + (zoomVBoxWidth / 2);
  const cameraCenterZ = finalMinZ + (zoomVBoxHeight / 2);

  // Geometry math to ensure Checkpoints sit 100% perpendicular to the physical track line
  const getPerpendicularAngle = (pos) => {
    if (!trackPath || trackPath.length < 2 || !pos) return 0;
    let closestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < trackPath.length; i++) {
       const dx = trackPath[i].x - pos.x;
       const dz = trackPath[i].z - pos.z;
       const distSq = dx*dx + dz*dz;
       if (distSq < minDist) { minDist = distSq; closestIdx = i; }
    }
    const prev = trackPath[Math.max(0, closestIdx - 1)];
    const next = trackPath[Math.min(trackPath.length - 1, closestIdx + 1)];
    const angleRad = Math.atan2(next.z - prev.z, next.x - prev.x);
    return (angleRad * (180 / Math.PI)) + 90; // Add 90 for perfect perpendicularity
  };

  const s1Angle = getPerpendicularAngle(mapData.features?.sector1);
  const s2Angle = getPerpendicularAngle(mapData.features?.sector2);
  const flAngle = getPerpendicularAngle(mapData.features?.finishLine);

  let pathStr = '';
  if (trackPath && trackPath.length > 0) {
      pathStr = trackPath.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.z}`).join(' ');
  }

  // --- Handlers for Interactivity ---
  const handlePointerDown = (e) => {
    const isRightClick = e.button === 2;
    setDragState({
      isDragging: !isRightClick,
      isRotating: isRightClick,
      startX: e.clientX,
      startY: e.clientY,
      initX: transform.x,
      initY: transform.y,
      initRot: transform.rotation
    });
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (dragState.isDragging) {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      
      const unitsPerPixelX = zoomVBoxWidth / rect.width;
      const unitsPerPixelY = zoomVBoxHeight / rect.height;

      // Unrotated viewBox translation means we don't need complex trigonometry to pan!
      setTransform(prev => ({ 
        ...prev, 
        x: dragState.initX - (dx * unitsPerPixelX), 
        y: dragState.initY - (dy * unitsPerPixelY) 
      }));
    } else if (dragState.isRotating) {
      const dx = e.clientX - dragState.startX;
      setTransform(prev => ({ ...prev, rotation: dragState.initRot + dx }));
    }
  };

  const handlePointerUp = (e) => {
    setDragState(prev => ({ ...prev, isDragging: false, isRotating: false }));
    e.target.releasePointerCapture(e.pointerId);
  };

  const handleContextMenu = (e) => {
    e.preventDefault(); // Stop native right-click menu from breaking rotation
  };

  return (
    <div className="map-container panel" style={{ gridColumn: '1 / -1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Live Ground Radar <span style={{ color: 'var(--neon-purple)', fontSize: '0.8em', marginLeft:'0.5rem' }}>[{trackName}]</span></h2>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
              <span className="label" style={{ fontSize: '0.8rem', color: 'var(--neon-green)' }}>
                 [L-Click: PAN] &nbsp; [R-Click: ROTATE]
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                 <button 
                   onClick={() => setTransform(prev => ({...prev, scale: Math.min(prev.scale * 1.5, 30)}))}
                   style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--neon-cyan)', color: 'white', padding: '0.2rem 0.8rem', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
                 >ZOOM IN</button>
                 <button 
                   onClick={() => setTransform(prev => ({...prev, scale: Math.max(prev.scale * 0.7, 0.1)}))}
                   style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--neon-purple)', color: 'white', padding: '0.2rem 0.8rem', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
                 >ZOOM OUT</button>
              </div>
          </div>
      </div>
      
      <div 
        className="svg-map-wrapper interactive-map-wrapper"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={handleContextMenu}
        style={{ cursor: dragState.isDragging ? 'grabbing' : (dragState.isRotating ? 'ew-resize' : 'grab') }}
      >
         <div style={{ width: '100%', height: '100%' }}>
           <svg viewBox={viewBox} className="track-svg" preserveAspectRatio="xMidYMid meet">
              <g transform={`rotate(${transform.rotation}, ${cameraCenterX}, ${cameraCenterZ})`}>
                  {pathStr && (
                     <path d={pathStr} className="track-path-line" style={{ strokeWidth: 12 / transform.scale }} />
                  )}

                  {/* Sector Line Points */}
                  {mapData.features?.sector1 && (
                      <g transform={`translate(${mapData.features.sector1.x}, ${mapData.features.sector1.z}) rotate(${s1Angle})`}>
                          <line x1={-Math.max(width, height) * 0.02 / transform.scale} y1="0" x2={Math.max(width, height) * 0.02 / transform.scale} y2="0" stroke="var(--neon-green)" strokeWidth={4 / transform.scale} />
                      </g>
                  )}
                  {mapData.features?.sector2 && (
                      <g transform={`translate(${mapData.features.sector2.x}, ${mapData.features.sector2.z}) rotate(${s2Angle})`}>
                          <line x1={-Math.max(width, height) * 0.02 / transform.scale} y1="0" x2={Math.max(width, height) * 0.02 / transform.scale} y2="0" stroke="var(--neon-purple)" strokeWidth={4 / transform.scale} />
                      </g>
                  )}

                  {/* Finish Line (Checkered Point) */}
                  {mapData.features?.finishLine && (
                      <g transform={`translate(${mapData.features.finishLine.x}, ${mapData.features.finishLine.z}) rotate(${flAngle})`}>
                          <line x1={-Math.max(width, height) * 0.02 / transform.scale} y1="0" x2={Math.max(width, height) * 0.02 / transform.scale} y2="0" stroke="white" strokeWidth={6 / transform.scale} />
                          <line x1={-Math.max(width, height) * 0.02 / transform.scale} y1="0" x2={Math.max(width, height) * 0.02 / transform.scale} y2="0" stroke="black" strokeWidth={6 / transform.scale} strokeDasharray={`${4 / transform.scale} ${4 / transform.scale}`} />
                      </g>
                  )}

                  {positions && positions.map(pos => (
                     <g key={pos.carIdx} transform={`translate(${pos.x}, ${pos.z})`}>
                       <circle 
                         cx="0" cy="0" 
                         r={Math.max(width, height) * 0.012 / transform.scale} 
                         className={`car-dot ${pos.isPlayer ? 'player-dot' : ''}`} 
                         style={pos.isPlayer ? { strokeWidth: 2 / transform.scale } : {}}
                       />
                       <text 
                         x={0} 
                         y={Math.max(width, height) * 0.035 / transform.scale} 
                         className="car-label" 
                         fontSize={Math.max(width, height) * 0.025 / transform.scale}
                       >
                         {pos.driver !== 'X' ? pos.driver.substring(0,3) : pos.carIdx}
                       </text>
                     </g>
                  ))}
              </g>
           </svg>
         </div>
      </div>
    </div>
  );
};

export default TrackMap;
