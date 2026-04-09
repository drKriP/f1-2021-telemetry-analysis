import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import './App.css';

import F1Dash from './components/F1Dash';
import LapInfo from './components/LapInfo';
import CarHealth from './components/CarHealth';
import Leaderboard from './components/Leaderboard';
import TrackMap from './components/TrackMap';
import PerformanceAnalysis from './components/PerformanceAnalysis';
import ProfileSwitcher from './components/ProfileSwitcher';

const SOCKET_URL = "";

function App() {
  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState(null);
  const [lap, setLap] = useState(null);
  const [view, setView] = useState('dashboard');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);

    s.on('connect', () => {
      console.log('Connected to telemetry server');
      setConnected(true);
    });

    s.on('disconnect', () => {
      console.log('Disconnected from telemetry server');
      setConnected(false);
    });

    s.on('telemetry', (data) => {
      if (data.sessionId || data.isLive !== undefined) {
        setTelemetry(prev => {
          // Merge current real-time data with any existing history we have
          const p1History = prev?.performance?.p1 || {};
          const p2History = prev?.performance?.p2 || {};
          
          return {
            ...data,
            performance: {
              p1: { ...p1History, ...data.performance?.p1 },
              p2: data.performance?.p2 ? { ...p2History, ...data.performance.p2 } : null
            }
          };
        });
        if (data.lap) {
          setLap(data.lap);
        }
      }
    });

    s.on('telemetry_history', (history) => {
      setTelemetry(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          performance: {
            p1: { ...(prev.performance?.p1 || {}), ...history.p1 },
            p2: history.p2 ? { ...(prev.performance?.p2 || {}), ...history.p2 } : null
          }
        };
      });
    });

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <div className="dashboard-container">
      <div className="header">
        <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <h1>F1 TELEMETRY</h1>
          <nav className="nav-pill">
            <button 
              className={view === 'dashboard' ? 'active' : ''} 
              onClick={() => setView('dashboard')}
            >DASHBOARD</button>
            <button 
              className={view === 'analysis' ? 'active' : ''} 
              onClick={() => setView('analysis')}
            >ANALYSIS</button>
          </nav>
        </div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {socket && (
            <ProfileSwitcher 
              socket={socket} 
              p2Active={!!telemetry?.performance?.p2} 
            />
          )}
          <div className={`connection-status ${!connected ? 'status-disconnected' : (telemetry?.isLive ? 'status-connected' : 'status-standby')}`}>
            {!connected ? 'Offline' : (telemetry?.isLive ? 'Live' : 'Standby')}
          </div>
        </div>
      </div>

        {view === 'dashboard' ? (
          <>
            <div className="left-panel panel">
              <Leaderboard leaderboard={lap?.leaderboard || []} trackId={telemetry?.map?.trackId} />
            </div>

            <div className="center-panel panel">
              <F1Dash telemetry={telemetry} lap={lap} isLive={telemetry?.isLive} />
              
              <div style={{ marginTop: '2rem', width: '100%' }}>
                <CarHealth telemetry={telemetry} isLive={telemetry?.isLive} />
              </div>
            </div>

            <div className="right-panel panel">
              <h2>Lap & Sector Bests</h2>
              <LapInfo lap={lap} />
            </div>
          </>
        ) : (
          <div className="analysis-full-panel panel">
            <PerformanceAnalysis 
              telemetry={telemetry} 
              lap={lap} 
              socket={socket} 
            />
          </div>
        )}

      <TrackMap 
        mapData={telemetry?.map} 
        isLive={telemetry?.isLive} 
      />
    </div>
  );
}

export default App;
