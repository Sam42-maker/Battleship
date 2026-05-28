import { io } from 'socket.io-client';

const socket = io('http://34.101.203.9:5000', {
    transports: ['websocket'],
    autoConnect: true
});

export default socket;