import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import './App.css';

import F1Dash from './components/F1Dash';
import LapInfo from './components/LapInfo';
import CarHealth from './components/CarHealth';
import Leaderboard from './components/Leaderboard';
import TrackMap from './components/TrackMap';

const SOCKET_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

function App() {
  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState(null);
  const [lap, setLap] = useState(null);

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('Connected to telemetry server');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from telemetry server');
      setConnected(false);
    });

    socket.on('telemetry', (data) => {
      if (data.sessionId) {
        setTelemetry(data);
        if (data.lap) {
          setLap(data.lap);
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="dashboard-container">
      <div className="header">
        <div className="header-title">
          <h1>F1 TELEMETRY</h1>
        </div>
        <div className={`connection-status ${!connected ? 'status-disconnected' : (telemetry?.isLive ? 'status-connected' : 'status-standby')}`}>
          {!connected ? 'Offline' : (telemetry?.isLive ? 'Live' : 'Standby')}
        </div>
      </div>

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

      <TrackMap mapData={telemetry?.map} isLive={telemetry?.isLive} />
    </div>
  );
}

export default App;
