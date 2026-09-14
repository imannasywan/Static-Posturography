import { io } from 'socket.io-client';
import { API_BASE_URL } from './apiConfig';

export const socket = io(API_BASE_URL, {
  autoConnect: false
});
// import { io } from 'socket.io-client';

// const URL = 'http://localhost:5000';

// export const socket = io(URL, {
//   autoConnect: false
// });
