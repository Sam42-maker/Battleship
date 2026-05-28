import React, { useState } from 'react';

const Board = ({ grid, onCellClick, isOpponent, activeSkill, selectedShip, orientation }) => {
  const [hoveredCell, setHoveredCell] = useState(null);

  const handleMouseEnter = (x, y) => setHoveredCell({ x, y });
  const handleMouseLeave = () => setHoveredCell(null);

  // Logic to detect ghost placement area on hover while placing ships
  const isHoveredForPlacement = (r, c) => {
    if (isOpponent || !selectedShip || !hoveredCell) return false;
    const { x, y } = hoveredCell;
    const size = selectedShip.size;
    
    if (orientation === 'H') {
      return r === x && c >= y && c < y + size && (y + size <= 10);
    } else {
      return c === y && r >= x && r < x + size && (x + size <= 10);
    }
  };

  // SKILL AREA LOGIC (Preview)
  const isSkillHover = (r, c) => {
    if (!activeSkill || !hoveredCell) return false;
    const [h, w] = activeSkill.area; // Skill area [height, width]
    const { x, y } = hoveredCell;
    return (r >= x && r < x + h && c >= y && c < y + w);
  };

  // Preview opacity/fade for active skill
  const getSkillPreviewOpacity = () => {
    return activeSkill ? 0.7 : 1;
  };

  // Glow effect for skill area
  const getSkillBoxShadow = (r, c) => {
    if (isSkillHover(r, c) && activeSkill) {
      return 'inset 0 0 8px rgba(251, 191, 36, 0.8), 0 0 12px rgba(251, 191, 36, 0.6)';
    }
    return 'none';
  };
   
  const getCellColor = (val, r, c) => {
    // --- ENEMY RADAR (Battle screen) ---
    // Color priority: Skill hover > Miss > Hit > Normal water
     if (isSkillHover(r, c)) return activeSkill ? '#fbbf24' : (isOpponent ? '#3c76ff' : '#3c76ff');

    if (isOpponent) {
      
      if (val === 2) return '#e2e8f0'; // Miss (White/Gray)
      if (val === 3) return '#ef4444'; // Hit (Red)
      return '#3c76ff'; // Normal water - ocean blue like player grid
    } 
    // --- OWN RADAR (Player board) ---
    else {
      if (val === 2) return '#e2e8f0'; // Miss
      if (val === 3) return '#ef4444'; // Hit
      if (typeof val === 'string') return '#4e4e4e'; // Own ship (Light blue)
      
      // Detect hover while arranging ships
      if (isHoveredForPlacement(r, c)) {
        let isValid = true;
        for(let i=0; i<selectedShip.size; i++) {
            let tr = orientation === 'H' ? hoveredCell.x : hoveredCell.x + i;
            let tc = orientation === 'H' ? hoveredCell.y + i : hoveredCell.y;
            if (tr >= 10 || tc >= 10 || (grid[tr] && grid[tr][tc] !== 0)) isValid = false;
        }
        return isValid ? '#4ade80' : '#f87171'; // Green if fits, Red if collision
      }
      return '#3c76ff'; // Normal water
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 30px)', gap: '2px' }} onMouseLeave={handleMouseLeave}>
      {grid.map((row, r) => row.map((cell, c) => (
        <div
          key={`${r}-${c}`}
          onClick={() => onCellClick(r, c)}
          onMouseEnter={() => handleMouseEnter(r, c)}
          style={{
            width: '30px', height: '30px',
            backgroundColor: getCellColor(cell, r, c),
            border: '1px solid #334155',
            cursor: (isOpponent || selectedShip) ? 'crosshair' : 'default',
            transition: 'background-color 0.2s',
            opacity: activeSkill && isOpponent ? getSkillPreviewOpacity() : 1,
            boxShadow: getSkillBoxShadow(r, c),
            
            // --- ANIMASI HIT/MISS MULTIPLAYER ---
            backgroundImage: cell === 3 ? "url('/hit.gif')" : cell === 2 ? "url('/miss_gif.gif')" : 'none',
            backgroundSize: '120%', k
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
      )))}
    </div>
  );
};

export default Board;