import React, { useState, useEffect } from 'react';

// Note that we've added a new parameter, “placedShips,” to display ships that have already been placed
const Board = ({ grid, onCellClick, isOpponent, activeSkill, selectedShip, orientation, placedShips = [] }) => {
  const [hoveredCell, setHoveredCell] = useState(null);
  const [animationTimestamps, setAnimationTimestamps] = useState({});

  const handleMouseEnter = (x, y) => setHoveredCell({ x, y });
  const handleMouseLeave = () => setHoveredCell(null);

  useEffect(() => {
    setAnimationTimestamps(prev => {
      const next = { ...prev };
      let hasChanged = false;
      grid.forEach((row, r) => {
        row.forEach((cell, c) => {
          const key = `${r}-${c}`;
          if (cell === 2 || cell === 3) {
            if (!next[key]) { next[key] = Date.now(); hasChanged = true; }
          } else {
            if (next[key]) { delete next[key]; hasChanged = true; }
          }
        });
      });
      return hasChanged ? next : prev;
    });
  }, [grid]);

  const isHoveredForPlacement = (r, c) => {
    if (isOpponent || !selectedShip || !hoveredCell) return false;
    const { x, y } = hoveredCell;
    const size = selectedShip.size;
    if (orientation === 'H') return r === x && c >= y && c < y + size && (y + size <= 10);
    else return c === y && r >= x && r < x + size && (x + size <= 10);
  };

  const isSkillHover = (r, c) => {
    if (!activeSkill || !hoveredCell) return false;
    const [h, w] = activeSkill.area; 
    const { x, y } = hoveredCell;
    return (r >= x && r < x + h && c >= y && c < y + w);
  };

  const getSkillBoxShadow = (r, c) => isSkillHover(r, c) ? '0 0 12px #f97316, inset 0 0 8px #ea580c' : 'none';

  // === CELL COLOR LOGIC === //
  const getCellColor = (val, r, c) => {
    if (isOpponent) {
      if (val === 2) return 'rgba(203, 213, 225, 0.8)'; // Miss 
      if (val === 3) return 'rgba(239, 68, 68, 0.8)'; // Hit
      return 'rgba(23, 199, 243, 0.86)'; // Biru musuh
    } else {
      if (val === 2) return 'rgba(203, 213, 225, 0.8)';
      if (val === 3) return 'rgba(239, 68, 68, 0.8)';
      if (typeof val === 'string') return 'transparent';
      
      if (isHoveredForPlacement(r, c)) {
        let isValid = true;
        for(let i=0; i<selectedShip.size; i++) {
            let tr = orientation === 'H' ? hoveredCell.x : hoveredCell.x + i;
            let tc = orientation === 'H' ? hoveredCell.y + i : hoveredCell.y;
            if (tr >= 10 || tc >= 10 || (grid[tr] && grid[tr][tc] !== 0)) isValid = false;
        }
        return isValid ? 'rgba(74, 222, 128, 0.5)' : 'rgba(248, 113, 113, 0.5)';
      }
      return 'rgba(23, 199, 243, 0.86)';
    }
  };

  const getShipImage = (shipName) => {
    if (!shipName) return null;
    const lowerName = shipName.toLowerCase();
    if (lowerName.includes('carrier')) return '/carrier.png';
    if (lowerName.includes('battleship')) return '/battleship.png';
    if (lowerName.includes('cruiser')) return '/cruiser.png'; 
    if (lowerName.includes('submarine')) return '/submarine.png';
    if (lowerName.includes('patrol')) return '/patrol_boat.png';
    return null;
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} onMouseLeave={handleMouseLeave}>
      
      {/* LAYER 1: GRID OF WATER SQUARES AND HIT/MISS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 30px)', gap: '2px', position: 'relative', zIndex: 1 }}>
        {grid.map((row, r) => row.map((cell, c) => {
          const key = `${r}-${c}`;
          const startTime = animationTimestamps[key];
          const isCurrentlyAnimating = startTime && (Date.now() - startTime < 1000);

          let bgImage = 'none';
          if (isCurrentlyAnimating) {
            bgImage = cell === 3 ? "url('/hit.gif')" : cell === 2 ? "url('/miss.gif')" : 'none';
          }

          return (
            <div
              key={key}
              onClick={() => onCellClick(r, c)}
              onMouseEnter={() => handleMouseEnter(r, c)}
              style={{
                width: '30px', 
                height: '30px',
                backgroundColor: getCellColor(cell, r, c),
                border: '1px solid #334155',
                cursor: (isOpponent || selectedShip) ? 'crosshair' : 'default',
                opacity: activeSkill && isOpponent ? (activeSkill ? 0.7 : 1) : 1,
                boxShadow: getSkillBoxShadow(r, c),
                backgroundImage: bgImage,
                backgroundSize: '120%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                zIndex: isCurrentlyAnimating ? 3 : 1 
              }}
            />
          );
        }))}
      </div>

      {/* LAYER 2: SHIPS ALREADY PLACED (PNG OVERLAY) */}
      {!isOpponent && placedShips.map((ship, index) => {
        const imgPath = getShipImage(ship.name);
        if (!imgPath) return null;

        const isH = ship.orientation === 'H';
        const topOffset = ship.x * 32; 
        const leftOffset = ship.y * 32;
        
        // The length of a ship is always measured horizontally first
        const shipLength = ship.size * 30 + (ship.size - 1) * 2;

        return (
          <img 
            key={index}
            src={imgPath}
            alt={ship.name}
            style={{
              position: 'absolute',
              top: `${topOffset}px`,
              left: `${leftOffset}px`,
              width: `${shipLength}px`,
              height: `30px`, 
              transformOrigin: '15px 15px',
              transform: isH ? 'none' : 'rotate(90deg)',
              zIndex: 2, 
              pointerEvents: 'none', 
              filter: 'drop-shadow(2px 4px 6px rgba(0,0,0,0.6))'
            }}
          />
        );
      })}

      {/* LAYER 3: HOLOGRAM (GHOST) EFFECT WHEN PLACING THE SHIP IN A HOVER POSITION */}
      {!isOpponent && selectedShip && hoveredCell && (() => {
        let isValid = true;
        for(let i=0; i<selectedShip.size; i++) {
          let tr = orientation === 'H' ? hoveredCell.x : hoveredCell.x + i;
          let tc = orientation === 'H' ? hoveredCell.y + i : hoveredCell.y;
          if (tr >= 10 || tc >= 10 || (grid[tr] && grid[tr][tc] !== 0)) isValid = false;
        }
        if (!isValid) return null;

        const imgPath = getShipImage(selectedShip.name);
        if (!imgPath) return null;

        const isH = orientation === 'H';
        const topOffset = hoveredCell.x * 32;
        const leftOffset = hoveredCell.y * 32;
        
        const shipLength = selectedShip.size * 30 + (selectedShip.size - 1) * 2;

        return (
          <img 
            src={imgPath}
            alt="ghost-ship"
            style={{
              position: 'absolute',
              top: `${topOffset}px`,
              left: `${leftOffset}px`,
              width: `${shipLength}px`,
              height: `30px`,
              transformOrigin: '15px 15px',
              transform: isH ? 'none' : 'rotate(90deg)',
              zIndex: 3,
              pointerEvents: 'none',
              opacity: 0.6,
              filter: 'brightness(1.5) drop-shadow(0 0 10px #4ade80)'
            }}
          />
        );
      })()}

    </div>
  );
};

export default Board;