import React, { useState, useEffect } from 'react';
import Board from '../components/Board';
import socket from '../services/socket';

const GameRoom = ({ mode, roomData, onBack }) => {
  // --- GRIDS STATE ---
  const [myGrid, setMyGrid] = useState(Array(10).fill(null).map(() => Array(10).fill(0)));
  const [enemyGrid, setEnemyGrid] = useState(Array(10).fill(null).map(() => Array(10).fill(0)));
  const [botActualGrid, setBotActualGrid] = useState(Array(10).fill(null).map(() => Array(10).fill(0)));
  
  // --- GAME STATES ---
  const [isCombatStarted, setIsCombatStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameResult, setGameResult] = useState(""); 
  const [isMyTurn, setIsMyTurn] = useState(mode === 'SOLO' ? true : (roomData?.role === 'host'));
  const [statusMessage, setStatusMessage] = useState("PLACEMENT PHASE: Deploy your fleet, Captain!");
  const [selectedShip, setSelectedShip] = useState(null);
  const [placedShips, setPlacedShips] = useState([]);
  const [orientation, setOrientation] = useState('H');
  const [activeSkill, setActiveSkill] = useState(null);
  const [isReady, setIsReady] = useState(false);

  // --- MULTIPLAYER REMATCH STATES ---
  const [rematchStatus, setRematchStatus] = useState({ hostReady: false, guestReady: false });

  // --- FLEET HEALTH STATES ---
  const initialShips = [
    { name: "Carrier", size: 5, skillname: "Jet Strike", area: [3, 6], cooldown: 10, currentCD: 0, hp: 5, sunk: false },
    { name: "Battleship", size: 4, skillname: "Large Attack", area: [2, 4], cooldown: 6, currentCD: 0, hp: 4, sunk: false },
    { name: "Cruiser", size: 3, skillname: "Row Barrage", area: [2, 3], cooldown: 4, currentCD: 0, hp: 3, sunk: false },
    { name: "Submarine", size: 3, skillname: "Torpedo", area: [3, 2], cooldown: 4, currentCD: 0, hp: 3, sunk: false },
    { name: "Patrol Boat", size: 2, skillname: "Scout Radar", area: [1, 2], cooldown: 2, currentCD: 0, hp: 2, sunk: false }
  ];

  const [ships, setShips] = useState(JSON.parse(JSON.stringify(initialShips)));
  const [enemyShips, setEnemyShips] = useState(JSON.parse(JSON.stringify(initialShips)));
  const [botPlacedShips, setBotPlacedShips] = useState([]);

  // --- SOCKET LISTENERS (KHUSUS MULTIPLAYER) ---
  useEffect(() => {
    if (mode === 'MULTIPLAYER') {
      socket.on('enemy_ready_status', () => {
        setStatusMessage(prev => prev === "Waiting for enemy to lock formation..." ? prev : "Enemy is ready!");
      });

      socket.on('start_multiplayer_combat', () => {
        setIsCombatStarted(true);
        setStatusMessage(roomData.role === 'host' ? "YOUR TURN! Attack the enemy radar." : "ENEMY TURN! Waiting for enemy fire.");
      });

      socket.on('receive_shot', (data) => handleIncomingMultiplayerShot(data.targets));

      socket.on('update_enemy_radar', (data) => {
        console.log('received update_enemy_radar', data);
        const { hits, misses, sunkShips, allSunk } = data;

        setEnemyGrid(prev => {
          const newGrid = prev.map(row => [...row]);
          hits.forEach(cell => newGrid[cell.x][cell.y] = 3); // 3 = Hit (Red)
          misses.forEach(cell => newGrid[cell.x][cell.y] = 2); // 2 = Miss (White)
          return newGrid;
        });

        if (sunkShips.length > 0) {
          setEnemyShips(prev => prev.map(s => sunkShips.includes(s.name) ? { ...s, sunk: true, hp: 0 } : s));
          setStatusMessage(`💥 ENEMY ${sunkShips.join(', ')} SHIP(S) DESTROYED!`);
        } else {
          setStatusMessage(hits.length > 0 ? "✅ HIT! Your turn again." : "❌ MISS! Enemy turn.");
        }

        // Keep player's turn if we hit something; switch turn on miss
        if (allSunk) {
          setGameResult("WIN");
          setIsGameOver(true);
        }
        if (hits.length > 0) {
          setIsMyTurn(false);
        } else {
          setIsMyTurn(false);
        }
      });
    

      socket.on('rematch_update', (data) => {
        setRematchStatus(data);
        if (data.hostReady && data.guestReady) resetGameSession();
      });

      socket.on('force_quit_lobby', () => {
        alert("The enemy has abandoned the battle. Returning to Lobby.");
        onBack();
      });

      return () => {
        socket.off('enemy_ready_status'); socket.off('start_multiplayer_combat');
        socket.off('receive_shot'); socket.off('update_enemy_radar');
        socket.off('rematch_update'); socket.off('force_quit_lobby');
      };
    }
  }, [mode, myGrid, ships, roomData]);

  // === TAMBAHKAN LISTENER INI UNTUK MERESET GAME ===
    socket.on('init_placement', () => {
      // 1. Bersihkan susunan papan grid kita dan musuh kembali jadi air (0)
      setMyGrid(Array(10).fill(null).map(() => Array(10).fill(0)));
      setEnemyGrid(Array(10).fill(null).map(() => Array(10).fill(0)));
      setBotActualGrid(Array(10).fill(null).map(() => Array(10).fill(0)));

      // 2. Reset semua status gameplay ke kondisi awal sebelum bertempur
      setIsCombatStarted(false);
      setIsGameOver(false);
      setGameResult("");
      setIsReady(false);
      setPlacedShips([]);
      setSelectedShip(null);
      setActiveSkill(null);
      setStatusMessage("PLACEMENT PHASE: Susun armada Anda, Kapten!");
      
      // Tentukan siapa yang jalan duluan (Host otomatis jalan duluan)
      setIsMyTurn(mode === 'SOLO' ? true : (roomData?.role === 'host'));

      // 3. Reset array data kapal ke kondisi awal (Sesuaikan properti ini dengan inisialisasi awal kodemu)
      setShips([
        { name: "Carrier", size: 5, skillname: "Jet Strike", area: [3, 3], cooldown: 5, currentCD: 0, hp: 5, sunk: false },
        { name: "Battleship", size: 4, skillname: "Artillery Barrage", area: [1, 4], cooldown: 4, currentCD: 0, hp: 4, sunk: false },
        { name: "Cruiser", size: 3, skillname: "Sonar Pulse", area: [3, 1], cooldown: 3, currentCD: 0, hp: 3, sunk: false },
        { name: "Submarine", size: 3, skillname: "Torpedo Launch", area: [1, 3], cooldown: 3, currentCD: 0, hp: 3, sunk: false },
        { name: "Destroyer", size: 2, skillname: "Flak Cannon", area: [2, 2], cooldown: 2, currentCD: 0, hp: 2, sunk: false }
      ]);

      // 4. Bersihkan status tombol penanda rematch lokal
      setRematchStatus({ hostReady: false, guestReady: false });
    });

  // --- BOT GENERATOR (KHUSUS SOLO) ---
  useEffect(() => {
    if (mode === 'SOLO') generateBotBoard();
  }, [mode]);

  const generateBotBoard = () => {
    const newBotGrid = Array(10).fill(null).map(() => Array(10).fill(0));
    const generatedPlacements = [];
    enemyShips.forEach(ship => {
      let placed = false;
      while (!placed) {
        const orient = Math.random() > 0.5 ? 'H' : 'V';
        const x = Math.floor(Math.random() * 10);
        const y = Math.floor(Math.random() * 10);
        let canPlace = true;
        for (let i = 0; i < ship.size; i++) {
          const r = orient === 'H' ? x : x + i;
          const c = orient === 'H' ? y + i : y;
          if (r >= 10 || c >= 10 || newBotGrid[r][c] !== 0) { canPlace = false; break; }
        }
        if (canPlace) {
          for (let i = 0; i < ship.size; i++) {
            newBotGrid[orient === 'H' ? x : x + i][orient === 'H' ? y + i : y] = 1;
          }
          generatedPlacements.push({ name: ship.name, x, y, orientation: orient });
          placed = true;
        }
      }
    });
    setBotActualGrid(newBotGrid);
    setBotPlacedShips(generatedPlacements);
  };

  // --- FLEET PLACEMENT ---
  const handlePlaceShip = (x, y) => {
    if (!selectedShip || isReady) return;
    if (placedShips.some(p => p.name === selectedShip.name)) return;

    const newGrid = myGrid.map(row => [...row]);
    for (let i = 0; i < selectedShip.size; i++) {
      const r = orientation === 'H' ? x : x + i;
      const c = orientation === 'H' ? y + i : y;
      if (r >= 10 || c >= 10 || newGrid[r][c] !== 0) return;
    }
    for (let i = 0; i < selectedShip.size; i++) {
      newGrid[orientation === 'H' ? x : x + i][orientation === 'H' ? y + i : y] = selectedShip.name;
    }
    setMyGrid(newGrid);
    setPlacedShips(prev => [...prev, { name: selectedShip.name, x, y, orientation }]);
    // mark ship as placed in ships state so UI (cards) reflect deployment
    setShips(prev => prev.map(s => s.name === selectedShip.name ? { ...s, placed: true } : s));
    setSelectedShip(null);
  };

  const handleStartCombat = () => {
    if (placedShips.length < 5) {
      alert("Deploy 5 ships first!"); return;
    }
    setIsReady(true);
    if (mode === 'SOLO') {
      setIsCombatStarted(true);
      setStatusMessage("COMBAT STARTED: Your turn to attack, Captain!");
    } else {
      setStatusMessage("Waiting for enemy to lock formation...");
      socket.emit('player_ready_combat', { room_code: roomData.code });
    }
  };

  // --- COMBAT LOGIC ---
  const reduceCooldowns = () => setShips(prev => prev.map(s => s.currentCD > 0 ? { ...s, currentCD: s.currentCD - 1 } : s));

  const handleRadarClick = (x, y) => {
    console.log('handleRadarClick called', { isCombatStarted, isGameOver, isMyTurn, x, y, currentVal: enemyGrid[x] && enemyGrid[x][y] });
    if (!isCombatStarted || isGameOver || !isMyTurn || enemyGrid[x][y] !== 0) return;

    let targetCells = [{ x, y }];
    if (activeSkill) {
      const shipInfo = ships.find(s => s.name === activeSkill.name);
      if (shipInfo.currentCD > 0 || shipInfo.sunk) return;

      targetCells = [];
      const [rangeX, rangeY] = activeSkill.area;
      for (let i = 0; i < rangeX; i++) {
        for (let j = 0; j < rangeY; j++) {
          if (x + i < 10 && y + j < 10) targetCells.push({ x: x + i, y: y + j });
        }
      }
      setShips(prev => prev.map(s => s.name === activeSkill.name ? { ...s, currentCD: s.cooldown } : s));
      setActiveSkill(null);
    }

    if (mode === 'SOLO') executeSoloAttack(targetCells);
    else {
      console.log('emitting fire_shot', { room_code: roomData.code, targets: targetCells });
      socket.emit('fire_shot', { room_code: roomData.code, targets: targetCells });
    }
  };

  // -- SOLO LOGIC --
  const executeSoloAttack = (cells) => {
    let hitAny = false;
    let localEnemyGrid = [...enemyGrid.map(r => [...r])];
    let localEnemyShips = [...enemyShips];
    let sunkThisTurn = [];

    cells.forEach(cell => {
      const { x, y } = cell;
      if (localEnemyGrid[x][y] !== 0) return;
      if (botActualGrid[x][y] === 1) {
        localEnemyGrid[x][y] = 3; // Hit
        hitAny = true;
        // Simulasi damage ke bot
        const hitShipPlacement = botPlacedShips.find(p => {
          const s = enemyShips.find(es => es.name === p.name);
          for(let i=0; i<s.size; i++) {
            let cx = p.orientation === 'H' ? p.x : p.x + i;
            let cy = p.orientation === 'H' ? p.y + i : p.y;
            if(cx === x && cy === y) return true;
          }
          return false;
        });
        if (hitShipPlacement) {
          const sIdx = localEnemyShips.findIndex(s => s.name === hitShipPlacement.name);
          localEnemyShips[sIdx].hp -= 1;
          if (localEnemyShips[sIdx].hp <= 0 && !localEnemyShips[sIdx].sunk) {
            localEnemyShips[sIdx].sunk = true;
            sunkThisTurn.push(localEnemyShips[sIdx].name);
          }
        }
      } else {
        localEnemyGrid[x][y] = 2; // Miss
      }
    });

    setEnemyGrid(localEnemyGrid);
    setEnemyShips(localEnemyShips);
    reduceCooldowns();

    if (localEnemyShips.every(s => s.sunk)) {
      setGameResult("WIN"); setIsGameOver(true);
      setStatusMessage("VICTORY! The bot fleet has been destroyed."); return;
    }

    if (hitAny) {
      setStatusMessage(sunkThisTurn.length > 0 ? `BOOM! ${sunkThisTurn.join(', ')} destroyed!` : "Hit! Fire again.");
   } else {
  // Siapa pun yang ditembak, sekarang giliran kamu yang membalas!
  setIsMyTurn(true);
  setStatusMessage(hits.length > 0 ? "DANGER! Our ship just took a hit! Your turn to attack." : "Enemy missed! Your turn to attack.");
    }
  };

  const executeBotTurn = () => {
    let localMyGrid = [...myGrid.map(r => [...r])];
    let localShips = [...ships];
    let hitAny = false;

    while (true) {
      let bx = Math.floor(Math.random() * 10), by = Math.floor(Math.random() * 10);
      if (localMyGrid[bx][by] !== 2 && localMyGrid[bx][by] !== 3) {
        const targetName = localMyGrid[bx][by];
        if (typeof targetName === 'string') {
          localMyGrid[bx][by] = 3; hitAny = true;
          const sIdx = localShips.findIndex(s => s.name === targetName);
          localShips[sIdx].hp -= 1;
          if (localShips[sIdx].hp <= 0) localShips[sIdx].sunk = true;
        } else {
          localMyGrid[bx][by] = 2;
        }
        break;
      }
    }

    setMyGrid(localMyGrid);
    setShips(localShips);

    if (localShips.every(s => s.sunk)) {
      setGameResult("LOSE"); setIsGameOver(true); return;
    }

    // Bot hanya menembak 1 kali, lalu giliran selalu kembali ke kamu
    setIsMyTurn(true);
    if (hitAny) {
      setStatusMessage("Bot hit our ship! Your turn to attack.");
    } else {
      setStatusMessage("Bot missed! Your turn.");
    }
  };

  // -- MULTIPLAYER INCOMING ATTACK LOGIC --
  const handleIncomingMultiplayerShot = (targets) => {
    let localMyGrid = myGrid.map(row => [...row]);
    let localShips = [...ships];
    let hits = [], misses = [], sunkShips = [];

    targets.forEach(cell => {
      const { x, y } = cell;
      const targetVal = localMyGrid[x][y];
      
      if (typeof targetVal === 'string') {
        localMyGrid[x][y] = 3; hits.push({x, y});
        const sIdx = localShips.findIndex(s => s.name === targetVal);
        if (sIdx !== -1) {
          localShips[sIdx].hp -= 1;
          if (localShips[sIdx].hp <= 0 && !localShips[sIdx].sunk) {
            localShips[sIdx].sunk = true;
            sunkShips.push(targetVal);
          }
        }
      } else if (targetVal === 0) {
        localMyGrid[x][y] = 2; misses.push({x, y});
      }
    });

    setMyGrid(localMyGrid);
    setShips(localShips);
    reduceCooldowns();

    const isAllSunk = localShips.every(s => s.sunk);
    console.log('sending shot_result_report', { room_code: roomData.code, hits, misses, sunkShips, allSunk: isAllSunk });
    socket.emit('shot_result_report', { room_code: roomData.code, hits, misses, sunkShips, allSunk: isAllSunk });

    if (isAllSunk) {
      setGameResult("LOSE"); setIsGameOver(true);
    } else {
  // Siapa pun yang ditembak, sekarang giliran kamu yang membalas!
  setIsMyTurn(true);
  setStatusMessage(hits.length > 0 ? "DANGER! Our ship just took a hit! Your turn to attack." : "Enemy missed! Your turn to attack.");
}
  };
  // --- ACTIONS ---
  const handlePlayAgain = () => {
    if (mode === 'SOLO') resetGameSession();
    else socket.emit('request_rematch', { room_code: roomData.code, role: roomData.role });
  };

  const resetGameSession = () => {
    setMyGrid(Array(10).fill(null).map(() => Array(10).fill(0)));
    setEnemyGrid(Array(10).fill(null).map(() => Array(10).fill(0)));
    setIsCombatStarted(false); setIsGameOver(false); setGameResult("");
    setIsReady(false); setPlacedShips([]); setSelectedShip(null); setActiveSkill(null);
    setRematchStatus({ hostReady: false, guestReady: false });
    setIsMyTurn(mode === 'SOLO' ? true : (roomData?.role === 'host'));
    setStatusMessage("Fleet reset. Rebuild your formation.");
    setShips(JSON.parse(JSON.stringify(initialShips)));
    setEnemyShips(JSON.parse(JSON.stringify(initialShips)));
    if (mode === 'SOLO') generateBotBoard();
  };

  const handleQuit = () => {
    if (mode === 'MULTIPLAYER') socket.emit('player_quit_room', { room_code: roomData.code });
    onBack();
  };

  // --- STYLES & RENDERING ---
  const renderPanel = (fleet, isEnemy) => (
    <div style={{ backgroundColor: '#1e293b', padding: '15px', borderRadius: '8px', border: '1px solid #334155', width: '220px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h4 style={{ margin: '0 0 5px 0', borderBottom: '1px solid #475569', paddingBottom: '8px', color: isEnemy ? '#ef4444' : '#3b82f6' }}>
        {isEnemy ? '📡 ENEMY INTEL' : '🛡️ MY FLEET'}
      </h4>
      {fleet.map((ship, idx) => {
        const isSunk = ship.sunk;
        const isSkillActive = activeSkill?.name === ship.name;
        // Color logic for ships that are sunk: maroon red
        const bgColor = isSunk ? '#7f1d1d' : isSkillActive ? '#0284c7' : '#0f172a';
        const borderColor = isSunk ? '#dc2626' : isSkillActive ? '#38bdf8' : '#334155';

        return (
          <div key={idx} style={{ padding: '10px', borderRadius: '6px', backgroundColor: bgColor, border: `1px solid ${borderColor}`, transition: '0.3s', opacity: isSkillActive ? 0.8 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginBottom: '5px' }}>
              <span>{ship.name.toUpperCase()}</span>
              <span style={{ color: isSunk ? '#fca5a5' : '#fff' }}>{isSunk ? "💥 SUNK!" : `HP: ${ship.hp}/${ship.size}`}</span>
            </div>
            
            {/* Skill button only for our fleet when in combat and it is our turn */}
            {!isEnemy && isCombatStarted && !isSunk && (
              <button
                disabled={!isMyTurn || ship.currentCD > 0}
                onClick={() => setActiveSkill(isSkillActive ? null : ship)}
                style={{
                  width: '100%', padding: '8px', fontSize: '10px', fontWeight: 'bold', borderRadius: '4px', border: 'none',
                  backgroundColor: ship.currentCD > 0 ? '#6b7280' : isSkillActive ? '#f59e0b' : '#2563eb',
                  color: 'white', 
                  cursor: (!isMyTurn || ship.currentCD > 0) ? 'not-allowed' : 'pointer',
                  opacity: !isMyTurn ? 0.6 : 1,
                  transform: isSkillActive ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.2s'
                }}
              >
                {isSkillActive ? "❌ CANCEL" : ship.currentCD > 0 ? `⏳ CD: ${ship.currentCD}` : `⚡ SKILL`}
              </button>
            )}

            {/* Enemy skill status indicator & turn info */}
            {isEnemy && isCombatStarted && !isSunk && (
               <div style={{ fontSize: '9px', color: ship.currentCD > 0 ? '#f59e0b' : '#22c55e', fontWeight: 'bold' }}>
                 {ship.currentCD > 0 ? `⏳ CD: ${ship.currentCD}` : `⚡ READY`}
               </div>
            )}
          </div>
        );
      })}
      
      {/* Turn Indicator */}
      {isCombatStarted && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          backgroundColor: isEnemy ? '#1f2937' : (isMyTurn ? '#065f46' : '#7c2d12'),
          borderRadius: '6px',
          border: `2px solid ${isEnemy ? '#6b7280' : (isMyTurn ? '#10b981' : '#f97316')}`,
          textAlign: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          color: isEnemy ? '#e5e7eb' : (isMyTurn ? '#86efac' : '#fed7aa')
        }}>
          {isEnemy ? '⏸️ ENEMY TURN' : (isMyTurn ? '▶️ YOUR TURN' : '⏸️ WAITING')}
        </div>
      )}
    </div>
  );

  const toggleOrientation = () => setOrientation(o => o === 'H' ? 'V' : 'H');

  const handleSelectSkill = (ship) => {
    if (!isCombatStarted || !isMyTurn || ship.currentCD > 0 || ship.sunk) return;
    setActiveSkill(prev => prev?.name === ship.name ? null : ship);
  };

  const selectShipType = (ship) => {
    if (isReady) return;
    if (placedShips.some(p => p.name === ship.name)) return;
    setSelectedShip(ship);
  };

  const handleReady = () => handleStartCombat();

  const rotateBtnStyle = {
    width: '100%',
    padding: '10px',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '12px'
  };

  const readyBtnStyle = {
    width: '100%',
    padding: '12px',
    marginTop: '10px',
    backgroundColor: isReady ? '#475569' : '#22c55e',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: isReady ? 'not-allowed' : 'pointer'
  };

  const shipItemStyle = (ship, isPlaced) => ({
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px',
    borderRadius: '6px',
    // Fade when selected (being placed), green when deployed
    backgroundColor: isPlaced ? '#065f46' : (selectedShip?.name === ship.name ? '#0f172a' : '#111827'),
    border: '1px solid #334155',
    color: '#fff',
    cursor: isPlaced || isReady ? 'not-allowed' : 'pointer',
    opacity: selectedShip?.name === ship.name && !isPlaced ? 0.5 : 1,
    fontSize: '12px',
    fontWeight: 'bold'
  });

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: 'white', padding: '20px', fontFamily: 'Arial' }}>
      <button onClick={handleQuit} style={{ position: 'absolute', top: 20, left: 20, padding: '8px 15px', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>← QUIT</button>
      
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ color: '#00f2fe', margin: '0 0 10px 0' }}>BATTLESHIP HARBOR</h2>
        <div style={{ backgroundColor: '#1e293b', padding: '12px 25px', borderRadius: '20px', display: 'inline-block', border: '1px solid #334155', fontWeight: 'bold', color: isMyTurn && isCombatStarted ? '#4ade80' : '#cbd5e1' }}>
          {statusMessage}
        </div>
      </div>

