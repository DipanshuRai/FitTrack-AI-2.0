import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import useAuth from "../hooks/useAuth";

const BASE_URL = 'http://localhost:5000';
const SocketContext = createContext(null);

export const useSocket = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
  const { auth } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (auth?.user?._id) {
      // Create the socket instance.
      const newSocket = io(BASE_URL, {
        transports: ["websocket"],
        query: { userId: auth.user._id },
        withCredentials: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      setSocket(newSocket);

      newSocket.on("connect", () => {
        console.log("Socket Connected:", newSocket.id);
      });

      newSocket.on("disconnect", (reason) => {
        console.log("Socket Disconnected:", reason);
        // The socket instance will automatically attempt to reconnect.
      });

      newSocket.on("connect_error", (err) => {
        console.error("Socket Connection Error:", err.message);
      });

      // This will be called when the component unmounts or the user logs out.
      return () => {
        console.log("Disconnecting socket...");
        newSocket.disconnect();
      };
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
  }, [auth?.user?._id]); 

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};