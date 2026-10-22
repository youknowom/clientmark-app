import React, { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { socket } from "./socket/socket";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [currentToken, setCurrentToken] = useState(() => Cookies.get("token") || null);

  useEffect(() => {
    // Sync token periodically or on storage change to handle login/logout across tabs
    const checkToken = () => {
      const token = Cookies.get("token") || null;
      if (token !== currentToken) {
        setCurrentToken(token);
      }
    };

    const interval = setInterval(checkToken, 2000);
    window.addEventListener("storage", checkToken);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", checkToken);
    };
  }, [currentToken]);

  useEffect(() => {
    if (currentToken) {
      // Connect only with active staff token
      socket.auth = { token: currentToken };
      if (!socket.connected) {
        socket.connect();
      }
    } else {
      // Disconnect when logged out or on public pages (landing, login, portal)
      if (socket.connected) {
        socket.disconnect();
      }
    }

    const handleConnectError = (err) => {
      const authErrorCodes = ["AUTH_REQUIRED", "TOKEN_INVALID", "SESSION_REVOKED"];
      const errorCode = err?.data?.code;

      if (errorCode && authErrorCodes.includes(errorCode)) {
        console.warn("[Socket] Authentication failure:", err.message);
        socket.disconnect();
        Cookies.remove("token");
        localStorage.clear();
        // Redirect to login if on protected page
        if (!window.location.pathname.startsWith("/login") && !window.location.pathname.startsWith("/project-preview")) {
          window.location.href = "/login";
        }
      }
      // For network errors: Socket.IO will automatically retry with exponential backoff
    };

    socket.on("connect_error", handleConnectError);

    return () => {
      socket.off("connect_error", handleConnectError);
    };
  }, [currentToken]);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};
