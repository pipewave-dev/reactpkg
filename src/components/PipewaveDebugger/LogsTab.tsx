import { Fragment, useRef, useEffect, useState, useMemo } from "react";
import type { CSSProperties } from "react";
import type { DecoderDef, DecoderOutput, LogEntry } from "./types";
import {
  STORAGE_KEY_ACTIVE,
  loadActiveId,
  normalizeDecoders,
} from "./decoders";

const LOG_TYPE_COLORS: Record<string, string> = {
  open: "#50fa7b",
  close: "#ffb86c",
  error: "#ff5555",
  recv: "#8be9fd",
  sent: "#69ff94",
  reconnect: "#f1fa8c",
  maxRetry: "#f1fa8c",
  transport: "#bd93f9",
  status: "#bd93f9",
};

const MSGTYPE_PALETTE = [
  "#8be9fd",
  "#50fa7b",
  "#ffb86c",
  "#ff79c6",
  "#bd93f9",
  "#f1fa8c",
  "#ff5555",
  "#6be5d0",
  "#a4c0ff",
  "#ffa0c0",
];
const _msgTypeColorMap = new Map<string, string>();
let _colorIdx = 0;
function getMsgTypeColor(msgType: string): string {
  if (!_msgTypeColorMap.has(msgType)) {
    _msgTypeColorMap.set(
      msgType,
      MSGTYPE_PALETTE[_colorIdx % MSGTYPE_PALETTE.length],
    );
    _colorIdx++;
  }
  return _msgTypeColorMap.get(msgType)!;
}

const MAX_LOG_OPTIONS = [10, 20, 50, 100, 200, 500];

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
}

function shortenId(id: string | undefined): string {
  if (!id || id === "-") return "-";
  return id.length > 8 ? `${id.slice(0, 6)}…` : id;
}

interface LogsTabProps {
  logs: LogEntry[];
  onClear: () => void;
  maxLogs: number;
  onChangeMaxLogs: (n: number) => void;
  customDecoders?: DecoderDef[];
  defaultDecoderId?: string;
}

function formatDecodedOutput(output: DecoderOutput): string {
  if (typeof output === "string") return output;
  if (output == null) return "null";

  try {
    return JSON.stringify(output, null, 2) ?? "null";
  } catch (error) {
    return `[decoder output is not serializable] ${error}`;
  }
}

