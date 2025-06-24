import { useState } from "react";
import { Send } from "lucide-react";
import "./styles/MessageInput.css";

export default function MessageInput({ onSend }) {
  const [text, setText] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };
  
  return (
    <form onSubmit={submit} className="message-form">
      <input
        type="text"
        placeholder="Type a message..."
        value={text}
        className="message"
        onChange={(e) => setText(e.target.value)}
      />
      <button className="send-btn" type="submit" disabled={!text.trim()}>
        <Send size={22} />
      </button>
    </form>
  );
}
