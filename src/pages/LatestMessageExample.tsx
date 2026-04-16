import { usePipewaveLatestMessage } from "@pipewave/react";

const MEM_INFO = "MEM_INFO";
const decoder = new TextDecoder();

export function LatestMessageExample() {
  const latest = usePipewaveLatestMessage<string>(MEM_INFO, {
    decode: (bytes) => decoder.decode(bytes),
  });

  return (
    <div>
      <p>
        Listens to <code>{MEM_INFO}</code> — server pushes a price every few
        seconds. Only the <em>latest</em> value is shown.
      </p>
      {latest ? (
        <div>
          <p>
            <strong>Latest Mem usage:</strong> {latest.data}
          </p>
          <p style={{ color: "#888", fontSize: 13 }}>
            id: {latest.id} &nbsp;|&nbsp; received:{" "}
            {latest.receivedAt.toLocaleTimeString()}
          </p>
        </div>
      ) : (
        <p style={{ color: "#aaa" }}>Waiting for first tick…</p>
      )}
    </div>
  );
}
