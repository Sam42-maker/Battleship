import React, { useState, useEffect, useCallback } from 'react';
import GameRoom from './pages/GameRoom';
import Lobby from './pages/Lobby';
import socket from './services/socket';
import sfx from './services/sound';

function App() {
  const [screen, setScreen] = useState(() => sessionStorage.getItem('screen') || 'MENU');
  const [mode, setMode] = useState(() => sessionStorage.getItem('mode') || null);
  const [roomData, setRoomData] = useState(() => {
    const saved = sessionStorage.getItem('roomData');
    return saved ? JSON.parse(saved) : { code: '', role: '', player1: null, player2: null };
  });
  const [showRules, setShowRules] = useState(false);
  const [muted, setMutedState] = useState(() => sessionStorage.getItem('muted') === '1');

  useEffect(() => {
    sfx.setMuted(muted);
    sessionStorage.setItem('muted', muted ? '1' : '0');
  }, [muted]);

  const toggleMute = () => setMutedState((m) => !m);

  // Persist UI state across refresh
  useEffect(() => {
    sessionStorage.setItem('screen', screen);
    sessionStorage.setItem('mode', mode || '');
    sessionStorage.setItem('roomData', JSON.stringify(roomData));
  }, [screen, mode, roomData]);

  // Auto rejoin on refresh
  useEffect(() => {
    if (roomData.code && (screen === 'WAITING' || screen === 'GAME')) {
      socket.emit('rejoin_room', {
        room_code: roomData.code,
        role: roomData.role,
      });
    }
  }, []);

  useEffect(() => {
    const onRoomStatus = (data) => {
      setRoomData((prev) => ({
        ...prev,
        code: data.room_code,
        role: data.role || prev.role,
        player1: data.player1,
        player2: data.player2,
      }));
      setScreen('WAITING');
    };
    const onRoomError = (data) => {
      alert(data.message);
      setScreen('LOBBY');
    };
    const onInitPlacement = () => setScreen('GAME');
    const onForceQuit = () => {
      alert('⚠️ Enemy has left the lobby. Returning to main menu.');
      sessionStorage.clear();
      setRoomData({ code: '', role: '', player1: null, player2: null });
      setMode(null);
      setScreen('MENU');
    };

    socket.on('room_status', onRoomStatus);
    socket.on('room_error', onRoomError);
    socket.on('init_placement', onInitPlacement);
    socket.on('force_quit_lobby', onForceQuit);

    return () => {
      socket.off('room_status', onRoomStatus);
      socket.off('room_error', onRoomError);
      socket.off('init_placement', onInitPlacement);
      socket.off('force_quit_lobby', onForceQuit);
    };
  }, []);

  const handleStartBattle = useCallback(() => {
    socket.emit('start_battle', { room_code: roomData.code });
  }, [roomData.code]);

  const handleQuitWaitingRoom = useCallback(() => {
    if (window.confirm('Are you sure you want to leave the room?')) {
      socket.emit('player_quit_room', { room_code: roomData.code, role: roomData.role });
      sessionStorage.clear();
      setRoomData({ code: '', role: '', player1: null, player2: null });
      setMode(null);
      setScreen('MENU');
    }
  }, [roomData]);

  // ===== MENU =====
  if (screen === 'MENU') {
    return (
      <div data-testid="menu-screen" style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020c1b', fontFamily: "'Rajdhani','Segoe UI',sans-serif", overflow: 'hidden', color: '#fff' }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Orbitron:wght@500;700;900&display=swap');
          .ocean-bg{position:absolute;inset:0;background-image:url('/bg-menu.jpg');background-repeat:no-repeat;background-size:cover;background-position:center;z-index:0;opacity:.55}
          .tactical-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(0,255,136,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,136,.04) 1px,transparent 1px);background-size:40px 40px;z-index:1}
          .scanline{position:absolute;inset:0;z-index:1;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(0,255,200,.03) 0,rgba(0,255,200,.03) 1px,transparent 1px,transparent 4px);mix-blend-mode:overlay}
          .modal-overlay{position:fixed;inset:0;background:rgba(2,12,27,.85);z-index:100;display:flex;justify-content:center;align-items:center;backdrop-filter:blur(6px)}
          .modal-content{background:rgba(15,32,67,.98);border:2px solid #00fff0;border-radius:16px;width:90%;max-width:640px;max-height:80vh;overflow-y:auto;padding:35px;color:#fff;box-shadow:0 0 30px rgba(0,255,240,.3)}
          .help-btn{position:absolute;top:25px;right:25px;width:48px;height:48px;border-radius:50%;background:rgba(15,32,67,.8);border:2px solid #00fff0;color:#00fff0;font-size:22px;font-weight:700;cursor:pointer;z-index:50;transition:.3s}
          .help-btn:hover{background:#00fff0;color:#020c1b;transform:scale(1.1);box-shadow:0 0 20px #00fff0}
          .wave{position:absolute;bottom:0;left:0;width:200%;height:110px;background:url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,42.4V120H0Z" fill="%230b2240" opacity="0.5"/></svg>') repeat-x;animation:waveMove 12s linear infinite;z-index:2}
          .wave-front{position:absolute;bottom:0;left:-50%;width:200%;height:80px;background:url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,42.4V120H0Z" fill="%230f3460" opacity="0.85"/></svg>') repeat-x;animation:waveMove 8s linear infinite reverse;z-index:4}
          .warship{position:absolute;bottom:40px;left:-280px;filter:drop-shadow(0 0 12px rgba(0,0,0,.6));animation:sailAway 28s linear infinite, shipFloat 3s ease-in-out infinite;z-index:3}
          .warship img{width:260px;height:auto}
          .warship::after{content:'';position:absolute;top:50%;right:100%;width:140px;height:6px;background:linear-gradient(90deg, transparent 0%, rgba(255,255,255,.4) 100%);filter:blur(3px);border-radius:6px}
          .cloud{position:absolute;top:6%;font-size:3rem;opacity:.25;animation:cloudDrift 60s linear infinite;z-index:1;filter:blur(.5px)}
          .cloud-2{top:18%;animation-duration:80s;animation-delay:-20s;opacity:.18}
          .cloud-3{top:32%;animation-duration:100s;animation-delay:-40s;opacity:.15}
          .bird{position:absolute;font-size:1.2rem;opacity:.6;animation:birdFly 18s linear infinite;z-index:2}
          .bird-2{animation-delay:-6s;font-size:.9rem;opacity:.5}
          .bird-3{animation-delay:-12s;font-size:1rem;opacity:.55}
          .radar-ping{position:absolute;top:14%;left:20%;width:160px;height:160px;border-radius:50%;border:1px solid rgba(0,255,136,.2);animation:radarPing 2.8s ease-out infinite;z-index:2;pointer-events:none}
          .radar-ping::before{content:'';position:absolute;inset:25%;border-radius:50%;border:1px solid rgba(0,255,136,.3);animation:radarPing 2.8s ease-out infinite;animation-delay:.4s}
          @keyframes radarPing{0%{transform:scale(.4);opacity:.9}100%{transform:scale(1.5);opacity:0}}
          @keyframes cloudDrift{0%{left:-12%}100%{left:115%}}
          @keyframes birdFly{0%{left:-5%;top:42%}50%{top:38%}100%{left:110%;top:44%}}
          .jet-1{position:absolute;top:14%;right:-140px;animation:jetFly 14s linear infinite;z-index:2;transform:scaleX(-1)}
          .jet-1 img{width:110px;height:auto;filter:drop-shadow(0 4px 8px rgba(0,0,0,.6))}
          .jet-2{position:absolute;top:34%;right:-200px;animation:jetFly 18s linear infinite 5s;z-index:2;transform:scaleX(-1)}
          .jet-2 img{width:80px;height:auto;opacity:.75;filter:drop-shadow(0 4px 8px rgba(0,0,0,.5))}
          .jet-3{position:absolute;top:6%;left:-160px;animation:jetFlyReverse 22s linear infinite 10s;z-index:2}
          .jet-3 img{width:65px;height:auto;opacity:.6;filter:drop-shadow(0 4px 8px rgba(0,0,0,.5))}
          .heli{position:absolute;top:24%;left:8%;font-size:1.9rem;animation:heliPatrol 6s ease-in-out infinite alternate;z-index:2;filter:drop-shadow(0 4px 6px rgba(0,0,0,.4))}
          @keyframes waveMove{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
          @keyframes shipFloat{0%,100%{transform:translateY(0) rotate(0)}50%{transform:translateY(-8px) rotate(2deg)}}
          @keyframes sailAway{0%{left:-280px}100%{left:115%}}
          @keyframes jetFly{0%{right:-140px;top:14%}40%{right:115%;top:30%}100%{right:115%}}
          @keyframes jetFlyReverse{0%{left:-160px;top:6%}100%{left:115%;top:18%}}
          @keyframes heliPatrol{0%{transform:translateY(0) translateX(0) scaleX(1)}50%{transform:translateY(-15px) translateX(20px) scaleX(1)}100%{transform:translateY(5px) translateX(-10px) scaleX(-1)}}
          .menu-card{background:rgba(7,17,35,.82);padding:48px 44px;border-radius:18px;border:1px solid rgba(0,255,240,.35);box-shadow:0 0 40px rgba(0,255,240,.18), inset 0 0 60px rgba(0,255,240,.05);text-align:center;width:440px;z-index:10;backdrop-filter:blur(10px) saturate(140%)}
          .menu-title{font-family:'Orbitron',sans-serif;font-size:2.8rem;margin:6px 0 8px;letter-spacing:6px;font-weight:900;text-shadow:0 0 14px rgba(0,255,240,.4)}
          .tactical-btn{width:100%;padding:16px;margin:10px 0;font-weight:700;font-size:1rem;letter-spacing:3px;color:#fff;border:1px solid #00ff88;border-radius:6px;cursor:pointer;transition:.25s;background:linear-gradient(90deg,rgba(0,255,136,.12) 0%,rgba(0,255,136,0) 100%);font-family:'Rajdhani',sans-serif;text-transform:uppercase}
          .tactical-btn:hover{background:#00ff88;color:#020c1b;box-shadow:0 0 24px rgba(0,255,136,.55);transform:translateY(-2px)}
          .btn-multi{border-color:#00fff0;background:linear-gradient(90deg,rgba(0,255,240,.12) 0%,rgba(0,255,240,0) 100%)}
          .btn-multi:hover{background:#00fff0;color:#020c1b;box-shadow:0 0 24px rgba(0,255,240,.6)}
          .blink{animation:blink 1.4s ease-in-out infinite}
          @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
        `}</style>

        <div className="ocean-bg" />
        <div className="tactical-grid" />
        <div className="scanline" />
        <div className="radar-ping" />

        <div className="cloud">☁️</div>
        <div className="cloud cloud-2">☁️</div>
        <div className="cloud cloud-3">☁️</div>

        <div className="bird">🕊️</div>
        <div className="bird bird-2">🕊️</div>
        <div className="bird bird-3">🕊️</div>

        <div className="jet-1"><img src="/jet.gif" alt="jet" /></div>
        <div className="jet-2"><img src="/medium_jet.gif" alt="jet" /></div>
        <div className="jet-3"><img src="/small_jet.gif" alt="jet" /></div>
        <div className="heli">🚁</div>
        <div className="warship"><img src="/battleship.png" alt="warship" /></div>

        <div className="wave" />
        <div className="wave-front" />

        <button data-testid="help-button" className="help-btn" onClick={() => { sfx.playSonar(); setShowRules(true); }} title="Battle Manual">?</button>
        <button data-testid="mute-toggle-btn" onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'} style={{ position: 'absolute', top: 25, right: 85, width: 48, height: 48, borderRadius: '50%', background: 'rgba(15,32,67,.8)', border: '2px solid #00fff0', color: '#00fff0', fontSize: 18, fontWeight: 700, cursor: 'pointer', zIndex: 50, transition: '.3s' }}>
          {muted ? '🔇' : '🔊'}
        </button>

        {showRules && (
          <div className="modal-overlay" onClick={() => setShowRules(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 style={{ color: '#00fff0', margin: '0 0 20px 0', textAlign: 'center', letterSpacing: '2px', fontFamily: 'Orbitron, sans-serif' }}>⚓ BATTLE STATION MANUAL</h2>
              <div style={{ marginBottom: 25 }}>
                <h3 style={{ color: '#00ff88', borderBottom: '1px solid #00ff88', paddingBottom: 6, fontSize: '1.05rem', letterSpacing: 1 }}>🎛️ SYSTEM PROTOCOLS</h3>
                <ul style={{ paddingLeft: 20, lineHeight: 1.7, color: '#cbd5e1' }}>
                  <li><b>Fleet Placement:</b> Deploy 5 ships on a 10×10 tactical grid. Rotate ships horizontal/vertical before placing.</li>
                  <li><b>Combat Phase:</b> Hit = fire again, Miss = enemy turn.</li>
                  <li><b>Rematch:</b> Both players can request a rematch after the game ends.</li>
                </ul>
              </div>
              <div>
                <h3 style={{ color: '#38bdf8', borderBottom: '1px solid #38bdf8', paddingBottom: 6, fontSize: '1.05rem', letterSpacing: 1 }}>🚀 SPECIAL ABILITIES</h3>
                <ul style={{ listStyleType: 'none', padding: 0, lineHeight: 1.9, color: '#cbd5e1' }}>
                  <li>✈️ <b>Carrier (5):</b> Jet Strike — 3×6 area | CD 10</li>
                  <li>🔭 <b>Battleship (4):</b> Large Attack — 2×4 area | CD 6</li>
                  <li>🚤 <b>Cruiser (3):</b> Row Barrage — 2×3 area | CD 4</li>
                  <li>🌠 <b>Submarine (3):</b> Torpedo — 3×2 area | CD 4</li>
                  <li>📡 <b>Patrol Boat (2):</b> Scout Radar — 1×2 area | CD 2</li>
                </ul>
              </div>
              <div style={{ textAlign: 'center', marginTop: 28 }}>
                <button data-testid="close-rules-btn" onClick={() => setShowRules(false)} style={{ padding: '10px 30px', background: 'linear-gradient(90deg,#00fff0,#00a8ff)', border: 'none', color: '#020c1b', fontWeight: 700, borderRadius: 6, cursor: 'pointer' }}>DISMISS</button>
              </div>
            </div>
          </div>
        )}

        <div className="menu-card">
          <div style={{ fontSize: 11, color: '#00fff0', letterSpacing: 6, marginBottom: 8, fontWeight: 700 }}>TACTICAL BATTLESTATION</div>
          <h1 className="menu-title">BATTLE<span style={{ color: '#00fff0' }}>SHIP</span></h1>
          <div className="blink" style={{ color: '#94a3b8', fontSize: '.8rem', letterSpacing: 2, marginBottom: 32 }}>// SECURE CHANNEL — READY //</div>

          <button data-testid="solo-btn" className="tactical-btn" onClick={() => { sfx.playSonar(); setMode('SOLO'); setScreen('GAME'); }}>
            🎛 Solo Mode (vs Bot)
          </button>
          <button data-testid="multiplayer-btn" className="tactical-btn btn-multi" onClick={() => { sfx.playSonar(); setMode('MULTIPLAYER'); setScreen('LOBBY'); }}>
            📡 Multiplayer Lobby
          </button>

          <div style={{ marginTop: 22, fontSize: 11, color: '#4f5e7d', letterSpacing: 2 }}>FLEET COMMAND v2.0</div>
        </div>
      </div>
    );
  }

  if (screen === 'LOBBY') {
    return <Lobby onBack={() => setScreen('MENU')} />;
  }

  if (screen === 'WAITING') {
    return (
      <div data-testid="waiting-screen" style={{ position: 'relative', minHeight: '100vh', background: 'linear-gradient(180deg, #020c1b 0%, #0a1d3a 50%, #0284c7 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', overflow: 'hidden', padding: 20, fontFamily: "'Rajdhani', sans-serif" }}>
        <button data-testid="leave-room-btn" onClick={handleQuitWaitingRoom} style={{ position: 'absolute', top: 20, left: 20, padding: '10px 20px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 700, zIndex: 10 }}>
          ❌ LEAVE ROOM
        </button>

        <style>{`
          @keyframes floatHeli{0%{transform:translateY(0) rotate(0)}50%{transform:translateY(-15px) rotate(2deg)}100%{transform:translateY(0) rotate(0)}}
          @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
          @keyframes radarPing{0%{transform:scale(.7);opacity:1}100%{transform:scale(2.4);opacity:0}}
        `}</style>

        <div style={{ position: 'absolute', top: '8%', left: '7%', animation: 'floatHeli 4s ease-in-out infinite', fontSize: '3rem', opacity: .8 }}>🚁</div>
        <div style={{ position: 'absolute', top: '15%', right: '12%', animation: 'floatHeli 5s ease-in-out infinite 1s', fontSize: '2.5rem', opacity: .7 }}>🚁</div>
        <div style={{ position: 'absolute', bottom: '20%', left: '12%', animation: 'floatHeli 6s ease-in-out infinite 2s', fontSize: '2.2rem', opacity: .5 }}>🚁</div>

        <h1 style={{ fontSize: '2.8rem', margin: '0 0 6px', letterSpacing: 4, fontFamily: 'Orbitron, sans-serif', textShadow: '2px 2px 12px rgba(0,0,0,.7)', zIndex: 2 }}>⚓ BATTLE LOBBY</h1>
        <p style={{ color: '#93c5fd', marginBottom: 40, letterSpacing: 2, zIndex: 2 }}>Awaiting fleet rendezvous...</p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 50, alignItems: 'center', zIndex: 2 }}>
          <div data-testid="player1-panel" style={{ backgroundColor: 'rgba(15,32,67,.88)', padding: 30, borderRadius: 16, border: '2px solid #22c55e', width: 220, textAlign: 'center', boxShadow: '0 0 24px rgba(34,197,94,.25)' }}>
            <div style={{ fontSize: '4.5rem', marginBottom: 10 }}>🚢</div>
            <h3 style={{ margin: '10px 0 5px', fontSize: '1.4rem', letterSpacing: 1 }}>{roomData.player1 || '—'}</h3>
            <p style={{ color: '#22c55e', fontWeight: 700, margin: 0, fontSize: '.85rem', letterSpacing: 2 }}>HOST</p>
          </div>
          <h1 style={{ fontSize: '3rem', color: '#ef4444', textShadow: '0 0 14px rgba(239,68,68,.6)', fontFamily: 'Orbitron, sans-serif' }}>VS</h1>
          <div data-testid="player2-panel" style={{ position: 'relative', backgroundColor: 'rgba(15,32,67,.88)', padding: 30, borderRadius: 16, border: roomData.player2 ? '2px solid #3b82f6' : '2px dashed #64748b', width: 220, textAlign: 'center', boxShadow: roomData.player2 ? '0 0 24px rgba(59,130,246,.25)' : 'none' }}>
            {!roomData.player2 && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: 16, border: '2px solid #3b82f6', animation: 'radarPing 1.6s ease-out infinite', pointerEvents: 'none' }} />
            )}
            <div style={{ fontSize: '4.5rem', marginBottom: 10 }}>{roomData.player2 ? '🚢' : '⏳'}</div>
            <h3 style={{ margin: '10px 0 5px', fontSize: '1.4rem', color: roomData.player2 ? 'white' : '#94a3b8' }}>{roomData.player2 || 'Awaiting Enemy'}</h3>
            <p style={{ color: '#3b82f6', fontWeight: 700, margin: 0, fontSize: '.85rem', letterSpacing: 2 }}>GUEST</p>
          </div>
        </div>

        <div style={{ marginTop: 40, zIndex: 2 }}>
          {roomData.role === 'host' ? (
            <button data-testid="start-battle-btn" onClick={handleStartBattle} disabled={!roomData.player2} style={{ padding: '15px 50px', fontSize: '1.2rem', backgroundColor: roomData.player2 ? '#ef4444' : '#475569', color: 'white', border: 'none', borderRadius: 12, cursor: roomData.player2 ? 'pointer' : 'not-allowed', fontWeight: 700, letterSpacing: 3, boxShadow: roomData.player2 ? '0 0 24px rgba(239,68,68,.4)' : 'none' }}>
              START BATTLE
            </button>
          ) : (
            <div style={{ backgroundColor: 'rgba(15,23,42,.7)', padding: '12px 30px', borderRadius: 8, border: '1px solid #3b82f6' }}>
              <p style={{ color: '#3b82f6', fontWeight: 700, margin: 0, animation: 'pulse 2s infinite', letterSpacing: 2 }}>Waiting for Host to Start...</p>
            </div>
          )}
        </div>

        <div style={{ position: 'absolute', bottom: 35, left: 0, right: 0, textAlign: 'center', zIndex: 3 }}>
          <div style={{ display: 'inline-block', backgroundColor: 'rgba(15,23,42,.75)', padding: '10px 30px', borderRadius: 30, border: '1px solid rgba(255,255,255,.15)' }}>
            <span style={{ fontSize: '.95rem', color: '#94a3b8', letterSpacing: 1 }}>ROOM CODE: </span>
            <span data-testid="room-code-display" style={{ fontSize: '1.4rem', color: '#38bdf8', fontWeight: 700, letterSpacing: 4, marginLeft: 5 }}>{roomData.code}</span>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'GAME') {
    return <GameRoom mode={mode} roomData={roomData} onBack={() => { setScreen(mode === 'SOLO' ? 'MENU' : 'LOBBY'); }} />;
  }

  return null;
}

export default App;
