import { useState } from "react";
import { usePipewave } from "@/hooks/usePipewave";

const PING = "PING";
const PONG = "PONG";
const decoder = new TextDecoder();
const encoder = new TextEncoder();

export function AllInOneExample() {
  const [log, setLog] = useState<string[]>([]);

  const { status, send } = usePipewave(
    {
      [PONG]: async (data) => {
        setLog((prev) => [...prev, `← PONG: ${decoder.decode(data)}`]);
      },
    },
    {
      [PING]: async (error) => {
        setLog((prev) => [...prev, `⚠ PING error: ${error}`]);
      },
    },
  );

  const handlePing = () => {
    const payload = new Date().toISOString();
    send({
      id: crypto.randomUUID(),
      msgType: PING,
      data: encoder.encode(payload),
    });
    setLog((prev) => [...prev, `→ PING: ${payload}`]);
  };

  return (
    <div>
      <p>
        Combined hook: sends <code>{PING}</code> + receives <code>{PONG}</code>{" "}
        in one call.
      </p>
      <p>
        Status: <strong>{status}</strong>
      </p>
      <button onClick={handlePing}>Send Ping</button>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          maxHeight: 160,
          overflowY: "auto",
        }}
      >
        {[...log].reverse().map((entry, i) => (
          <li
            key={i}
            style={{ padding: "2px 0", fontFamily: "monospace", fontSize: 13 }}
          >
            {entry}
          </li>
        ))}
      </ul>
    </div>
  );
}
