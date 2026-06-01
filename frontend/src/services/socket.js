import { io } from 'socket.io-client';

const socket = io('http://34.128.122.121:5000', {
    transports: ['websocket'],
    autoConnect: true
});

export default socket;