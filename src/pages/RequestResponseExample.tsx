import { useState } from "react";
import { usePipewaveSendWaitAck } from "@/hooks/usePipewaveSendWaitAck";

const REQ_RES = "REQ_RES";
const encoder = new TextEncoder();

export function RequestResponseExample() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "waiting" | "ack" | "timeout">(
    "idle",
  );
  const [res, setRes] = useState<string | null>(null);

  const { sendWaitAck } = usePipewaveSendWaitAck(5000);

  const handleReq = async () => {
    if (!query.trim()) return;
    setStatus("waiting");
    const id = crypto.randomUUID();
    const { ackOk, data } = await sendWaitAck({
      id,
      msgType: REQ_RES,
      data: encoder.encode(query),
    });

    if (data) {
      const response = new TextDecoder().decode(data);
      setRes(response);
    }
    setStatus(ackOk ? "ack" : "timeout");
  };

  return (
    <div>
      <p>
        Sends <code>{REQ_RES}</code>, waits for Ack — a <code>{REQ_RES}</code>{" "}
        response with <code>ReturnToId</code> matching the sent <code>id</code>.
        Timeout: 5s.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search query..."
          style={{ flex: 1, padding: 6 }}
        />
        <button
          onClick={handleReq}
          disabled={status === "waiting" || !query.trim()}
        >
          {status === "waiting" ? "Waiting…" : "Search"}
        </button>
      </div>
      {status === "ack" && <p style={{ color: "green" }}>✓ Ack received</p>}
      {status === "timeout" && (
        <p style={{ color: "red" }}>✗ Timeout (no Ack in 5s)</p>
      )}
      {res && <p>{res}</p>}
    </div>
  );
}
