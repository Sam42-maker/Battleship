import React, { useState } from 'react';

const Cell = ({ value, onClick, onHover, onLeave, isOpponent, highlight }) => {
  const [isHovered, setIsHovered] = useState(false);

  // Main color logic
  const getStyle = () => {
    // 1. PRIORITY: Skill highlight (Orange)
    if (highlight) {
      return { 
        backgroundColor: 'rgba(230, 126, 34, 0.8)', 
        border: '1px solid #d35400',
        boxShadow: 'inset 0 0 10px #e67e22' 
      };
    }

    // 2. Tile status (Hit, Miss, Ship, Empty)
    switch (value) {
      case 1: // Ship
        return { backgroundColor: isOpponent ? '#007bff' : '#444', border: '1px solid #666' }; 
      case 2: // Miss
        return { backgroundColor: '#fff', boxShadow: 'inset 0 0 5px #ccc' }; 
      case 3: // Hit
        return { backgroundColor: '#ff4d4d', boxShadow: '0 0 10px red' }; 
      default: // Empty sea
        return { 
          backgroundColor: isHovered ? 'rgba(255,255,255,0.3)' : '#007bff',
          border: '1px solid rgba(255,255,255,0.2)' 
        };
    }
  };

  return (
    <div 
      onClick={onClick}
      onMouseEnter={() => {
        setIsHovered(true);
        if (onHover) onHover(); // Send hover info to Board.js
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        if (onLeave) onLeave(); // Clear hover info in Board.js
      }}
      style={{
        width: '35px',
        height: '35px',
        cursor: 'pointer',
        transition: '0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...getStyle()
      }}
    >
      {value === 3 && '💥'}
      {value === 2 && '💧'}
    </div>
  );
};

export default Cell;