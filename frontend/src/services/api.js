import axios from 'axios';

// Use port 5000 according to the Flask backend configuration
const API_URL = 'http://localhost:5000'; 

export const saveBoard = async (playerId, boardData) => {
    try {
        const response = await axios.post(`${API_URL}/save-board`, {
            player_id: playerId,
            board: boardData
        }, {
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data;
    } catch (error) {
        console.error("Detail Error Axios:", error);
        throw error;
    }
};