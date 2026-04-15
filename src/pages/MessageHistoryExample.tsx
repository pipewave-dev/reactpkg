import { usePipewaveMessageHistory } from "@/hooks/usePipewaveMessageHistory";

const CAT_FACT = "CAT_FACT";
const decoder = new TextDecoder();

export function MessageHistoryExample() {
  const history = usePipewaveMessageHistory<string>(CAT_FACT, {
    decode: (bytes) => decoder.decode(bytes),
    maxSize: 5,
  });

  return (
    <div>
      <p>
        Accumulates <code>{CAT_FACT}</code> messages from server push. Max 5
        entries.
      </p>
      {history.length === 0 ? (
        <p style={{ color: "#aaa" }}>No events yet…</p>
      ) : (
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {[...history].reverse().map((entry) => (
            <li
              key={entry.id}
              style={{ padding: "2px 0", borderBottom: "1px solid #eee" }}
            >
              <small style={{ color: "#888" }}>
                {entry.receivedAt.toLocaleTimeString()}
              </small>{" "}
              {entry.data}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
