// src/components/PipewaveDebugger/PipewaveDebugger.tsx
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { usePipewaveWsEventHandler, usePipewaveWsApi } from "@/context";
import type {
  LogEntry,
  PanelSide,
  ButtonPosition,
  DebuggerLayout,
  OverlayWindowRect,
  DecoderDef,
} from "./types";
import { DebugPanel, getDefaultOverlayWindow } from "./DebugPanel";
import { Fragment } from "react";

export type { PanelSide, ButtonPosition, DecoderDef } from "./types";

export interface PipewaveDebuggerProps {
  defaultEnabled?: boolean;
  maxLogs?: number;
  buttonLabel?: string;
  buttonPosition?: ButtonPosition;
  panelSide?: PanelSide;
  layoutMode?: DebuggerLayout;
  customDecoders?: DecoderDef[];
  defaultDecoderId?: string;
}

export function PipewaveDebugger({
  defaultEnabled = true,
  maxLogs: initialMaxLogs = 200,
  buttonLabel = "🐛 PW",
  buttonPosition = { bottom: 16, left: 16 },
  panelSide = "left",
  layoutMode = "overlay",
  customDecoders = [],
  defaultDecoderId,
}: PipewaveDebuggerProps) {
  const wsHandler = usePipewaveWsEventHandler();
  const wsApi = usePipewaveWsApi();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [hovered, setHovered] = useState(false);
  const [maxLogs, setMaxLogs] = useState(initialMaxLogs);
  const [overlayWindow, setOverlayWindow] = useState<OverlayWindowRect | null>(
    null,
  );

  const addLog = useCallback(
    (entry: Omit<LogEntry, "id" | "timestamp">) => {
      setLogs((prev) => {
        const next: LogEntry = {
          ...entry,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        };
        const updated = [...prev, next];
        return updated.length > maxLogs
          ? updated.slice(updated.length - maxLogs)
          : updated;
      });
    },
    [maxLogs],
  );

  useEffect(() => {
    const fns: (() => void)[] = [];
    if (enabled) {
      fns.push(
        wsHandler.setOnOpen(async () =>
          addLog({ type: "open", message: "Connection opened" }),
        ),
      );
      fns.push(
        wsHandler.setOnClose(async () =>
          addLog({ type: "close", message: "Connection closed" }),
        ),
      );
      fns.push(
        wsHandler.setOnError(async (e) => {
          const msg =
            (e instanceof ErrorEvent ? e.message : e.type) || "Unknown error";
          addLog({ type: "error", message: msg });
        }),
      );
      fns.push(
        wsHandler.setOnData(async (data) => {
          const returnToId = (data as { ReturnToId?: string }).ReturnToId;
          addLog({
            type: "recv",
            message: `Id: ${data.Id} | MsgType: ${data.MsgType} | ReturnToId: ${returnToId || "-"} | ${data.Data?.length ?? 0}B | hasError: ${!!data.Error}`,
            raw: data.Data,
            msgId: data.Id,
            msgType: data.MsgType,
            returnToId: returnToId,
            size: data.Data?.length ?? 0,
            hasError: !!data.Error,
          });
        }),
      );
      fns.push(
        wsHandler.setOnSend(async ({ id, msgType, data }) => {
          addLog({
            type: "sent",
            message: `Id: ${id} | MsgType: ${msgType} | ${data.length}B`,
            raw: data,
            msgId: id,
            msgType,
            size: data.length,
          });
        }),
      );
      fns.push(
        wsHandler.setOnMaxRetry(async () =>
          addLog({
            type: "maxRetry",
            message: "Max retry reached — connection suspended",
          }),
        ),
      );
      fns.push(
        wsHandler.setOnReconnect(async (attempt) =>
          addLog({
            type: "reconnect",
            message: `Reconnect attempt #${attempt}`,
          }),
        ),
      );
      fns.push(
        wsHandler.setOnTransportChange(async (transport) =>
          addLog({
            type: "transport",
            message: `Transport changed: ${transport}`,
          }),
        ),
      );
      fns.push(
        wsHandler.setOnStatusChange(async (status) =>
          addLog({ type: "status", message: `Status: ${status}` }),
        ),
      );
    }
    return () => fns.forEach((fn) => fn());
  }, [enabled, wsHandler, addLog]);

  useEffect(() => {
    if (layoutMode !== "overlay" || !open || overlayWindow) return;
    queueMicrotask(() => setOverlayWindow(getDefaultOverlayWindow(panelSide)));
  }, [layoutMode, open, overlayWindow, panelSide]);

  const togglePanel = useCallback(() => {
    if (!open && layoutMode === "overlay" && !overlayWindow) {
      setOverlayWindow(getDefaultOverlayWindow(panelSide));
    }
    setOpen((current) => !current);
  }, [layoutMode, open, overlayWindow, panelSide]);

  const toggleButton = !open
    ? createPortal(
        <div
          onClick={togglePanel}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            position: "fixed",
            ...buttonPosition,
            zIndex: 9999,
            background: "rgba(99, 102, 241, 0.85)",
            color: "white",
            padding: "5px 12px",
            borderRadius: 14,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            opacity: hovered ? 1 : 0.7,
            transition: "opacity 0.15s",
            userSelect: "none",
            fontFamily: "system-ui, -apple-system, sans-serif",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {buttonLabel}
        </div>,
        document.body,
      )
    : null;

  const panel = open && (
    <DebugPanel
      logs={logs}
      enabled={enabled}
      onToggleEnabled={() => setEnabled((e) => !e)}
      onClearLogs={() => setLogs([])}
      onClose={() => setOpen(false)}
      maxLogs={maxLogs}
      onChangeMaxLogs={(n) => {
        setMaxLogs(n);
        setLogs((prev) =>
          prev.length > n ? prev.slice(prev.length - n) : prev,
        );
      }}
      panelSide={panelSide}
      onDebugDisconnect={() => wsApi.debugForceDisconnect()}
      onDebugConnect={() => wsApi.debugForceConnect()}
      layoutMode={layoutMode}
      overlayWindow={overlayWindow}
      onOverlayWindowChange={setOverlayWindow}
      customDecoders={customDecoders}
      defaultDecoderId={defaultDecoderId}
    />
  );

  if (layoutMode === "docked") {
    // Render panel directly in the DOM tree so it participates in flex layout
    return (
      <Fragment>
        {toggleButton}
        {panel}
      </Fragment>
    );
  }

  return (
    <Fragment>
      {toggleButton}
      {panel ? createPortal(panel, document.body) : null}
    </Fragment>
  );
}
