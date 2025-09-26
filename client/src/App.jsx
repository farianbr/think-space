import { useEffect, useState } from "react";
import { io } from "socket.io-client";

// Connect to backend server
const socket = io("http://localhost:4000");

export default function App() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  // When component loads, subscribe to server events
  useEffect(() => {
    socket.on("chat:message", (payload) => {
      setMessages((prev) => [...prev, payload]);
    });

    return () => {
      socket.off("chat:message");
    };
  }, []);

  // Send a message to server
  const sendMessage = (e) => {
    e.preventDefault();
    if (text.trim() === "") return;
    socket.emit("chat:message", text);
    setText("");
  };

  return (
    <div className="flex flex-col h-screen items-center justify-center bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">ThinkSpace Realtime Demo</h1>
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-4">
        <ul className="h-64 overflow-y-auto border mb-4 p-2">
          {messages.map((m, i) => (
            <li key={i} className="mb-1 text-sm">
              <span className="text-gray-500">[{new Date(m.ts).toLocaleTimeString()}]</span>{" "}
              <span className="font-mono text-blue-600">{m.id.slice(0, 4)}:</span>{" "}
              {m.text}
            </li>
          ))}
        </ul>

        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
          />
          <button className="bg-blue-500 text-white px-4 rounded">Send</button>
        </form>
      </div>
    </div>
  );
}
