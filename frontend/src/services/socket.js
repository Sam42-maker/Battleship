import { io } from 'socket.io-client';

// Targetkan ke localhost port 5000 (Backend)
const socket = io('http://localhost:5000', {
    transports: ['websocket'],
    autoConnect: true
});

export default socket;