import React from 'react';

const Ship = ({ name, size }) => {
    return (
        <div style={{ marginBottom: '10px' }}>
            <span>{name} ({size} cells): </span>
            <div style={{ display: 'flex', gap: '2px' }}>
                {[...Array(size)].map((_, i) => (
                    <div key={i} style={{ width: '15px', height: '15px', backgroundColor: 'grey' }}></div>
                ))}
            </div>
        </div>
    );
};
export default Ship;