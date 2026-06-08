import React, { useState, useEffect, useRef, useCallback } from 'react';
import Board from '../components/Board';
import socket from '../services/socket';
import sfx from '../services/sound';

const INITIAL_SHIPS = [
  { name: 'Carrier',     size: 5, skillname: 'Jet Strike',    area: [3, 6], cooldown: 10, currentCD: 0, hp: 5, sunk: false },
  { name: 'Battleship',  size: 4, skillname: 'Large Attack',  area: [2, 4], cooldown: 6,  currentCD: 0, hp: 4, sunk: false },
  { name: 'Cruiser',     size: 3, skillname: 'Row Barrage',   area: [2, 3], cooldown: 4,  currentCD: 0, hp: 3, sunk: false },
  { name: 'Submarine',   size: 3, skillname: 'Torpedo',       area: [3, 2], cooldown: 4,  currentCD: 0, hp: 3, sunk: false },
  { name: 'Patrol Boat', size: 2, skillname: 'Scout Radar',   area: [1, 2], cooldown: 2,  currentCD: 0, hp: 2, sunk: false },
];

const cloneShips = () => JSON.parse(JSON.stringify(INITIAL_SHIPS));
const emptyGrid = () => Array(10).fill(null).map(() => Array(10).fill(0));

const GameRoom = ({ mode, roomData, onBack }) => {
  // GRIDS
  const [myGrid, setMyGrid] = useState(emptyGrid());
  const [enemyGrid, setEnemyGrid] = useState(emptyGrid());
  const botActualGridRef = useRef(emptyGrid());
  const botPlacedShipsRef = useRef([]);

  // GAME STATE
  const [isCombatStarted, setIsCombatStarted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameResult, setGameResult] = useState('');
  const [isMyTurn, setIsMyTurn] = useState(mode === 'SOLO' ? true : roomData?.role === 'host');
  const [statusMessage, setStatusMessage] = useState('PLACEMENT PHASE: Deploy your fleet, Captain!');
  const [selectedShip, setSelectedShip] = useState(null);
  const [placedShips, setPlacedShips] = useState([]);
  const [orientation, setOrientation] = useState('H');
  const [activeSkill, setActiveSkill] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const [rematchStatus, setRematchStatus] = useState({ hostReady: false, guestReady: false });
  const [isShaking, setIsShaking] = useState(false);
  const [visualFx, setVisualFx] = useState(null);
  const [jetType, setJetType] = useState(null);
  const [showVictoryEffect, setShowVictoryEffect] = useState(false);

  const [ships, setShips] = useState(cloneShips());
  const [enemyShips, setEnemyShips] = useState(cloneShips());

  // Refs to always read current values inside socket callbacks
  const stateRef = useRef({ myGrid, ships });
  useEffect(() => { stateRef.current = { myGrid, ships }; }, [myGrid, ships]);

  // ---------- helpers ----------
  const triggerJetStrike = (type = 'big') => {
    setJetType(type);
    sfx.playCannon();
    setTimeout(() => setJetType(null), 1500);
  };

  const triggerCombatFx = (type) => {
    setVisualFx(type);
    if (type === 'HIT') sfx.playExplosion();
    else if (type === 'MISS') sfx.playSplash();
    else if (type === 'DANGER') { sfx.playExplosion(); sfx.playAlarm(); }
    if (type === 'HIT' || type === 'DANGER') {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
    setTimeout(() => setVisualFx(null), 1200);
  };

  const reduceCooldowns = useCallback(() => {
    setShips((prev) => prev.map((s) => (s.currentCD > 0 ? { ...s, currentCD: s.currentCD - 1 } : s)));
  }, []);

  // ---------- BOT ----------
  const generateBotBoard = useCallback(() => {
    const grid = emptyGrid();
    const placements = [];
    INITIAL_SHIPS.forEach((ship) => {
      let placed = false;
      while (!placed) {
        const orient = Math.random() > 0.5 ? 'H' : 'V';
        const x = Math.floor(Math.random() * 10);
        const y = Math.floor(Math.random() * 10);
        let canPlace = true;
        for (let i = 0; i < ship.size; i++) {
          const r = orient === 'H' ? x : x + i;
          const c = orient === 'H' ? y + i : y;
          if (r >= 10 || c >= 10 || grid[r][c] !== 0) { canPlace = false; break; }
        }
        if (canPlace) {
          for (let i = 0; i < ship.size; i++) {
            const r = orient === 'H' ? x : x + i;
            const c = orient === 'H' ? y + i : y;
            grid[r][c] = ship.name;
          }
          placements.push({ name: ship.name, size: ship.size, x, y, orientation: orient });
          placed = true;
        }
      }
    });
    botActualGridRef.current = grid;
    botPlacedShipsRef.current = placements;
  }, []);

  useEffect(() => {
    if (mode === 'SOLO') generateBotBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // ---------- Solo: execute player attack ----------
  const executeSoloAttack = useCallback((cells) => {
    setEnemyGrid((prevGrid) => {
      const grid = prevGrid.map((row) => [...row]);
      let hitAny = false;
      let sunkThisTurn = [];

      // Apply damage to enemyShips immutably
      setEnemyShips((prevShips) => {
        const updated = prevShips.map((s) => ({ ...s }));
        cells.forEach(({ x, y }) => {
          if (grid[x][y] !== 0) return;
          const target = botActualGridRef.current[x][y];
          if (target && target !== 0) {
            grid[x][y] = 3;
            hitAny = true;
            const idx = updated.findIndex((s) => s.name === target);
            if (idx !== -1) {
              updated[idx].hp -= 1;
              if (updated[idx].hp <= 0 && !updated[idx].sunk) {
                updated[idx].sunk = true;
                sunkThisTurn.push(updated[idx].name);
              }
            }
          } else {
            grid[x][y] = 2;
          }
        });

        // Animations + status
        triggerJetStrike('big');
        if (hitAny) {
          setTimeout(() => triggerCombatFx('HIT'), 700);
          setStatusMessage(sunkThisTurn.length > 0
            ? `💥 BOOM! ${sunkThisTurn.join(', ')} DESTROYED!`
            : '🎯 HIT! Fire again, Captain!');
        } else {
          setTimeout(() => triggerCombatFx('MISS'), 700);
          setStatusMessage('🌊 Splash! Bot turn incoming...');
        }

        // Check win
        if (updated.every((s) => s.sunk)) {
          setGameResult('WIN');
          setShowVictoryEffect(true);
          sfx.playVictory();
          setTimeout(() => setIsGameOver(true), 1200);
          setStatusMessage('VICTORY! Bot fleet destroyed.');
          return updated;
        }

        // Turn switching: hit → still our turn; miss → bot turn
        if (!hitAny) {
          setIsMyTurn(false);
          // Schedule bot turn
          setTimeout(() => executeBotTurn(), 1800);
        }
        return updated;
      });

      return grid;
    });

    reduceCooldowns();
  }, [reduceCooldowns]);

  // ---------- Bot turn ----------
  const executeBotTurn = useCallback(() => {
    // Use ref to read current state since this is called via setTimeout
    const currentGrid = stateRef.current.myGrid;
    const currentShips = stateRef.current.ships;

    const grid = currentGrid.map((row) => [...row]);
    const updatedShips = currentShips.map((s) => ({ ...s }));

    // Smart bot: 60% chance to target adjacent unhit cells of an existing hit
    let target = null;
    const hitCells = [];
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) if (grid[r][c] === 3) hitCells.push([r, c]);

    if (hitCells.length && Math.random() < 0.6) {
      const [hr, hc] = hitCells[Math.floor(Math.random() * hitCells.length)];
      const candidates = [
        [hr - 1, hc], [hr + 1, hc], [hr, hc - 1], [hr, hc + 1],
      ].filter(([r, c]) => r >= 0 && r < 10 && c >= 0 && c < 10 && grid[r][c] !== 2 && grid[r][c] !== 3);
      if (candidates.length) target = candidates[Math.floor(Math.random() * candidates.length)];
    }
    if (!target) {
      // random cell not yet shot
      let attempts = 0;
      while (attempts < 200) {
        const r = Math.floor(Math.random() * 10);
        const c = Math.floor(Math.random() * 10);
        if (grid[r][c] !== 2 && grid[r][c] !== 3) { target = [r, c]; break; }
        attempts++;
      }
    }
    if (!target) return;

    const [bx, by] = target;
    const cellVal = grid[bx][by];
    let hit = false;
    if (typeof cellVal === 'string') {
      grid[bx][by] = 3;
      hit = true;
      const idx = updatedShips.findIndex((s) => s.name === cellVal);
      if (idx !== -1) {
        updatedShips[idx].hp -= 1;
        if (updatedShips[idx].hp <= 0) updatedShips[idx].sunk = true;
      }
    } else {
      grid[bx][by] = 2;
    }

    setMyGrid(grid);
    setShips(updatedShips);

    if (updatedShips.every((s) => s.sunk)) {
      setGameResult('LOSE');
      sfx.playDefeat();
      setTimeout(() => setIsGameOver(true), 1200);
      setStatusMessage('💀 DEFEAT! Your fleet is destroyed.');
      return;
    }

    if (hit) {
      triggerCombatFx('DANGER');
      setStatusMessage('⚠️ DANGER! Bot hit your ship. Bot continues...');
      // Bot keeps firing on hit
      setTimeout(() => executeBotTurn(), 1500);
    } else {
      triggerCombatFx('MISS');
      setStatusMessage('💨 Bot missed. Your turn, Captain!');
      setIsMyTurn(true);
    }
  }, []);

  // ---------- Player click on enemy radar ----------
  const handleRadarClick = (x, y) => {
    if (!isCombatStarted || isGameOver || !isMyTurn) return;
    if (enemyGrid[x][y] !== 0) return;

    let targetCells = [{ x, y }];
    if (activeSkill) {
      const shipInfo = ships.find((s) => s.name === activeSkill.name);
      if (!shipInfo || shipInfo.currentCD > 0 || shipInfo.sunk) return;

      targetCells = [];
      const [rangeX, rangeY] = activeSkill.area;
      for (let i = 0; i < rangeX; i++) {
        for (let j = 0; j < rangeY; j++) {
          if (x + i < 10 && y + j < 10) targetCells.push({ x: x + i, y: y + j });
        }
      }
      setShips((prev) => prev.map((s) => (s.name === activeSkill.name ? { ...s, currentCD: s.cooldown } : s)));
      setActiveSkill(null);
    }

    if (mode === 'SOLO') {
      executeSoloAttack(targetCells);
    } else {
      socket.emit('fire_shot', { room_code: roomData.code, targets: targetCells });
      // Optimistic: prevent double fire until result returns
      setIsMyTurn(false);
    }
  };

  // ---------- Placement ----------
  const handlePlaceShip = (x, y) => {
    if (!selectedShip || isReady) return;
    if (placedShips.some((p) => p.name === selectedShip.name)) return;

    const newGrid = myGrid.map((row) => [...row]);
    for (let i = 0; i < selectedShip.size; i++) {
      const r = orientation === 'H' ? x : x + i;
      const c = orientation === 'H' ? y + i : y;
      if (r >= 10 || c >= 10 || newGrid[r][c] !== 0) return;
    }
    for (let i = 0; i < selectedShip.size; i++) {
      const r = orientation === 'H' ? x : x + i;
      const c = orientation === 'H' ? y + i : y;
      newGrid[r][c] = selectedShip.name;
    }
    setMyGrid(newGrid);
    setPlacedShips((prev) => [...prev, { name: selectedShip.name, size: selectedShip.size, x, y, orientation }]);
    setSelectedShip(null);
    sfx.playSonar();
  };

  const handleResetBoard = () => {
    if (isReady) return;
    setMyGrid(emptyGrid());
    setPlacedShips([]);
    setSelectedShip(null);
    setStatusMessage('Board cleared. Deploy your fleet manually or Randomize!');
  };

  const handleRandomizeFleet = () => {
    if (isReady) return;
    const grid = emptyGrid();
    const placements = [];
    INITIAL_SHIPS.forEach((ship) => {
      let placed = false;
      while (!placed) {
        const orient = Math.random() > 0.5 ? 'H' : 'V';
        const x = Math.floor(Math.random() * 10);
        const y = Math.floor(Math.random() * 10);
        let canPlace = true;
        for (let i = 0; i < ship.size; i++) {
          const r = orient === 'H' ? x : x + i;
          const c = orient === 'H' ? y + i : y;
          if (r >= 10 || c >= 10 || grid[r][c] !== 0) { canPlace = false; break; }
        }
        if (canPlace) {
          for (let i = 0; i < ship.size; i++) {
            const r = orient === 'H' ? x : x + i;
            const c = orient === 'H' ? y + i : y;
            grid[r][c] = ship.name;
          }
          placements.push({ name: ship.name, size: ship.size, x, y, orientation: orient });
          placed = true;
        }
      }
    });
    setMyGrid(grid);
    setPlacedShips(placements);
    setSelectedShip(null);
    setStatusMessage('Fleet randomized! Lock formation when ready.');
  };

  const handleStartCombat = () => {
    if (placedShips.length < 5) {
      alert('Deploy 5 ships first!');
      return;
    }
    sfx.playClick();
    setIsReady(true);
    if (mode === 'SOLO') {
      setIsCombatStarted(true);
      setIsMyTurn(true);
      setStatusMessage('COMBAT STARTED: Your turn to attack, Captain!');
    } else {
      setStatusMessage('Waiting for enemy to lock formation...');
      socket.emit('player_ready_combat', { room_code: roomData.code });
    }
  };

  const handlePlayAgain = () => {
    setShowVictoryEffect(false);
    if (mode === 'SOLO') {
      setMyGrid(emptyGrid());
      setEnemyGrid(emptyGrid());
      setIsCombatStarted(false);
      setIsGameOver(false);
      setGameResult('');
      setIsReady(false);
      setPlacedShips([]);
      setSelectedShip(null);
      setActiveSkill(null);
      setShips(cloneShips());
      setEnemyShips(cloneShips());
      setIsMyTurn(true);
      setStatusMessage('PLACEMENT PHASE: Deploy your fleet, Captain!');
      generateBotBoard();
    } else {
      socket.emit('request_rematch', { room_code: roomData.code, role: roomData.role });
    }
  };

  const handleQuit = () => {
    if (mode === 'MULTIPLAYER') {
      socket.emit('player_quit_room', { room_code: roomData.code });
    }
    onBack();
  };

  // ---------- MULTIPLAYER SOCKET HANDLERS ----------
  useEffect(() => {
    if (mode !== 'MULTIPLAYER') return;

    const onEnemyReady = () => setStatusMessage('Enemy locked formation. Waiting...');
    const onStartCombat = () => {
      setIsCombatStarted(true);
      const myFirst = roomData?.role === 'host';
      setIsMyTurn(myFirst);
      setStatusMessage(myFirst ? '⚓ YOUR TURN! Strike the enemy radar.' : '⏳ ENEMY TURN! Brace for impact.');
    };

    const onReceiveShot = (data) => handleIncomingMultiplayerShot(data.targets || []);

    const onUpdateRadar = (data) => {
      const { hits = [], misses = [], sunkShips = [], allSunk } = data;
      setEnemyGrid((prev) => {
        const g = prev.map((r) => [...r]);
        hits.forEach(({ x, y }) => { g[x][y] = 3; });
        misses.forEach(({ x, y }) => { g[x][y] = 2; });
        return g;
      });
      triggerJetStrike('big');
      if (sunkShips.length > 0) {
        setEnemyShips((prev) => prev.map((s) => (sunkShips.includes(s.name) ? { ...s, sunk: true, hp: 0 } : s)));
        setStatusMessage(`💥 ENEMY ${sunkShips.join(', ')} DESTROYED!`);
        setTimeout(() => triggerCombatFx('HIT'), 700);
      } else if (hits.length > 0) {
        setStatusMessage('🎯 DIRECT HIT! Fire again.');
        setTimeout(() => triggerCombatFx('HIT'), 700);
      } else {
        setStatusMessage('🌊 SPLASH! Enemy turn.');
        setTimeout(() => triggerCombatFx('MISS'), 700);
      }
      if (allSunk) {
        setGameResult('WIN');
        setShowVictoryEffect(true);
        sfx.playVictory();
        setTimeout(() => setIsGameOver(true), 1200);
      } else {
        // hit → continue our turn; miss → enemy turn
        setIsMyTurn(hits.length > 0);
      }
    };

    const onRematchUpdate = (data) => setRematchStatus({ hostReady: data.hostReady, guestReady: data.guestReady });

    const onInitPlacement = () => {
      setMyGrid(emptyGrid());
      setEnemyGrid(emptyGrid());
      setIsCombatStarted(false);
      setIsGameOver(false);
      setGameResult('');
      setIsReady(false);
      setPlacedShips([]);
      setSelectedShip(null);
      setActiveSkill(null);
      setShowVictoryEffect(false);
      setShips(cloneShips());
      setEnemyShips(cloneShips());
      setIsMyTurn(roomData?.role === 'host');
      setRematchStatus({ hostReady: false, guestReady: false });
      setStatusMessage('REMATCH! Deploy your fleet, Captain!');
    };

    const onForceQuit = () => {
      alert('The enemy abandoned the battle. Returning to Lobby.');
      onBack();
    };

    socket.on('enemy_ready_status', onEnemyReady);
    socket.on('start_multiplayer_combat', onStartCombat);
    socket.on('receive_shot', onReceiveShot);
    socket.on('update_enemy_radar', onUpdateRadar);
    socket.on('rematch_status_update', onRematchUpdate);
    socket.on('init_placement', onInitPlacement);
    socket.on('force_quit_lobby', onForceQuit);

    return () => {
      socket.off('enemy_ready_status', onEnemyReady);
      socket.off('start_multiplayer_combat', onStartCombat);
      socket.off('receive_shot', onReceiveShot);
      socket.off('update_enemy_radar', onUpdateRadar);
      socket.off('rematch_status_update', onRematchUpdate);
      socket.off('init_placement', onInitPlacement);
      socket.off('force_quit_lobby', onForceQuit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, roomData?.role, roomData?.code]);

  const handleIncomingMultiplayerShot = (targets) => {
    const grid = stateRef.current.myGrid.map((r) => [...r]);
    const updatedShips = stateRef.current.ships.map((s) => ({ ...s }));
    const hits = [], misses = [], sunkShips = [];

    targets.forEach(({ x, y }) => {
      const v = grid[x][y];
      if (typeof v === 'string') {
        grid[x][y] = 3;
        hits.push({ x, y });
        const idx = updatedShips.findIndex((s) => s.name === v);
        if (idx !== -1) {
          updatedShips[idx].hp -= 1;
          if (updatedShips[idx].hp <= 0 && !updatedShips[idx].sunk) {
            updatedShips[idx].sunk = true;
            sunkShips.push(v);
          }
        }
      } else if (v === 0) {
        grid[x][y] = 2;
        misses.push({ x, y });
      }
    });

    setMyGrid(grid);
    setShips(updatedShips);
    reduceCooldowns();

    const allSunk = updatedShips.every((s) => s.sunk);
    socket.emit('shot_result_report', { room_code: roomData.code, hits, misses, sunkShips, allSunk });

    if (allSunk) {
      setGameResult('LOSE');
      sfx.playDefeat();
      setTimeout(() => setIsGameOver(true), 1200);
    } else if (hits.length > 0) {
      triggerCombatFx('DANGER');
      setStatusMessage('🚨 ALARM! We took damage! Enemy fires again...');
      setIsMyTurn(false); // attacker continues on hit
    } else {
      triggerCombatFx('MISS');
      setStatusMessage('🌊 Enemy missed! Your turn to fire!');
      setIsMyTurn(true); // attacker missed, our turn
    }
  };

  // ---------- RENDER HELPERS ----------
  const toggleOrientation = () => setOrientation((o) => (o === 'H' ? 'V' : 'H'));
  const handleSelectSkill = (ship) => {
    if (!isCombatStarted || !isMyTurn || ship.currentCD > 0 || ship.sunk) return;
    setActiveSkill((prev) => (prev?.name === ship.name ? null : ship));
  };
  const selectShipType = (ship) => {
    if (isReady) return;
    if (placedShips.some((p) => p.name === ship.name)) return;
    setSelectedShip(ship);
  };

  return (
    <div data-testid="game-room" style={{ background: 'radial-gradient(ellipse at top, #0a1d3a 0%, #020c1b 80%)', minHeight: '100vh', color: 'white', padding: '60px 20px 40px', fontFamily: "'Rajdhani', sans-serif", animation: isShaking ? 'shake .4s ease' : 'none' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Orbitron:wght@500;700;900&display=swap');
        @keyframes shake { 0%,100%{transform:translate(0,0)} 15%{transform:translate(-8px,5px) rotate(-.5deg)} 30%{transform:translate(8px,-5px) rotate(.5deg)} 45%{transform:translate(-6px,3px)} 60%{transform:translate(6px,-3px)} 75%{transform:translate(-3px,2px)} }
        @keyframes flyJetBy { 0% { transform: translateX(0) scale(.7) rotate(8deg); opacity: 0 } 10%{opacity:1} 90%{opacity:1} 100%{ transform: translateX(130vw) scale(1.2) rotate(8deg); opacity: 0 } }
        @keyframes arcadePop { 0% { transform: translate(-50%,-50%) scale(.2); opacity:0 } 30% { transform: translate(-50%,-50%) scale(1.25); opacity:1 } 60% { transform: translate(-50%,-50%) scale(1); opacity:1 } 100% { transform: translate(-50%,-50%) scale(.9); opacity:0 } }
        @keyframes confettiFall { 0% { transform: translateY(-100vh) rotate(0); opacity:1 } 100% { transform: translateY(100vh) rotate(720deg); opacity:0 } }
        @keyframes pulseRed { 0%,100%{box-shadow:0 0 8px #ef4444} 50%{box-shadow:0 0 22px #ef4444} }
        @keyframes pulseGreen { 0%,100%{box-shadow:0 0 8px #22c55e} 50%{box-shadow:0 0 22px #22c55e} }
        @keyframes screenFlash { 0%{opacity:0} 12%{opacity:.85} 100%{opacity:0} }
        @keyframes missileFly { 0% { left: -200px; top: 0%; transform: rotate(35deg); opacity: 0 } 10% { opacity:1 } 100% { left: 50%; top: 80%; transform: rotate(70deg); opacity: 1 } }
        @keyframes missileSmoke { 0%{opacity:.9; transform: scale(1)} 100%{opacity:0; transform: scale(2.5)} }
        @keyframes bgPan { 0%{background-position:0 0} 100%{background-position:400px 400px} }
        @keyframes searchlight { 0%{transform:translateX(-30%) skewX(-30deg)} 100%{transform:translateX(130%) skewX(-30deg)} }
        @keyframes turnGlow { 0%,100%{box-shadow: 0 0 30px rgba(74,222,128,.25), inset 0 0 30px rgba(74,222,128,.08)} 50%{box-shadow: 0 0 45px rgba(74,222,128,.45), inset 0 0 50px rgba(74,222,128,.16)} }
        .arcade-fx { position: fixed; top: 45%; left: 50%; transform: translate(-50%,-50%); z-index: 99999; pointer-events: none; font-family:'Orbitron',sans-serif; font-size: 4rem; font-weight: 900; letter-spacing: 4px; text-shadow: 0 0 20px rgba(0,0,0,.9), 0 10px 0 rgba(0,0,0,.8); animation: arcadePop 1.2s cubic-bezier(.175,.885,.32,1.275) forwards }
        .confetti { position: fixed; width: 10px; height: 14px; top:-20px; z-index: 99998; pointer-events: none; }
        .battleground-bg { position: absolute; inset: 0; background-image: linear-gradient(rgba(0,255,200,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,200,.025) 1px,transparent 1px); background-size: 40px 40px; animation: bgPan 40s linear infinite; pointer-events: none; z-index: 0 }
        .searchlight { position: absolute; top: 0; bottom: 0; width: 40%; background: linear-gradient(90deg, transparent 0%, rgba(56,189,248,.06) 50%, transparent 100%); animation: searchlight 14s ease-in-out infinite alternate; pointer-events: none; z-index: 0 }
      `}</style>

      <div className="battleground-bg" />
      <div className="searchlight" />

      <button data-testid="quit-btn" onClick={handleQuit} style={{ position: 'absolute', top: 20, left: 20, padding: '8px 16px', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, letterSpacing: 1 }}>← QUIT</button>

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h2 data-testid="game-title" style={{ color: '#00fff0', margin: '0 0 10px', letterSpacing: 4, fontFamily: 'Orbitron, sans-serif' }}>⚓ BATTLESHIP HARBOR</h2>
        <div data-testid="status-message" style={{ backgroundColor: 'rgba(15,32,67,.85)', padding: '10px 24px', borderRadius: 20, display: 'inline-block', border: '1px solid rgba(56,189,248,.3)', fontWeight: 700, color: isMyTurn && isCombatStarted ? '#4ade80' : '#cbd5e1', letterSpacing: 1 }}>
          {statusMessage}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap', marginTop: 16 }}>
        {/* Tactical Commands (during combat) */}
        {isCombatStarted && (
          <div data-testid="tactical-commands" style={{ backgroundColor: 'rgba(15,32,67,.85)', padding: 18, borderRadius: 10, width: 240, border: '1px solid #ef4444', boxShadow: '0 0 20px rgba(239,68,68,.18)' }}>
            <h3 style={{ margin: '0 0 14px', textAlign: 'center', color: '#ef4444', fontSize: 14, letterSpacing: 3, fontFamily: 'Orbitron, sans-serif' }}>🚀 TACTICAL COMMANDS</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ships.map((s, idx) => (
                <div key={idx} style={{ backgroundColor: activeSkill?.name === s.name ? '#1e40af' : 'rgba(7,17,35,.85)', padding: 10, borderRadius: 6, border: `1px solid ${activeSkill?.name === s.name ? '#3b82f6' : '#334155'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
                    <span>{s.name.toUpperCase()}</span>
                    <span style={{ color: s.sunk ? '#ef4444' : '#22c55e' }}>{s.sunk ? 'SUNK' : `${s.hp}/${s.size}`}</span>
                  </div>
                  {!s.sunk && (
                    <button
                      data-testid={`skill-btn-${s.name.toLowerCase().replace(/\s/g, '-')}`}
                      disabled={s.currentCD > 0 || !isMyTurn}
                      onClick={() => handleSelectSkill(s)}
                      style={{ width: '100%', padding: 6, backgroundColor: s.currentCD > 0 ? '#475569' : activeSkill?.name === s.name ? '#f59e0b' : '#dc2626', color: 'white', border: 'none', borderRadius: 4, cursor: (s.currentCD > 0 || !isMyTurn) ? 'not-allowed' : 'pointer', fontSize: 10, fontWeight: 700, letterSpacing: 1 }}
                    >
                      {activeSkill?.name === s.name ? '✗ CANCEL' : `${s.skillname}${s.currentCD > 0 ? ` (CD: ${s.currentCD})` : ''}`}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enemy Board */}
        {isCombatStarted && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 8, borderRadius: 10, background: 'rgba(127,29,29,.18)', border: '1px solid rgba(239,68,68,.4)', boxShadow: isMyTurn ? '0 0 28px rgba(239,68,68,.45)' : 'none', transition: 'box-shadow .3s' }}>
            <h4 style={{ color: '#ef4444', margin: '0 0 8px', letterSpacing: 2, fontFamily: 'Orbitron, sans-serif' }}>🎯 ENEMY RADAR</h4>
            <Board grid={enemyGrid} onCellClick={handleRadarClick} isOpponent={true} activeSkill={activeSkill} />
          </div>
        )}

        {/* My Board */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 8, borderRadius: 10, background: 'rgba(30,58,138,.18)', border: '1px solid rgba(59,130,246,.4)', boxShadow: (!isMyTurn && isCombatStarted) ? '0 0 28px rgba(239,68,68,.35)' : 'none' }}>
          <h4 style={{ color: '#38bdf8', margin: '0 0 8px', letterSpacing: 2, fontFamily: 'Orbitron, sans-serif' }}>🛡 MY NAVAL MAP</h4>
          <Board
            grid={myGrid}
            onCellClick={(x, y) => !isCombatStarted && handlePlaceShip(x, y)}
            isOpponent={false}
            selectedShip={!isCombatStarted ? selectedShip : null}
            orientation={orientation}
            placedShips={placedShips}
          />
        </div>

        {/* Right Panel */}
        <div style={{ backgroundColor: 'rgba(15,32,67,.85)', padding: 18, borderRadius: 10, width: 250, border: '1px solid #3b82f6' }}>
          {!isCombatStarted ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ margin: 0, textAlign: 'center', color: '#f59e0b', fontSize: 14, letterSpacing: 3, fontFamily: 'Orbitron, sans-serif' }}>🚢 FLEET SETUP</h3>
              <button
                data-testid="rotate-btn"
                onClick={toggleOrientation}
                style={{ width: '100%', padding: 10, backgroundColor: '#f59e0b', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 12, letterSpacing: 1 }}
              >
                🔄 {orientation === 'H' ? 'HORIZONTAL' : 'VERTICAL'}
              </button>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {INITIAL_SHIPS.map((s, idx) => {
                  const isPlaced = placedShips.some((p) => p.name === s.name);
                  const isSelected = selectedShip?.name === s.name;
                  return (
                    <div
                      key={idx}
                      data-testid={`ship-select-${s.name.toLowerCase().replace(/\s/g, '-')}`}
                      onClick={() => selectShipType(s)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 8,
                        borderRadius: 6,
                        backgroundColor: isPlaced ? '#065f46' : isSelected ? '#1e3a8a' : 'rgba(7,17,35,.85)',
                        border: `1px solid ${isPlaced ? '#10b981' : isSelected ? '#3b82f6' : '#334155'}`,
                        color: '#fff',
                        cursor: isPlaced || isReady ? 'not-allowed' : 'pointer',
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 1,
                        transition: '.2s',
                      }}
                    >
                      <span>{s.name.toUpperCase()} ({s.size})</span>
                      <span style={{ color: isPlaced ? '#86efac' : isSelected ? '#93c5fd' : '#94a3b8' }}>{isPlaced ? '✓ DEPLOYED' : isSelected ? '◉ SELECTED' : 'READY'}</span>
                    </div>
                  );
                })}
              </div>

              {!isReady && (
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button data-testid="randomize-btn" onClick={handleRandomizeFleet} style={{ flex: 1, padding: 10, backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 11, letterSpacing: 1 }}>🎲 RANDOMIZE</button>
                  <button data-testid="clear-btn" onClick={handleResetBoard} style={{ flex: 1, padding: 10, backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 11, letterSpacing: 1 }}>🗑 CLEAR</button>
                </div>
              )}

              <button
                data-testid="lock-formation-btn"
                onClick={handleStartCombat}
                disabled={isReady || placedShips.length < 5}
                style={{ width: '100%', padding: 12, marginTop: 4, backgroundColor: isReady ? '#475569' : placedShips.length < 5 ? '#475569' : '#22c55e', color: 'white', border: 'none', borderRadius: 6, fontWeight: 700, cursor: isReady || placedShips.length < 5 ? 'not-allowed' : 'pointer', letterSpacing: 2 }}
              >
                {isReady ? 'LOCKED — WAITING...' : `⚔ LOCK FORMATION (${placedShips.length}/5)`}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <h3 style={{ margin: 0, textAlign: 'center', color: '#3b82f6', fontSize: 14, letterSpacing: 3, fontFamily: 'Orbitron, sans-serif' }}>🛡 MY FLEET</h3>
              {ships.map((s, idx) => {
                const pct = (s.hp / s.size) * 100;
                return (
                  <div key={idx} style={{ backgroundColor: s.sunk ? '#7f1d1d' : 'rgba(7,17,35,.85)', padding: 8, borderRadius: 6, border: `1px solid ${s.sunk ? '#dc2626' : '#334155'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>
                      <span>{s.name.toUpperCase()}</span>
                      <span style={{ color: s.sunk ? '#fca5a5' : '#22c55e' }}>{s.sunk ? '💥 SUNK' : `${s.hp}/${s.size}`}</span>
                    </div>
                    <div style={{ width: '100%', height: 5, backgroundColor: '#1e293b', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: s.sunk ? '#7f1d1d' : pct > 50 ? '#22c55e' : pct > 25 ? '#f59e0b' : '#ef4444', transition: 'width .4s' }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ marginTop: 8, padding: 10, backgroundColor: isMyTurn ? 'rgba(6,95,70,.6)' : 'rgba(124,45,18,.6)', borderRadius: 6, border: `2px solid ${isMyTurn ? '#10b981' : '#f97316'}`, textAlign: 'center', fontSize: 12, fontWeight: 700, letterSpacing: 2, animation: isMyTurn ? 'pulseGreen 2s infinite' : 'pulseRed 2s infinite' }}>
                {isMyTurn ? '▶ YOUR TURN' : '⏸ ENEMY TURN'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Game Over modal */}
      {isGameOver && (
        <div data-testid="gameover-modal" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(2,12,27,.92)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(8px)' }}>
          <div style={{ backgroundColor: 'rgba(15,32,67,.96)', padding: 40, borderRadius: 14, textAlign: 'center', border: gameResult === 'WIN' ? '3px solid #22c55e' : '3px solid #ef4444', boxShadow: `0 0 50px ${gameResult === 'WIN' ? 'rgba(34,197,94,.5)' : 'rgba(239,68,68,.5)'}`, minWidth: 380 }}>
            <h1 style={{ fontSize: 36, margin: '0 0 8px', color: gameResult === 'WIN' ? '#22c55e' : '#ef4444', fontFamily: 'Orbitron, sans-serif', letterSpacing: 4 }}>
              {gameResult === 'WIN' ? '🎉 VICTORY!' : '💀 DEFEAT'}
            </h1>
            <p style={{ color: '#cbd5e1', marginBottom: 24 }}>{gameResult === 'WIN' ? 'You have conquered the seas, Captain!' : 'Your fleet lies at the bottom of the ocean.'}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button data-testid="play-again-btn" onClick={handlePlayAgain} style={{ padding: '12px 24px', backgroundColor: '#22c55e', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', letterSpacing: 2 }}>🔄 PLAY AGAIN</button>
              <button data-testid="quit-lobby-btn" onClick={handleQuit} style={{ padding: '12px 24px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer', letterSpacing: 2 }}>🏠 QUIT</button>
            </div>
            {mode === 'MULTIPLAYER' && (
              <p style={{ marginTop: 16, color: '#f59e0b', fontSize: 12, fontStyle: 'italic', minHeight: 16 }}>
                {roomData?.role === 'host' && rematchStatus.hostReady && !rematchStatus.guestReady && '⏳ Waiting for Guest to accept rematch...'}
                {roomData?.role === 'guest' && rematchStatus.guestReady && !rematchStatus.hostReady && '⏳ Waiting for Host to accept rematch...'}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Screen flash on HIT/DANGER */}
      {(visualFx === 'HIT' || visualFx === 'DANGER') && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99990, pointerEvents: 'none', background: visualFx === 'HIT' ? 'radial-gradient(circle at center, rgba(255,80,0,.55) 0%, rgba(255,0,0,.2) 30%, transparent 70%)' : 'radial-gradient(circle at center, rgba(255,235,0,.45) 0%, rgba(255,0,0,.25) 30%, transparent 70%)', animation: 'screenFlash .9s ease-out forwards' }} />
      )}

      {/* Missile trail flying in (during attack) */}
      {jetType && (
        <div style={{ position: 'fixed', zIndex: 999996, pointerEvents: 'none', animation: 'missileFly 1.3s ease-in forwards' }}>
          <div style={{ position: 'relative', width: 36, height: 6, background: 'linear-gradient(90deg, #fbbf24 0%, #ef4444 60%, transparent 100%)', boxShadow: '0 0 14px #ef4444, 0 0 28px #fb923c', borderRadius: 3 }}>
            {/* smoke trail */}
            <div style={{ position: 'absolute', right: '100%', top: '50%', transform: 'translateY(-50%)', width: 90, height: 16, background: 'linear-gradient(90deg, transparent 0%, rgba(200,200,200,.6) 60%, rgba(255,255,255,.85) 100%)', filter: 'blur(4px)', borderRadius: 8, animation: 'missileSmoke .9s ease-out infinite' }} />
          </div>
        </div>
      )}

      {/* Arcade FX pop */}
      {visualFx === 'HIT' && <div data-testid="fx-hit" className="arcade-fx" style={{ color: '#ff0055', WebkitTextStroke: '2px #fff' }}>💥 DIRECT HIT!</div>}
      {visualFx === 'MISS' && <div data-testid="fx-miss" className="arcade-fx" style={{ color: '#00d2ff', WebkitTextStroke: '2px #fff' }}>🌊 SPLASH!</div>}
      {visualFx === 'DANGER' && <div data-testid="fx-danger" className="arcade-fx" style={{ color: '#ffea00', WebkitTextStroke: '2px #ff0000' }}>🚨 WE ARE HIT!</div>}

      {/* Jet fly-over (3 variants by size) */}
      {jetType && (
        <>
          <div style={{ position: 'fixed', top: '32%', left: '-20%', zIndex: 999999, pointerEvents: 'none', animation: 'flyJetBy 1.5s cubic-bezier(.4,0,.2,1) forwards' }}>
            <img src={jetType === 'big' ? '/big_jet.gif' : jetType === 'medium' ? '/medium_jet.gif' : '/small_jet.gif'} alt="jet" style={{ width: jetType === 'big' ? 360 : jetType === 'medium' ? 240 : 160, filter: 'drop-shadow(-8px 16px 12px rgba(0,0,0,.6))', transform: 'rotate(8deg)' }} />
          </div>
          <div style={{ position: 'fixed', top: '50%', left: '-25%', zIndex: 999998, pointerEvents: 'none', animation: 'flyJetBy 1.7s cubic-bezier(.4,0,.2,1) forwards', animationDelay: '.2s' }}>
            <img src="/medium_jet.gif" alt="jet2" style={{ width: 180, opacity: .8, filter: 'drop-shadow(-6px 12px 10px rgba(0,0,0,.5))', transform: 'rotate(12deg)' }} />
          </div>
          <div style={{ position: 'fixed', top: '20%', left: '-15%', zIndex: 999997, pointerEvents: 'none', animation: 'flyJetBy 1.9s cubic-bezier(.4,0,.2,1) forwards', animationDelay: '.4s' }}>
            <img src="/small_jet.gif" alt="jet3" style={{ width: 120, opacity: .7, filter: 'drop-shadow(-4px 8px 8px rgba(0,0,0,.4))', transform: 'rotate(5deg)' }} />
          </div>
        </>
      )}

      {/* Confetti for Victory */}
      {showVictoryEffect && gameResult === 'WIN' && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99997 }}>
          {Array.from({ length: 80 }).map((_, i) => {
            const colors = ['#22c55e', '#fbbf24', '#3b82f6', '#ef4444', '#f97316', '#00fff0'];
            return (
              <div
                key={i}
                className="confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  backgroundColor: colors[i % colors.length],
                  animation: `confettiFall ${2 + Math.random() * 2}s linear ${Math.random() * 1}s forwards`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GameRoom;
