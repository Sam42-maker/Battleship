import React from 'react';

const Ship = ({ name, size }) => {
    // Function to call the correct image based on ship name
    const getShipImage = (shipName) => {
        const lowerName = shipName.toLowerCase();
        if (lowerName.includes('carrier')) return '/carrier.png';
        if (lowerName.includes('battleship')) return '/battleship.png';
        if (lowerName.includes('cruiser')) return '/cruiser.png'; 
        if (lowerName.includes('submarine')) return '/submarine.png';
        if (lowerName.includes('patrol')) return '/patrol_boat.png';
        return null;
    };

    const shipImg = getShipImage(name);

    return (
        <div style={{ 
            marginBottom: '12px', 
            padding: '10px 15px',
            backgroundColor: 'rgba(15, 32, 67, 0.7)', 
            border: '1px solid #38bdf8',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 0 15px rgba(56, 189, 248, 0.6)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
        }}
        >
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', color: '#fff', letterSpacing: '1px' }}>{name}</span>
                <span style={{ fontSize: '0.8rem', color: '#38bdf8', backgroundColor: 'rgba(56,189,248,0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                    {size} SLOTS
                </span>
            </div>

            {/* Show ship image */}
            {shipImg ? (
                <div style={{ width: '100%', height: '45px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <img 
                        src={shipImg} 
                        alt={name} 
                        style={{ 
                            maxWidth: '100%', 
                            maxHeight: '100%', 
                            objectFit: 'contain',
                            filter: 'drop-shadow(0px 5px 2px rgba(0,0,0,0.5))' 
                        }} 
                    />
                </div>
            ) : (
                /* Fallback jika gambar gagal dimuat (kotak abu-abu lama) */
                <div style={{ display: 'flex', gap: '4px', marginTop: '5px' }}>
                    {[...Array(size)].map((_, i) => (
                        <div key={i} style={{ width: '15px', height: '15px', backgroundColor: '#94a3b8', borderRadius: '2px' }}></div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Ship;