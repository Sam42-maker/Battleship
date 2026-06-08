import React, { useState, useEffect } from 'react';

const CELL = 32; // 30px cell + 2px gap

const SHIP_IMAGES = {
  carrier: '/carrier.png',
  battleship: '/battleship.png',
  cruiser: '/cruisser.png',
  submarine: '/submarine.png',
  'patrol boat': '/patrol_boat.png',
};

const getShipImage = (shipName) => {
  if (!shipName) return null;
  const lower = String(shipName).toLowerCase();
  if (lower.includes('carrier')) return SHIP_IMAGES.carrier;
  if (lower.includes('battleship')) return SHIP_IMAGES.battleship;
  if (lower.includes('cruiser')) return SHIP_IMAGES.cruiser;
  if (lower.includes('submarine')) return SHIP_IMAGES.submarine;
  if (lower.includes('patrol')) return SHIP_IMAGES['patrol boat'];
  return null;
};

const Board = ({ grid, onCellClick, isOpponent, activeSkill, selectedShip, orientation, placedShips = [] }) => {
  const [hoveredCell, setHoveredCell] = useState(null);
  const [animTimestamps, setAnimTimestamps] = useState({});

  useEffect(() => {
    setAnimTimestamps((prev) => {
      const next = { ...prev };
      let changed = false;
      let needRedraw = false;
      grid.forEach((row, r) => {
        row.forEach((cell, c) => {
          const key = `${r}-${c}`;
          if (cell === 2 || cell === 3) {
            if (!next[key]) { next[key] = Date.now(); changed = true; needRedraw = true; }
          } else if (next[key]) { delete next[key]; changed = true; }
        });
      });
      if (needRedraw) {
        // Force a re-render after 700ms and 1300ms so fresh-state expires visually
        setTimeout(() => setAnimTimestamps((p) => ({ ...p })), 700);
        setTimeout(() => setAnimTimestamps((p) => ({ ...p })), 1300);
      }
      return changed ? next : prev;
    });
  }, [grid]);

  const isHoveredForPlacement = (r, c) => {
    if (isOpponent || !selectedShip || !hoveredCell) return false;
    const { x, y } = hoveredCell;
    const size = selectedShip.size;
    if (orientation === 'H') return r === x && c >= y && c < y + size && y + size <= 10;
    return c === y && r >= x && r < x + size && x + size <= 10;
  };

  const isSkillHover = (r, c) => {
    if (!activeSkill || !hoveredCell || !isOpponent) return false;
    const [h, w] = activeSkill.area;
    const { x, y } = hoveredCell;
    return r >= x && r < x + h && c >= y && c < y + w;
  };

  const getCellColor = (val, r, c) => {
    if (val === 2) return 'rgba(203, 213, 225, 0.7)';
    if (val === 3) return 'rgba(239, 68, 68, 0.85)';
    if (typeof val === 'string') return 'transparent'; // our placed ships
    if (isOpponent) return 'rgba(15, 118, 178, 0.85)';
    if (isHoveredForPlacement(r, c)) {
      // Validate placement
      let valid = true;
      for (let i = 0; i < selectedShip.size; i++) {
        const tr = orientation === 'H' ? hoveredCell.x : hoveredCell.x + i;
        const tc = orientation === 'H' ? hoveredCell.y + i : hoveredCell.y;
        if (tr >= 10 || tc >= 10 || (grid[tr] && grid[tr][tc] !== 0)) valid = false;
      }
      return valid ? 'rgba(74, 222, 128, 0.55)' : 'rgba(248, 113, 113, 0.55)';
    }
    return 'rgba(15, 118, 178, 0.85)';
  };

  const renderShipOverlay = (ship, idx, isGhost = false) => {
    const imgPath = getShipImage(ship.name);
    if (!imgPath) return null;
    const isH = ship.orientation === 'H';
    const size = ship.size;
    const shipPx = size * 30 + (size - 1) * 2; // total px along the ship axis
    const x = ship.x;
    const y = ship.y;

    // For horizontal ship: width=shipPx, height=30, top=x*CELL, left=y*CELL
    // For vertical ship: width=30, height=shipPx, top=x*CELL, left=y*CELL
    const style = {
      position: 'absolute',
      top: `${x * CELL}px`,
      left: `${y * CELL}px`,
      width: isH ? `${shipPx}px` : `30px`,
      height: isH ? `30px` : `${shipPx}px`,
      zIndex: isGhost ? 3 : 2,
      pointerEvents: 'none',
      filter: isGhost ? 'brightness(1.4) drop-shadow(0 0 10px #4ade80)' : 'drop-shadow(2px 4px 6px rgba(0,0,0,.6))',
      opacity: isGhost ? 0.65 : 1,
      objectFit: 'fill',
    };

    // The image source naturally points "right" so for vertical we need to rotate 90deg
    // Rotate around top-left and translate to compensate
    if (!isH) {
      // We rotate the image 90deg clockwise around its center
      style.transform = 'rotate(90deg)';
      style.transformOrigin = 'center center';
      // After rotate of a (shipPx x 30) image around center, it becomes 30 x shipPx visually.
      // To make it sit in the (30 x shipPx) box, we need to set the actual width/height as if horizontal
      // and adjust position.
      style.width = `${shipPx}px`;
      style.height = `30px`;
      // Translate so the rotated image fits in the (30 x shipPx) cell strip starting at (x*CELL, y*CELL)
      const offset = (shipPx - 30) / 2;
      style.top = `${x * CELL + offset}px`;
      style.left = `${y * CELL - offset}px`;
    }

    return (
      <img key={isGhost ? 'ghost' : idx} src={imgPath} alt={ship.name} style={style} />
    );
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} onMouseLeave={() => setHoveredCell(null)}>
      <style>{`
        @keyframes board-radar-sweep { 0% { transform: rotate(0deg) } 100% { transform: rotate(360deg) } }
        @keyframes board-cell-pulse { 0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(56,189,248,.6) } 70% { transform: scale(1.05); box-shadow: 0 0 0 6px rgba(56,189,248,0) } 100% { transform: scale(1); box-shadow: none } }
        @keyframes board-explode-ring { 0% { transform: scale(.3); opacity: 1; border-width: 4px } 100% { transform: scale(2.2); opacity: 0; border-width: 0 } }
        @keyframes board-water-ripple { 0% { transform: scale(.4); opacity: .9 } 100% { transform: scale(2); opacity: 0 } }
        @keyframes board-smoke-rise { 0% { transform: translateY(0) scale(.8); opacity: .9 } 100% { transform: translateY(-22px) scale(1.6); opacity: 0 } }
        @keyframes board-fire-flicker { 0%,100% { transform: scale(1) rotate(-2deg); filter: hue-rotate(0deg) } 50% { transform: scale(1.15) rotate(2deg); filter: hue-rotate(15deg) } }
        @keyframes board-grid-glow { 0%,100% { box-shadow: inset 0 0 20px rgba(56,189,248,.18) } 50% { box-shadow: inset 0 0 30px rgba(56,189,248,.32) } }
      `}</style>

      {/* Enemy radar sweep arm */}
      {isOpponent && (
        <div style={{ position: 'absolute', inset: 2, pointerEvents: 'none', borderRadius: '50%', overflow: 'hidden', zIndex: 4, mixBlendMode: 'screen' }}>
          <div style={{ position: 'absolute', top: '50%', left: '50%', width: '50%', height: '2px', transformOrigin: '0 50%', background: 'linear-gradient(90deg, rgba(34,197,94,.6) 0%, rgba(34,197,94,0) 100%)', animation: 'board-radar-sweep 4s linear infinite' }} />
        </div>
      )}

      <div
        data-testid={isOpponent ? 'enemy-board' : 'my-board'}
        style={{ display: 'grid', gridTemplateColumns: `repeat(10, 30px)`, gap: '2px', position: 'relative', zIndex: 1, padding: 2, background: 'rgba(0,0,0,.3)', borderRadius: 6, border: '1px solid rgba(56,189,248,.3)', animation: 'board-grid-glow 4s ease-in-out infinite' }}
      >
        {grid.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r}-${c}`;
            const startTime = animTimestamps[key];
            const elapsed = startTime ? Date.now() - startTime : Infinity;
            const isAnim = elapsed < 1200;
            const isFresh = elapsed < 600; // shows ring/ripple
            let bgImage = 'none';
            if (isAnim) bgImage = cell === 3 ? "url('/hit.gif')" : cell === 2 ? "url('/miss.gif')" : 'none';

            const skillHover = isSkillHover(r, c);
            return (
              <div
                key={key}
                data-testid={`${isOpponent ? 'enemy' : 'my'}-cell-${r}-${c}`}
                onClick={() => onCellClick && onCellClick(r, c)}
                onMouseEnter={() => setHoveredCell({ x: r, y: c })}
                style={{
                  position: 'relative',
                  width: 30,
                  height: 30,
                  backgroundColor: getCellColor(cell, r, c),
                  border: '1px solid rgba(51,65,85,.7)',
                  cursor: (isOpponent || selectedShip) ? 'crosshair' : 'default',
                  boxShadow: skillHover ? '0 0 12px #f97316, inset 0 0 8px #ea580c' : 'inset 0 0 4px rgba(0,0,0,.3)',
                  backgroundImage: bgImage,
                  backgroundSize: '120%',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  zIndex: isAnim ? 3 : 1,
                  transition: 'background-color .15s ease',
                  animation: isFresh ? 'board-cell-pulse .6s ease-out' : undefined,
                }}
              >
                {/* HIT: explosion ring + smoke + fire flicker */}
                {isFresh && cell === 3 && (
                  <>
                    <div style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '4px solid #ff6b00', animation: 'board-explode-ring .8s ease-out forwards', pointerEvents: 'none', zIndex: 5 }} />
                    <div style={{ position: 'absolute', inset: -2, borderRadius: '50%', border: '2px solid #fbbf24', animation: 'board-explode-ring 1s ease-out forwards', animationDelay: '.1s', pointerEvents: 'none', zIndex: 5 }} />
                    <div style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)', fontSize: 18, animation: 'board-smoke-rise 1.4s ease-out forwards', pointerEvents: 'none', zIndex: 6 }}>💨</div>
                  </>
                )}
                {/* Persistent hit: fire flicker */}
                {!isFresh && cell === 3 && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, animation: 'board-fire-flicker 1.2s ease-in-out infinite', pointerEvents: 'none' }}>🔥</div>
                )}
                {/* MISS: water ripple */}
                {isFresh && cell === 2 && (
                  <>
                    <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', border: '2px solid #38bdf8', animation: 'board-water-ripple .9s ease-out forwards', pointerEvents: 'none', zIndex: 5 }} />
                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(255,255,255,.6)', animation: 'board-water-ripple 1.1s ease-out forwards', animationDelay: '.15s', pointerEvents: 'none', zIndex: 5 }} />
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Ship overlays */}
      {!isOpponent && placedShips.map((ship, idx) => renderShipOverlay(ship, idx, false))}

      {/* Ghost overlay */}
      {!isOpponent && selectedShip && hoveredCell && (() => {
        let valid = true;
        for (let i = 0; i < selectedShip.size; i++) {
          const tr = orientation === 'H' ? hoveredCell.x : hoveredCell.x + i;
          const tc = orientation === 'H' ? hoveredCell.y + i : hoveredCell.y;
          if (tr >= 10 || tc >= 10 || (grid[tr] && grid[tr][tc] !== 0)) valid = false;
        }
        if (!valid) return null;
        return renderShipOverlay(
          { name: selectedShip.name, size: selectedShip.size, x: hoveredCell.x, y: hoveredCell.y, orientation },
          'ghost',
          true
        );
      })()}
    </div>
  );
};

export default Board;
