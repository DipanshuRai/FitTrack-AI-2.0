import { useEffect, useRef, useState } from "react";
import { useSocket } from "../context/SocketProvider.jsx";
import MessageInput from "./MessageInput";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import useAuth from "../hooks/useAuth";
import "./styles/ChatContainer.css";

const formatTime = (d) =>
  new Date(d).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

const ChatContainer = ({ selectedUser }) => {
  const { auth } = useAuth();
  const socket = useSocket();
  const [messages, setMessages] = useState([]);
  const endRef = useRef();
  const axiosPrivate = useAxiosPrivate();

  // Effect for fetching initial messages
  useEffect(() => {
    if (!selectedUser?._id) return;
    setMessages([]); // Clear previous messages
    axiosPrivate
      .get(`/api/messages/${selectedUser._id}`)
      .then((res) => setMessages(res.data))
      .catch(console.error);
  }, [selectedUser, axiosPrivate]);

  // Effect for handling incoming socket messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      // Add message only if it belongs to the current conversation
      if (
        newMessage.senderId === selectedUser?._id ||
        newMessage.receiverId === selectedUser?._id
      ) {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      }
    };

    // Listen for "newMessage" event from the server
    socket.on("newMessage", handleNewMessage);

    // Cleanup listener on component unmount or when socket changes
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, selectedUser]);

  // Scroll to the latest message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send function now uses REST API
  const send = async (text) => {
    if (!text.trim() || !selectedUser?._id) return;

    try {
      const response = await axiosPrivate.post(`/api/messages/send/${selectedUser._id}`, { text });
      setMessages((prevMessages) => [...prevMessages, response.data]);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  if (!selectedUser?._id) {
    return (
      <div className="placeholder">
        <p>Select a conversation to begin chatting.</p>
      </div>
    );
  }

  return (
    <div className="chat-area"> {/* Renamed for clarity */}
      <div className="chat-header">
        <h3 className="header-name">{selectedUser.name}</h3>
        {/* You could add a status indicator here later */}
      </div>

      <div className="chat-messages">
        {messages.map((m) => (
          <div
            key={m._id}
            ref={endRef}
            className={`message-wrapper ${
              m.senderId === auth.user._id ? "sent" : "received"
            }`}
          >
            <div className="message-bubble">
              <p className="message-text">{m.text}</p>
            </div>
            <time className="message-time">{formatTime(m.createdAt)}</time>
          </div>
        ))}
      </div>
      <MessageInput onSend={send} />
    </div>
  );
};

export default ChatContainer;