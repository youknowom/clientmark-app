 const initializeSocket = (io) => {
  io.on("connection", (socket) => {

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });

  });
};

export default initializeSocket;