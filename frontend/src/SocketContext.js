import React, { createContext, useContext, useEffect } from "react";
import { socket } from "./socket/socket";

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  useEffect(() => {
    // Handle global connect/disconnect logging
    socket.on("connect", () => {
      
    });

    socket.on("disconnect", (reason) => {
      
    });

    return () => {
      socket.off("connect");
      socket.off("disconnect");
    };
  }, []);

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
