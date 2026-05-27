import React, { useState, useEffect } from 'react';
import GameRoom from './pages/GameRoom';
import Lobby from './pages/Lobby';
import socket from './services/socket'; // Import socket

function App() {
  // UPDATE 2: Membaca memori browser (sessionStorage) agar tahan refresh
  const [screen, setScreen] = useState(() => sessionStorage.getItem('screen') || 'MENU');
  const [mode, setMode] = useState(() => sessionStorage.getItem('mode') || null); 
  const [roomData, setRoomData] = useState(() => {
    const saved = sessionStorage.getItem('roomData');
    return saved ? JSON.parse(saved) : { code: '', role: '', player1: null, player2: null };
  });

  // UPDATE 3: Menyimpan data otomatis setiap kali state berubah
  useEffect(() => {
    sessionStorage.setItem('screen', screen);
    sessionStorage.setItem('mode', mode || '');
    sessionStorage.setItem('roomData', JSON.stringify(roomData));
  }, [screen, mode, roomData]);

  useEffect(() => {
    // === LISTENING FOR BACKEND RESPONSES ===
    
    // 1. When room join/create succeeds
    socket.on('room_status', (data) => {
      setRoomData(prev => ({
        ...prev,
        code: data.room_code,
        role: data.role || prev.role, // Simpan role secara permanen
        player1: data.player1,
        player2: data.player2
      }));
      setScreen('WAITING');
    });

    // 2. If there is an error (room full, empty name, etc.)
    socket.on('room_error', (data) => {
      alert(data.message);
      setScreen('LOBBY'); // Return to lobby
    });


    // 3. When Host presses "Start Battle", move everyone to GameRoom
    socket.on('init_placement', (data) => {
      setScreen('GAME');
    });

    // UPDATE 4: Listener jika musuh Quit dari Waiting Room
    socket.on('force_quit_lobby', () => {
      alert("⚠️ enemy has left the lobby. Returning to main menu.");
      setScreen('LOBBY');
      setRoomData({ code: '', role: '', player1: null, player2: null });
    });

    // UPDATE 5: Re-sync ke Backend jika browser tiba-tiba di-refresh
    socket.on('connect', () => {
      const savedRoom = JSON.parse(sessionStorage.getItem('roomData') || '{}');
      if (savedRoom.code && (sessionStorage.getItem('screen') === 'WAITING' || sessionStorage.getItem('screen') === 'GAME')) {
        socket.emit('rejoin_session', { room_code: savedRoom.code, role: savedRoom.role });
      }
    });

    // Remove listeners when component unmounts
    return () => {
      socket.off('room_status');
      socket.off('room_error');
      socket.off('init_placement');
      socket.off('force_quit_lobby');
      socket.off('connect');
    };
  }, []);

  const handleStartBattle = () => {
    // Only the Host button is active and can start the game
    socket.emit('start_battle', { room_code: roomData.code });
  };

  // --- BASE STYLES ---
  const btnStyle = { padding: '15px 30px', fontSize: '18px', backgroundColor: '#0f3460', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', width: '250px', fontWeight: 'bold' };

  // --- RENDERING SCREEN (SCREEN SWITCHER) ---

    if (screen === 'MENU') {
    return (
      <div className="battleship-theme" style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContents: 'center', backgroundColor: '#020c1b', fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", overflow: 'hidden', color: '#fff' }}>
        
        {/* INJECT ANIMATION AND BATTLE DECOR CSS */}
        <style>{`
          /* Night ocean background & tactical radar grid */
          .ocean-bg {
            position: absolute; inset: 0;
            background: radial-gradient(circle at center, #0a192f 0%, #020c1b 100%);
            z-index: 0;
          }
          .tactical-grid {
            position: absolute; inset: 0;
            background-image: linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px);
            background-size: 40px 40px;
            background-position: center;
            z-index: 1;
          }
          
          /* Sea wave animation */
          .wave {
            position: absolute; bottom: 0; left: 0; width: 200%; height: 100px;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,42.4V120H0Z" fill="%230b2240" opacity="0.5"/></svg>') repeat-x;
            animation: waveMove 12s linear infinite;
            z-index: 2;
          }
          .wave-front {
            position: absolute; bottom: 0; left: -50%; width: 200%; height: 80px;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,42.4V120H0Z" fill="%230f3460" opacity="0.8"/></svg>') repeat-x;
            animation: waveMove 8s linear infinite reverse;
            z-index: 4;
          }

          /* WARSHIP ANIMATION */
          .warship {
            position: absolute; bottom: 40px; left: -150px; font-size: 3rem;
            filter: drop-shadow(0 0 10px rgba(0,0,0,0.5));
            animation: sailAway 25s linear infinite, shipFloat 3s ease-in-out infinite;
            z-index: 3;
          }

          /* FIGHTER JET ANIMATION */
          .fighter-jet {
            position: absolute; top: 15%; right: -100px; font-size: 2rem; opacity: 0.8;
            transform: scaleX(-1) rotate(-10deg);
            animation: jetFly 14s linear infinite;
            z-index: 2;
          }

          /* PATROL HELICOPTER ANIMATION */
          .helicopter {
            position: absolute; top: 25%; left: 10%; font-size: 1.8rem;
            animation: heliPatrol 6s ease-in-out infinite alternate;
            z-index: 2;
          }

          /* Keyframes Penunjang */
          @keyframes waveMove { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          @keyframes shipFloat { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-6px) rotate(2deg); } }
          @keyframes sailAway { 0% { left: -150px; } 100% { left: 110%; } }
          @keyframes jetFly { 0% { right: -100px; top: 15%; } 30% { right: 110%; top: 35%; } 100% { right: 110%; } }
          @keyframes heliPatrol { 
            0% { transform: translateY(0) translateX(0) scaleX(1); } 
            50% { transform: translateY(-15px) translateX(20px) scaleX(1); }
            100% { transform: translateY(5px) translateX(-10px) scaleX(-1); } 
          }

          /* Pulsing military button effect */
          .menu-card {
            background: rgba(15, 32, 67, 0.85);
            padding: 45px; borderRadius: 16px;
            border: 2px solid #00fff0;
            box-shadow: 0 0 30px rgba(0, 255, 240, 0.2);
            text-align: center; width: 420px; z-index: 10;
            backdrop-filter: blur(8px);
          }
          .tactical-btn {
            width: 100%; padding: 16px; margin: 12px 0;
            font-weight: bold; font-size: 1.1rem; letter-spacing: 2px;
            color: #fff; border: 1px solid #00ff88; border-radius: 8px;
            cursor: pointer; transition: all 0.3s ease;
            background: linear-gradient(90deg, rgba(0,255,136,0.1) 0%, rgba(0,255,136,0) 100%);
          }
          .tactical-btn:hover {
            background: #00ff88; color: #020c1b;
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.6);
            transform: translateY(-2px);
          }
          .btn-multi {
            border-color: #00fff0;
            background: linear-gradient(90deg, rgba(0,255,240,0.1) 0%, rgba(0,255,240,0) 100%);
          }
          .btn-multi:hover {
            background: #00fff0; color: #020c1b;
            box-shadow: 0 0 20px rgba(0, 255, 240, 0.6);
          }
        `}</style>

        {/* Background animation components */}
        <div className="ocean-bg"></div>
        <div className="tactical-grid"></div>
        
        {/* Moving/warfare military objects */}
        <div className="fighter-jet">🚀 ✈️</div>
        <div className="helicopter">🚁</div>
        <div className="warship">🚢</div>
        
        {/* Water layers */}
        <div className="wave"></div>
        <div className="wave-front"></div>

        {/* Main menu center content */}
        <div className="menu-card">
          <div style={{ fontSize: '12px', color: '#00fff0', letterSpacing: '4px', marginBottom: '5px', fontWeight: 'bold' }}>TACTICAL BATTLESTATION</div>
          <h1 style={{ fontSize: '2.6rem', margin: '0 0 30px 0', fontWeight: '900', letterSpacing: '2px', textShadow: '0 0 10px rgba(255,255,255,0.2)' }}>
            BATTLE<span style={{ color: '#00fff0' }}>SHIP</span>
          </h1>
          
          <p style={{ color: '#8892b0', fontSize: '0.95rem', marginBottom: '35px' }}>
            Choose your battle mode to begin the sea defense strategy.
          </p>

          {/* Action buttons preserving previous state */}
          <button className="tactical-btn" onClick={() => { setMode('SOLO'); setScreen('GAME'); }}>
            🎛️ SOLO MODE (VS BOT)
          </button>
          
          <button className="tactical-btn btn-multi" onClick={() => { setMode('MULTIPLAYER'); setScreen('LOBBY'); }}>
            📡 MULTIPLAYER LOBBY
          </button>
          
          <div style={{ marginTop: '25px', fontSize: '11px', color: '#4f5e7d' }}>
            SECURE ENCRYPTED CONNECTION V2.0
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'LOBBY') {
    return <Lobby onBack={() => setScreen('MENU')} />;
  }

  if (screen === 'WAITING') {
    return (
      <div style={{ 
        position: 'relative',
        minHeight: '100vh', 
        background: 'linear-gradient(180deg, #0b192c 0%, #1e3a8a 50%, #0284c7 100%)', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: 'white',
        overflow: 'hidden',
        padding: '20px'
      }}>

        {/* UPDATE 6: Tombol Quit di Kiri Atas Waiting Room */}
        <button
          onClick={() => {
            socket.emit('player_quit_room', { room_code: roomData.code });
            setScreen('LOBBY');
            setRoomData({ code: '', role: '', player1: null, player2: null });
          }}
          style={{ position: 'absolute', top: 20, left: 20, padding: '10px 20px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', zIndex: 10 }}
        >
          ← QUIT LOBBY
        </button>

        {/* Injeksi Animasi CSS untuk Efek Helikopter Melayang */}
        <style>{`
          @keyframes floatHeli {
            0% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-15px) rotate(2deg); }
            100% { transform: translateY(0px) rotate(0deg); }
          }
        `}</style>

        {/* --- DEKORASI BANYAK HELIKOPTER DI LANGIT LAUT --- */}
        <div style={{ position: 'absolute', top: '8%', left: '7%', animation: 'floatHeli 4s ease-in-out infinite', fontSize: '3rem', opacity: 0.8, zIndex: 1 }}>🚁</div>
        <div style={{ position: 'absolute', top: '15%', right: '12%', animation: 'floatHeli 5s ease-in-out infinite 1s', fontSize: '2.5rem', opacity: 0.7, zIndex: 1 }}>🚁</div>
        <div style={{ position: 'absolute', top: '25%', left: '18%', animation: 'floatHeli 3.5s ease-in-out infinite 0.5s', fontSize: '2rem', opacity: 0.6, zIndex: 1 }}>🚁</div>
        <div style={{ position: 'absolute', top: '40%', right: '8%', animation: 'floatHeli 4.5s ease-in-out infinite 1.5s', fontSize: '2.8rem', opacity: 0.75, zIndex: 1 }}>🚁</div>
        <div style={{ position: 'absolute', bottom: '35%', left: '10%', animation: 'floatHeli 6s ease-in-out infinite 2s', fontSize: '2.2rem', opacity: 0.5, zIndex: 1 }}>🚁</div>

        {/* Judul Utama */}
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', textShadow: '2px 2px 8px rgba(0,0,0,0.7)', zIndex: 2, letterSpacing: '2px' }}>
          ⚓ BATTLE LOBBY
        </h1>
        <p style={{ color: '#93c5fd', marginBottom: '40px', zIndex: 2 }}>Menunggu formasi armada siap bertempur...</p>

        {/* --- PANEL UTAMA VERSUS --- */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '50px', alignItems: 'center', mb: '40px', zIndex: 2 }}>
          
          {/* Panel Player 1 (Host) */}
          <div style={{ 
            backgroundColor: 'rgba(30, 41, 59, 0.85)', 
            padding: '30px', 
            borderRadius: '15px', 
            border: '2px solid #22c55e', 
            width: '220px',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}>
            <div style={{ fontSize: '4.5rem', marginBottom: '10px' }}>🚢</div>
            <h3 style={{ margin: '10px 0 5px 0', fontSize: '1.4rem' }}>{roomData.player1}</h3>
            <p style={{ color: '#22c55e', fontWeight: 'bold', margin: 0, fontSize: '0.9rem', letterSpacing: '1px' }}>HOST (YOU)</p>
          </div>

          {/* Efek Teks VS Tengah */}
          <h1 style={{ alignSelf: 'center', fontSize: '3rem', color: '#ef4444', textShadow: '0 0 10px rgba(239, 68, 68, 0.6)' }}>VS</h1>

          {/* Panel Player 2 (Guest) */}
          <div style={{ 
            backgroundColor: 'rgba(30, 41, 59, 0.85)', 
            padding: '30px', 
            borderRadius: '15px', 
            border: roomData.player2 ? '2px solid #3b82f6' : '2px dashed #64748b', 
            width: '220px',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}>
            <div style={{ fontSize: '4.5rem', marginBottom: '10px' }}>
              {roomData.player2 ? '🚢' : '⏳'}
            </div>
            <h3 style={{ margin: '10px 0 5px 0', fontSize: '1.4rem', color: roomData.player2 ? 'white' : '#94a3b8' }}>
              {roomData.player2 || 'Mencari Musuh...'}
            </h3>
            <p style={{ color: '#3b82f6', fontWeight: 'bold', margin: 0, fontSize: '0.9rem', letterSpacing: '1px' }}>GUEST</p>
          </div>
        </div>

        {/* --- TOMBOL AKSI --- */}
        <div style={{ marginTop: '40px', zIndex: 2 }}>
          {roomData.role === 'host' ? (
            <button 
              onClick={handleStartBattle}
              disabled={!roomData.player2}
              style={{ 
                padding: '15px 50px', 
                fontSize: '1.3rem', 
                backgroundColor: roomData.player2 ? '#ef4444' : '#475569', 
                color: 'white', 
                border: 'none', 
                borderRadius: '12px', 
                cursor: roomData.player2 ? 'pointer' : 'not-allowed', 
                fontWeight: 'bold',
                boxShadow: roomData.player2 ? '0 4px 15px rgba(239, 68, 68, 0.4)' : 'none',
                transition: '0.3s'
              }}
            >
              START BATTLE
            </button>
          ) : (
            <div style={{ backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: '12px 30px', borderRadius: '8px', border: '1px solid #3b82f6' }}>
              <p style={{ color: '#3b82f6', fontWeight: 'bold', margin: 0, animation: 'pulse 2s infinite' }}>
                Waiting for Host to Start...
              </p>
            </div>
          )}
        </div>

        {/* --- ROOM CODE DI FOOTER TENGAH --- */}
        <div style={{ 
          position: 'absolute', 
          bottom: '35px', 
          left: 0, 
          right: 0, 
          textAlign: 'center', 
          zIndex: 3 
        }}>
          <div style={{ 
            display: 'inline-block',
            backgroundColor: 'rgba(15, 23, 42, 0.75)', 
            padding: '10px 30px', 
            borderRadius: '30px', 
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
          }}>
            <span style={{ fontSize: '1rem', color: '#94a3b8', letterSpacing: '1px' }}>ROOM CODE: </span>
            <span style={{ fontSize: '1.4rem', color: '#38bdf8', fontWeight: 'bold', letterSpacing: '2px', marginLeft: '5px' }}>
              {roomData.code}
            </span>
          </div>
        </div>

      </div>
    );
  }

  if (screen === 'GAME') {
    return <GameRoom mode={mode} roomData={roomData} onBack={() => setScreen('MENU')} />;
  }

  return null;
}

export default App;