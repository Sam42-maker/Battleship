import { io } from 'socket.io-client';

const socket = io('http:34.128.96.47:5000', {
    transports: ['websocket'],
    autoConnect: true
});

export default socket;