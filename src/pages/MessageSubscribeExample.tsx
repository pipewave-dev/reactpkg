import { useState } from "react";
import { usePipewaveMessage, usePipewaveSend } from "@pipewave/react";

const ECHO = "ECHO";
const ECHO_RESPONSE = "ECHO_RESPONSE";
const decoder = new TextDecoder();
const encoder = new TextEncoder();

export function MessageSubscribeExample() {
  const { send } = usePipewaveSend();
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");

  usePipewaveMessage(ECHO_RESPONSE, async (data) => {
    setMessages((prev) => [...prev, decoder.decode(data)]);
  });

  const handleSend = () => {
    if (!input.trim()) return;
    send({
      id: crypto.randomUUID(),
      msgType: ECHO,
      data: encoder.encode(input),
    });
    setInput("");
  };

  return (
    <div>
      <p>
        Subscribes to <code>{ECHO_RESPONSE}</code>. Backend echoes back what you
        send.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type to echo..."
          style={{ flex: 1, padding: 6 }}
        />
        <button onClick={handleSend}>Echo</button>
      </div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {messages.map((m, i) => (
          <li key={i} style={{ padding: "2px 0" }}>
            ← {m}
          </li>
        ))}
      </ul>
    </div>
  );
}
