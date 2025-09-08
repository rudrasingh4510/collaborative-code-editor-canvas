import {io} from 'socket.io-client';
import config from './config';

export const initSocket = async () =>{
    const options = {
        'force new connection': true,
        reconnectionAttempts : 'Infinity',
        timeout: 10000,
        transports: ['websocket'],
    };
    return io(config.SERVER_URL, options);
}