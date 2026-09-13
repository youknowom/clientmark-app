import { io } from "socket.io-client";
import { BASE_URL } from "../api/axiosClient";

// ✅ Create a single socket instance
const SOCKET_URL = BASE_URL;

export const socket = io(SOCKET_URL, {
  transports: ["websocket"], // ensures stable connection
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  autoConnect: true,
});
