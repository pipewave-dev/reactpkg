import { useState } from "react";
import { PipewaveProvider, PipewaveModuleConfig } from "@/context";
import { usePipewaveStatus } from "@/hooks/usePipewaveStatus";
import { usePipewaveSend } from "@/hooks/usePipewaveSend";
import { usePipewaveMessage } from "@/hooks/usePipewaveMessage";
import { usePipewaveResetConnection } from "@/hooks/usePipewaveConnection";

const accessToken = { value: "default" };
const config = new PipewaveModuleConfig({
  backendEndpoint: "localhost:8080/websocket",
  debug: true,
  enableLongPollingFallback: true,
  insecure: true,
  getAccessToken: async () => accessToken.value,
});

const ECHO_RESPONSE = "ECHO_RESPONSE";
const MSG_TYPE = "ECHO";
const decoder = new TextDecoder();
const encoder = new TextEncoder();

function StatusBadge() {
  const { status, isConnected } = usePipewaveStatus();
  return (
    <p>
      Status: <strong>{status}</strong>{" "}
      {isConnected ? "(Connected)" : "(Disconnected)"}
    </p>
  );
}

function Chat() {
  const [messages, setMessages] = useState<{ id: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const { send } = usePipewaveSend();
  const { status } = usePipewaveStatus();
  const { resetRetryCount } = usePipewaveResetConnection();

  usePipewaveMessage(ECHO_RESPONSE, async (data, id) => {
    const text = decoder.decode(data);
    setMessages((prev) => [...prev, { id, text }]);
  });

  const handleSend = () => {
    if (!input.trim()) return;
    send({
      id: crypto.randomUUID(),
      msgType: MSG_TYPE,
      data: encoder.encode(input),
    });
    setInput("");
  };

  return (
    <div style={{ padding: 24, maxWidth: 480 }}>
      <h2>WebSocket Example (New Hooks)</h2>
      <StatusBadge />
      {status === "SUSPEND" && (
        <div style={{ marginBottom: 8 }}>
          <button onClick={resetRetryCount}>Reset</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Type a message..."
          style={{ flex: 1, padding: 8 }}
        />
        <button onClick={handleSend} disabled={status !== "READY"}>
          Send
        </button>
      </div>

      <div>
        <h3>Received Messages</h3>
        {messages.length === 0 && <p>No messages yet.</p>}
        <ul style={{ listStyle: "none", padding: 0 }}>
          {messages.map((msg, i) => (
            <li
              key={i}
              style={{ padding: "4px 0", borderBottom: "1px solid #eee" }}
            >
              <small style={{ color: "#888" }}>[{msg.id}]</small> {msg.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function ExamplePage() {
  return (
    <PipewaveProvider config={config}>
      <Chat />
    </PipewaveProvider>
  );
}