export function LogsTab({
  logs,
  onClear,
  maxLogs,
  onChangeMaxLogs,
  customDecoders = [],
  defaultDecoderId,
}: LogsTabProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedMsgTypes, setSelectedMsgTypes] = useState<Set<string>>(
    new Set(),
  );

  const allDecoders = useMemo(
    () => normalizeDecoders(customDecoders),
    [customDecoders],
  );
  const [activeDecoderId, setActiveDecoderId] = useState<string>(() =>
    loadActiveId(allDecoders, defaultDecoderId),
  );

  useEffect(() => {
    queueMicrotask(() => {
      setActiveDecoderId((current) => {
        if (allDecoders.some((decoder) => decoder.id === current)) {
          return current;
        }

        return loadActiveId(allDecoders, defaultDecoderId);
      });
    });
  }, [allDecoders, defaultDecoderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const selectDecoder = (id: string) => {
    setActiveDecoderId(id);
    localStorage.setItem(STORAGE_KEY_ACTIVE, id);
  };

  const decodeData = (entry: LogEntry): string => {
    const raw = entry.raw;
    if (!raw) return "[no data]";

    const decoder = allDecoders.find((d) => d.id === activeDecoderId);
    if (!decoder) return "[no decoder]";
    try {
      return formatDecodedOutput(
        decoder.fn(raw, {
          msgId: entry.msgId,
          msgType: entry.msgType,
          returnToId: entry.returnToId,
          size: entry.size,
          hasError: entry.hasError,
        }),
      );
    } catch (e) {
      return `[Error] ${e}`;
    }
  };

  const allMsgTypes = useMemo(() => {
    const types = new Set<string>();
    for (const entry of logs) {
      if (
        (entry.type === "recv" || entry.type === "sent") &&
        entry.msgType != null
      ) {
        types.add(String(entry.msgType));
      }
    }
    return [...types].sort();
  }, [logs]);

  const toggleMsgType = (msgType: string) => {
    setSelectedMsgTypes((prev) => {
      const next = new Set(prev);
      if (next.has(msgType)) next.delete(msgType);
      else next.add(msgType);
      return next;
    });
  };

  const filteredLogs = useMemo(() => {
    if (selectedMsgTypes.size === 0) return logs;
    return logs.filter((entry) => {
      if (entry.type !== "recv" && entry.type !== "sent") return true;
      return selectedMsgTypes.has(String(entry.msgType ?? ""));
    });
  }, [logs, selectedMsgTypes]);

  const chipStyle = (active: boolean, color?: string): CSSProperties => ({
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 10,
    cursor: "pointer",
    border: `1px solid ${active ? (color ?? "#6366f1") : "#3a3a5a"}`,
    background: active ? `${color ?? "#6366f1"}22` : "#2a2a3e",
    color: active ? (color ?? "#a5b4fc") : "#a0a0c0",
    userSelect: "none",
  });

  const thStyle: CSSProperties = {
    padding: "4px 6px",
    textAlign: "left",
    color: "#6272a4",
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    borderBottom: "1px solid #2a2a3a",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    background: "#1e1e2e",
    zIndex: 1,
  };

  const tdStyle: CSSProperties = {
    padding: "4px 6px",
    fontSize: 11,
    fontFamily: "monospace",
    verticalAlign: "middle",
    borderBottom: "1px solid #13131f",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          padding: "6px 10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #3a3a5a",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#a0a0c0", fontSize: 11 }}>
          {selectedMsgTypes.size > 0 ? `${filteredLogs.length} / ` : ""}
          {logs.length} events
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: "#a0a0c0",
              fontSize: 11,
            }}
          >
            Max:
            <select
              value={maxLogs}
              onChange={(e) => onChangeMaxLogs(Number(e.target.value))}
              style={{
                background: "#2a2a3e",
                border: "1px solid #3a3a5a",
                color: "#cdd6f4",
                borderRadius: 4,
                fontSize: 11,
                padding: "1px 4px",
                cursor: "pointer",
              }}
            >
              {MAX_LOG_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={onClear}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#ff5555",
              fontSize: 11,
              padding: "2px 6px",
            }}
          >
            🗑 Clear
          </button>
        </div>
      </div>

      {/* MsgType filter bar */}
      {allMsgTypes.length > 0 && (
        <div
          style={{
            padding: "5px 10px",
            borderBottom: "1px solid #3a3a5a",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 4,
            flexShrink: 0,
          }}
        >
          <span style={{ color: "#6272a4", fontSize: 10 }}>MsgType:</span>
          {allMsgTypes.map((msgType) => {
            const c = getMsgTypeColor(msgType);
            return (
              <span
                key={msgType}
                style={chipStyle(selectedMsgTypes.has(msgType), c)}
                onClick={() => toggleMsgType(msgType)}
              >
                {msgType}
              </span>
            );
          })}
          {selectedMsgTypes.size > 0 && (
            <span
              style={chipStyle(true, "#ff5555")}
              onClick={() => setSelectedMsgTypes(new Set())}
            >
              ✕ clear
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filteredLogs.length === 0 ? (
          <div
            style={{
              color: "#555",
              fontSize: 11,
              textAlign: "center",
              marginTop: 20,
            }}
          >
            No events yet
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, minWidth: 68, width: 68 }}>Time</th>
                <th style={{ ...thStyle, minWidth: 64, width: 64 }}>Type</th>
                <th
                  style={{ ...thStyle, minWidth: 60, maxWidth: 80, width: 72 }}
                >
                  ID
                </th>
                <th style={thStyle}>MsgType</th>
                <th
                  style={{ ...thStyle, minWidth: 60, maxWidth: 90, width: 80 }}
                >
                  ReturnToID
                </th>
                <th style={{ ...thStyle, minWidth: 44, width: 44 }}>Size</th>
                <th style={{ ...thStyle, minWidth: 30, width: 30 }}>Err</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((entry) => {
                const isData = entry.type === "recv" || entry.type === "sent";
                const isExpanded = expandedId === entry.id;
                const typeColor = LOG_TYPE_COLORS[entry.type] ?? "#cdd6f4";
                const accentColor =
                  isData && entry.msgType != null
                    ? getMsgTypeColor(String(entry.msgType))
                    : typeColor;

                return (
                  <Fragment key={entry.id}>
                    <tr
                      onClick={() =>
                        isData && setExpandedId(isExpanded ? null : entry.id)
                      }
                      style={{
                        cursor: isData ? "pointer" : "default",
                        background: isExpanded ? "#151520" : "transparent",
                        boxShadow: `inset 3px 0 0 ${accentColor}`,
                      }}
                    >
                      <td
                        style={{
                          ...tdStyle,
                          color: "#555",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatTime(entry.timestamp)}
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        <span
                          style={{
                            color: typeColor,
                            fontSize: 9,
                            fontWeight: "bold",
                            textTransform: "uppercase",
                            background: `${typeColor}22`,
                            padding: "1px 5px",
                            borderRadius: 3,
                          }}
                        >
                          {entry.type}
                          {isData ? (isExpanded ? " ▲" : " ▼") : ""}
                        </span>
                      </td>
                      {isData ? (
                        <>
                          <td
                            style={{
                              ...tdStyle,
                              color: "#cdd6f4",
                              maxWidth: 80,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={entry.msgId}
                          >
                            {shortenId(entry.msgId)}
                          </td>
                          <td style={tdStyle}>
                            {entry.msgType != null && (
                              <span
                                style={{
                                  color: getMsgTypeColor(String(entry.msgType)),
                                  background: `${getMsgTypeColor(String(entry.msgType))}22`,
                                  padding: "1px 5px",
                                  borderRadius: 3,
                                  fontSize: 10,
                                  fontWeight: "bold",
                                }}
                              >
                                {String(entry.msgType)}
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              ...tdStyle,
                              color: "#a0a0c0",
                              maxWidth: 90,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={entry.returnToId || "-"}
                          >
                            {entry.returnToId || "-"}
                          </td>
                          <td
                            style={{
                              ...tdStyle,
                              color: "#a0a0c0",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {entry.size != null ? `${entry.size}B` : "-"}
                          </td>
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            {entry.hasError ? (
                              <span style={{ color: "#ff5555", fontSize: 12 }}>
                                ✗
                              </span>
                            ) : (
                              <span style={{ color: "#50fa7b", fontSize: 12 }}>
                                ✓
                              </span>
                            )}
                          </td>
                        </>
                      ) : (
                        <td
                          colSpan={5}
                          style={{ ...tdStyle, color: "#a0a0c0" }}
                        >
                          {entry.message}
                        </td>
                      )}
                    </tr>
                    {isExpanded && entry.raw && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div
                            style={{
                              borderTop: "1px solid #2a2a3a",
                              padding: "8px",
                              background: "#080d14",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 4,
                                marginBottom: 6,
                              }}
                            >
                              {allDecoders.map((d) => (
                                <span
                                  key={d.id}
                                  style={chipStyle(d.id === activeDecoderId)}
                                  onClick={() => selectDecoder(d.id)}
                                >
                                  {d.name}
                                </span>
                              ))}
                            </div>
                            <pre
                              style={{
                                margin: 0,
                                background: "#0d1117",
                                border: "1px solid #2a2a3a",
                                borderRadius: 4,
                                padding: 8,
                                color: "#cdd6f4",
                                fontSize: 10,
                                fontFamily: "monospace",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-all",
                                maxHeight: 200,
                                overflowY: "auto",
                              }}
                            >
                              {decodeData(entry)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
