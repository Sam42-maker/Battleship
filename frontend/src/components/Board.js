import React, { useState, useEffect } from 'react';

const Board = ({ grid, onCellClick, isOpponent, activeSkill, selectedShip, orientation }) => {
  const [hoveredCell, setHoveredCell] = useState(null);
  
  // --- STATE UNTUK MEMBATASI ANIMASI GIF HANYA 1 DETIK ---
  const [animationTimestamps, setAnimationTimestamps] = useState({});

  const handleMouseEnter = (x, y) => setHoveredCell({ x, y });
  const handleMouseLeave = () => setHoveredCell(null);

  // Efek ini mendeteksi setiap ada perubahan pada grid tempur
  useEffect(() => {
    setAnimationTimestamps(prev => {
      const next = { ...prev };
      let hasChanged = false;

      grid.forEach((row, r) => {
        row.forEach((cell, c) => {
          const key = `${r}-${c}`;
          if (cell === 2 || cell === 3) {
            // Jika koordinat ini baru saja kena tembak, catat waktu sekarang
            if (!next[key]) {
              next[key] = Date.now();
              hasChanged = true;
            }
          } else {
            // Bersihkan memori jika game di-reset (cell kembali jadi 0)
            if (next[key]) {
              delete next[key];
              hasChanged = true;
            }
          }
        });
      });

      return hasChanged ? next : prev;
    });
  }, [grid]);

  // Logika area hijau/merah saat meletakkan kapal
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

  const isSkillHover = (r, c) => {
    if (!activeSkill || !hoveredCell) return false;
    const [h, w] = activeSkill.area; 
    const { x, y } = hoveredCell;
    return (r >= x && r < x + h && c >= y && c < y + w);
  };

  const getSkillPreviewOpacity = () => {
    return activeSkill ? 0.7 : 1;
  };

  const getSkillBoxShadow = (r, c) => {
    if (isSkillHover(r, c)) {
      return '0 0 12px #f97316, inset 0 0 8px #ea580c';
    }
    return 'none';
  };

  const getCellColor = (val, r, c) => {
    if (isOpponent) {
      if (val === 2) return '#cbd5e1'; // Miss statis
      if (val === 3) return '#ef4444'; // Hit statis
      return '#3c76ff';
    } else {
      if (val === 2) return '#cbd5e1'; 
      if (val === 3) return '#ef4444'; 
      if (typeof val === 'string') return '#4e4e4e'; // Kapal kita
      
      if (isHoveredForPlacement(r, c)) {
        let isValid = true;
        for(let i=0; i<selectedShip.size; i++) {
            let tr = orientation === 'H' ? hoveredCell.x : hoveredCell.x + i;
            let tc = orientation === 'H' ? hoveredCell.y + i : hoveredCell.y;
            if (tr >= 10 || tc >= 10 || (grid[tr] && grid[tr][tc] !== 0)) isValid = false;
        }
        return isValid ? '#4ade80' : '#f87171';
      }
      return '#3c76ff'; 
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 30px)', gap: '2px' }} onMouseLeave={handleMouseLeave}>
      {grid.map((row, r) => row.map((cell, c) => {
        const key = `${r}-${c}`;
        const startTime = animationTimestamps[key];
        
        // Cek apakah umur tembakan di koordinat ini KURANG DARI 1 detik (1000ms)
        const isCurrentlyAnimating = startTime && (Date.now() - startTime < 1000);

        // Jika masih dalam waktu 1 detik, tampilkan GIF. Jika sudah lewat 1 detik, matikan (none).
        let bgImage = 'none';
        if (isCurrentlyAnimating) {
          // PENTING: Di sinilah file hit.gif dan miss.gif dipanggil
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
              transition: 'background-color 0.2s',
              opacity: activeSkill && isOpponent ? getSkillPreviewOpacity() : 1,
              boxShadow: getSkillBoxShadow(r, c),
              
              // Terapkan background GIF yang dikontrol oleh Timer
              backgroundImage: bgImage,
              backgroundSize: '120%',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          />
        );
      }))}
    </div>
  );
};

export default Board;