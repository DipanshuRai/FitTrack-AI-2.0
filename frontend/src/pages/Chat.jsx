import Sidebar from "../components/Sidebar";
import ChatContainer from "../components/ChatContainer";
import { useState } from "react";
import "./styles/Chat.css";

const Chat = () => {
  const [selectedUser, setSelectedUser] = useState({});
  return (
    <div className="chat-container1">
      <Sidebar 
        selectedUser={selectedUser} 
        setSelectedUser={setSelectedUser} />
      <ChatContainer
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
      />
    </div>
  );
};

export default Chat;
