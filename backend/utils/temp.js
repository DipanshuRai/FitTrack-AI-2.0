import { Server } from "socket.io";

let pythonSocket = null;
let webRtcUserSocketId = null;
const connectedClients = new Map();
const userSocketMap = new Map();

export let io;
export { userSocketMap };

export const initializeSocketIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    // The path is important for clients to connect correctly
    path: "/socket.io/", 
    transports: ["websocket", "polling"]
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);
    connectedClients.set(socket.id, { type: 'unknown', connectedAt: new Date() });

    const userId = socket.handshake.query.userId;
    if (userId && userId !== "undefined") {
      userSocketMap.set(userId, socket.id);
      io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
    }

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
      connectedClients.delete(socket.id);

      // WebRTC disconnect
      if (socket.id === webRtcUserSocketId) {
        console.log(`WebRTC user ${socket.id} disconnected. Releasing lock.`);
        webRtcUserSocketId = null;
        if (pythonSocket) {
          pythonSocket.emit("client-disconnected"); // Notify Python
        }
      }
      
      // Python server disconnect
      if (socket.id === pythonSocket?.id) {
        console.log("Python WebRTC server disconnected!");
        pythonSocket = null;
        io.emit("python-disconnected");
      }

      // Chat user disconnect
      let disconnectedUserId;
      for (const [key, value] of userSocketMap.entries()) {
        if (value === socket.id) {
          disconnectedUserId = key;
          userSocketMap.delete(key);
          break;
        }
      }
      if (disconnectedUserId) {
        io.emit("getOnlineUsers", Array.from(userSocketMap.keys()));
      }
    });

    socket.on("error", (error) => {
      console.error(`WebSocket Error on ${socket.id}:`, error);
    });

    // Event listeners
    socket.on("connect-python", () => {
      pythonSocket = socket;
      connectedClients.set(socket.id, { type: 'python', connectedAt: new Date() });
      console.log(`Python WebRTC server connected! Socket ID: ${pythonSocket.id}`);
    });

    // WEBRTC SIGNALING LOGIC
    socket.on("webrtc-offer", (data) => {
      if (pythonSocket) {
        webRtcUserSocketId = socket.id;
        pythonSocket.emit("webrtc-offer", { ...data, from: socket.id });
      } else {
        console.error("Python server not connected. Cannot process offer.");
        socket.emit("python-disconnected");
      }
    });

    socket.on("webrtc-answer", (data) => {
      if (webRtcUserSocketId) {
        io.to(webRtcUserSocketId).emit("webrtc-answer", data);
      } else {
        console.warn("Received answer from Python, but no active user session.");
      }
    });

    socket.on("ice-candidate", (data) => {
      if (socket.id === pythonSocket?.id && webRtcUserSocketId) {
        io.to(webRtcUserSocketId).emit("ice-candidate", data);
      } else if (socket.id === webRtcUserSocketId && pythonSocket) {
        pythonSocket.emit("ice-candidate", data);
      }
    });
    
    socket.on("exercise-feedback", (data) => {
        if (webRtcUserSocketId) {
          io.to(webRtcUserSocketId).emit("exercise-feedback", data);
        }
    });
    
    socket.on("stop-webrtc-session", () => {
        if (socket.id === webRtcUserSocketId) {
          webRtcUserSocketId = null;
          if (pythonSocket) {
            pythonSocket.emit("client-disconnected");
          }
        }
    });
    
    socket.on("exercise-change", (data) => {
        if (pythonSocket && socket.id === webRtcUserSocketId) {
          pythonSocket.emit("exercise-change", data);
        }
    });
  });
};