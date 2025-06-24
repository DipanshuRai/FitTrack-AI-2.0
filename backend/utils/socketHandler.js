import { Server } from "socket.io";

let pythonSocket = null;
let activeWebRTCUser = null;
const userSocketMap = new Map();

export let io;
export { userSocketMap };

export const initializeSocketIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
    },
    path: "/socket.io/",
    transports: ["websocket", "polling"],
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    const userId = socket.handshake.query.userId;
    if (userId && userId !== "undefined") {
      userSocketMap.set(userId, socket.id);
      io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
    }

    socket.on("connect-python", () => {
      pythonSocket = socket;
      console.log(
        `Python WebRTC server connected! Socket ID: ${pythonSocket.id}`
      );
    });

    // WEBRTC SIGNALING LOGIC
    socket.on("webrtc-offer", (data) => {
      if (!pythonSocket) {
        return socket.emit("python-disconnected");
      }
      if (activeWebRTCUser) {
        // Refactored: Notify user that the server is busy
        return socket.emit("error-message", {
          message:
            "AI processor is currently busy. Please try again in a moment.",
        });
      }

      // Lock the session to this user
      activeWebRTCUser = { socketId: socket.id };
      console.log(`WebRTC session started for user ${socket.id}`);
      pythonSocket.emit("webrtc-offer", { ...data, from: socket.id });
    });

    socket.on("webrtc-answer", (data) => {
      if (activeWebRTCUser) {
        io.to(activeWebRTCUser.socketId).emit("webrtc-answer", data);
      } else {
        console.warn(
          "Received answer from Python, but no active user session."
        );
      }
    });

    socket.on("ice-candidate", (data) => {
      if (socket.id === pythonSocket?.id && activeWebRTCUser) {
        io.to(activeWebRTCUser.socketId).emit("ice-candidate", data);
      } else if (socket.id === activeWebRTCUser?.socketId && pythonSocket) {
        pythonSocket.emit("ice-candidate", data);
      }
    });

    socket.on("exercise-feedback", (data) => {
      if (activeWebRTCUser) {
        io.to(activeWebRTCUser.socketId).emit("exercise-feedback", data);
      }
    });

    socket.on("exercise-change", (data) => {
      if (pythonSocket && socket.id === activeWebRTCUser?.socketId) {
        pythonSocket.emit("exercise-change", data);
      }
    });

    socket.on("stop-webrtc-session", () => {
      if (socket.id === activeWebRTCUser?.socketId) {
        console.log(`User ${socket.id} stopped the WebRTC session.`);
        if (pythonSocket) {
          pythonSocket.emit("client-disconnected");
        }
        activeWebRTCUser = null;
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);

      // WebRTC disconnect
      if (socket.id === activeWebRTCUser?.socketId) {
        console.log(`WebRTC user ${socket.id} disconnected. Releasing lock.`);
        if (pythonSocket) {
          pythonSocket.emit("client-disconnected"); // Notify Python
        }
        activeWebRTCUser = null;
      }

      // Python server disconnect
      if (socket.id === pythonSocket?.id) {
        console.log("Python WebRTC server disconnected!");
        pythonSocket = null;
        if (activeWebRTCUser) {
          io.to(activeWebRTCUser.socketId).emit("python-disconnected");
          activeWebRTCUser = null; // Also release lock
        }
      }

      // Chat user disconnect
      if (userSocketMap.has(userId)) {
        userSocketMap.delete(userId);
        io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
      }
    });

    socket.on("error", (error) => {
      console.error(`WebSocket Error on ${socket.id}:`, error);
    });
  });
};
