import { io } from "socket.io-client";
import { BASE_URL } from "../api/axiosClient";

// ✅ Create a single socket instance
const SOCKET_URL = BASE_URL;

export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  autoConnect: false, // Never connect before valid token is available
});