{/* ================= MAIN MAP & PANEL CONTAINER ================= */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap', marginTop: '20px' }}>
        
        {/* 1. LEFT INTERACTIVE PANEL: TACTICAL COMMANDS (Only appears during combat) */}
        {isCombatStarted && (
          <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '10px', width: '250px', border: '1px solid #ef4444' }}>
            <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', color: '#ef4444', fontSize: '16px' }}>🚀 TACTICAL COMMANDS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ships.map((s, idx) => (
                <div key={idx} style={{ backgroundColor: activeSkill?.name === s.skillname ? '#3b82f6' : '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px' }}>
                    <span>{s.name.toUpperCase()}</span>
                    <span style={{ color: s.sunk ? '#ef4444' : '#22c55e' }}>{s.sunk ? 'SUNK' : `HP: ${s.hp}/${s.size}`}</span>
                  </div>
                  {!s.sunk && (
                    <button
                      disabled={s.currentCD > 0 || !isMyTurn}
                      onClick={() => handleSelectSkill(s)}
                      style={{ width: '100%', marginTop: '5px', padding: '5px', backgroundColor: s.currentCD > 0 ? '#475569' : '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                    >
                      {s.skillname} {s.currentCD > 0 ? `(CD: ${s.currentCD})` : ''}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. LEFT MAP: ENEMY RADAR (Only appears during combat) */}
        {isCombatStarted && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h4 style={{ color: '#ef4444', marginBottom: '10px' }}>🎯 ENEMY RADAR</h4>
            <Board grid={enemyGrid} onCellClick={handleRadarClick} isOpponent={true} activeSkill={activeSkill} />
          </div>
        )}

        {/* 3. RIGHT MAP: OUR FLEET BOARD */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h4 style={{ color: '#3b82f6', marginBottom: '10px' }}>🛡️ MY NAVAL MAP</h4>
          <Board 
            grid={myGrid} 
            onCellClick={(x, y) => !isCombatStarted && handlePlaceShip(x, y)} 
            isOpponent={false} 
            selectedShip={!isCombatStarted ? selectedShip : null} 
            orientation={orientation} 
          />
        </div>

        {/* 4. RIGHT PANEL: FLEET SETUP (Before Combat) OR OUR FLEET STATUS (During Combat) */}
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '10px', width: '250px', border: '1px solid #3b82f6' }}>
          {!isCombatStarted ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h3 style={{ margin: 0, textAlign: 'center', color: '#f59e0b', fontSize: '16px' }}>🚢 FLEET SETUP</h3>
              <button onClick={toggleOrientation} style={rotateBtnStyle}>
                🔄 ORIENTATION: {orientation === 'H' ? 'HORIZONTAL' : 'VERTICAL'}
              </button>
              <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {ships.map((s, idx) => {
                  const isPlaced = placedShips.some(p => p.name === s.name);
                  return (
                    <div key={idx} onClick={() => selectShipType(s)} style={shipItemStyle(s, isPlaced)}>
                      <span>{s.name.toUpperCase()} ({s.size} sq)</span>
                      <span>{isPlaced ? "DEPLOYED" : "READY"}</span>
                    </div>
                  );
                })}
              </div>
              <button onClick={handleReady} disabled={isReady} style={readyBtnStyle}>
                {isReady ? "LOCKING CODES..." : "LOCK FLEET FORMATION"}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h3 style={{ margin: 0, textAlign: 'center', color: '#3b82f6', fontSize: '16px' }}>🛡️ MY FLEET STATUS</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {ships.map((s, idx) => {
                  const bg = s.sunk ? '#7f1d1d' : '#0f172a';
                  const border = s.sunk ? '#dc2626' : '#334155';
                  return (
                    <div key={idx} style={{ backgroundColor: bg, padding: '10px', borderRadius: '6px', border: `1px solid ${border}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px' }}>
                        <span>{s.name.toUpperCase()}</span>
                        <span style={{ color: s.sunk ? '#fca5a5' : '#22c55e' }}>{s.sunk ? 'SUNK' : `HP: ${s.hp}/${s.size}`}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* POP-UP MODAL OVERLAY (As described in Point 4) */}
      {isGameOver && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.9)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#1e293b', padding: '40px', borderRadius: '12px', textAlign: 'center', border: gameResult === "WIN" ? '3px solid #22c55e' : '3px solid #ef4444' }}>
            <h1 style={{ fontSize: '32px', margin: '0 0 10px 0', color: gameResult === "WIN" ? '#22c55e' : '#ef4444' }}>
              {gameResult === "WIN" ? "🎉 VICTORY CAPTAIN!" : "💀 DEFEAT CAPTAIN!"}
            </h1>
            <h3 style={{ color: '#fff', marginBottom: '25px' }}>Wanna play again? Or quit and back to lobby again?</h3>
            
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <button onClick={handlePlayAgain} style={{ padding: '12px 24px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                🔄 PLAY AGAIN
              </button>
              <button onClick={handleQuit} style={{ padding: '12px 24px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>
                🏠 QUIT TO LOBBY
              </button>
            </div>

            {/* Waiting indicator for the other player */}
            {mode === 'MULTIPLAYER' && (
              <p style={{ marginTop: '20px', color: '#f59e0b', fontSize: '13px', fontStyle: 'italic', height: '20px' }}>
                {roomData?.role === 'host' && rematchStatus.hostReady && !rematchStatus.guestReady ? "⚠️ Player 1 waiting below card play again..." : ""}
                {roomData?.role === 'guest' && rematchStatus.guestReady && !rematchStatus.hostReady ? "⚠️ Waiting for Host to play again..." : ""}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoom;