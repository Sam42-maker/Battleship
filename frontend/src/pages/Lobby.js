import React, { useState } from 'react';
import socket from '../services/socket';

const Lobby = ({ onBack }) => {
    const [name, setName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleJoinCreate = () => {
        if (!name.trim() || !roomCode.trim()) {
            alert("Captain name and Room Code cannot be empty!");
            return;
        }
        setIsLoading(true);
        // Send request to backend to create/join room
        socket.emit('create_or_join_room', { 
            name: name, 
            room_code: roomCode 
        });
        
        // Reset loading if no response in 3 seconds (guard against error/lag)
        setTimeout(() => setIsLoading(false), 3000); 
    };

        return (
        <div className="lobby-universe" style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020c1b', color: 'white', overflow: 'hidden' }}>
            
            {/* INJECT LOBBY REFACTOR STYLE WITHOUT BREAKING BUTTONS */}
            <style>{`
                .lobby-bg-core { position: absolute; inset: 0; background: radial-gradient(circle at center, #0a192f 0%, #020c1b 100%); z-index: 0; }
                .lobby-radar-grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(0, 255, 240, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 240, 0.02) 1px, transparent 1px); background-size: 50px 50px; background-position: center; z-index: 1; }
                
                /* Battle background animation */
                .lobby-jet { position: absolute; top: 20%; left: -100px; font-size: 2.2rem; animation: jetFlyRight 18s linear infinite; z-index: 2; }
                .lobby-heli { position: absolute; top: 10%; right: 15%; font-size: 1.7rem; animation: heliFloatLobby 5s ease-in-out infinite alternate; }
                .lobby-carrier { position: absolute; bottom: 30px; right: -200px; font-size: 3.5rem; animation: carrierSail 30s linear infinite; z-index: 3; filter: brightness(0.6); }

                /* Dynamic water layers */
                .lobby-wave { position: absolute; bottom: 0; left: 0; width: 200%; height: 90px; background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,42.4V120H0Z" fill="%230b2240" opacity="0.4"/></svg>') repeat-x; animation: waveLobby 15s linear infinite; z-index: 2; }

                @keyframes waveLobby { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                @keyframes jetFlyRight { 0% { left: -100px; top: 20%; } 40% { left: 110%; top: 10%; } 100% { left: 110%; } }
                @keyframes heliFloatLobby { 0% { transform: translateY(0) rotate(0deg); } 100% { transform: translateY(-20px) rotate(-5deg); } }
                @keyframes carrierSail { 0% { right: -200px; } 100% { right: 110%; } }

                /* Main center card sized for desktop, per design reference */
                .central-lobby-card {
                    background: rgba(11, 22, 44, 0.9);
                    border: 2px solid #22c55e;
                    box-shadow: 0 0 30px rgba(34, 197, 94, 0.15);
                    padding: 45px;
                    border-radius: 16px;
                    width: 450px;
                    max-width: 90%;
                    text-align: center;
                    z-index: 10;
                    backdrop-filter: blur(10px);
                }
                .input-box {
                    width: 100%; padding: 14px; border-radius: 8px; border: 1px solid #334155;
                    background-color: #071124; color: white; font-size: 1rem;
                    text-align: center; font-weight: bold; transition: 0.3s;
                }
                .input-box:focus {
                    border-color: #22c55e; outline: none; box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
                }
                .lobby-action-btn {
                    width: 100%; padding: 16px; border: none; border-radius: 8px;
                    font-weight: bold; font-size: 1.1rem; cursor: pointer; transition: 0.3s;
                    letter-spacing: 1px; margin-bottom: 15px;
                }
            `}</style>

            {/* Animation components */}
            <div className="lobby-bg-core"></div>
            <div className="lobby-radar-grid"></div>
            <div className="lobby-jet">✈️ 💥</div>
            <div className="lobby-heli">🚁</div>
            <div className="lobby-carrier">🚢</div>
            <div className="lobby-wave"></div>

            {/* Main center card */}
            <div className="central-lobby-card">
                <div style={{ fontSize: '11px', color: '#22c55e', letterSpacing: '3px', marginBottom: '10px', fontWeight: 'bold' }}>HQ MULTIPLAYER LINK</div>
                <h1 style={{ fontSize: '2.2rem', margin: '0 0 10px 0', letterSpacing: '1px', fontWeight: '800' }}>MULTIPLAYER LOBBY</h1>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '35px' }}>Link your radar coordinates with your allied or enemy fleet.</p>
                
                {/* NAME INPUT FIELD */}
                <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '1px' }}>CAPTAIN NAME :</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value.toUpperCase())}
                        placeholder="e.g. JACK SPARROW"
                        maxLength={15}
                        className="input-box"
                    />
                </div>

                {/* ROOM CODE INPUT FIELD */}
                <div style={{ marginBottom: '35px', textAlign: 'left' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#94a3b8', letterSpacing: '1px' }}>COMBAT ROOM CODE :</label>
                    <input 
                        type="text" 
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        placeholder="e.g. ALPHA123"
                        maxLength={8}
                        className="input-box"
                        style={{ letterSpacing: '3px', color: '#22c55e' }}
                    />
                </div>

                {/* BUTTONS (Preserve original logic integration) */}
                <button 
                    onClick={handleJoinCreate}
                    disabled={isLoading}
                    className="lobby-action-btn"
                    style={{ 
                        backgroundColor: isLoading ? '#334155' : '#22c55e', 
                        color: 'white',
                        boxShadow: isLoading ? 'none' : '0 4px 15px rgba(34, 197, 94, 0.4)'
                    }}
                >
                    {isLoading ? '📡 ESTABLISHING LINK...' : '⚔️ JOIN / CREATE ROOM'}
                </button>

                <button 
                    onClick={onBack}
                    className="lobby-action-btn"
                    style={{ backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #ef4444' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                >
                    RETURN TO HQ
                </button>
            </div>
        </div>
    );
};

export default Lobby;