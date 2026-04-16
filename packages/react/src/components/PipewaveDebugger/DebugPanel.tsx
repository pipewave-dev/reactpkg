/* eslint-disable react-refresh/only-export-components */

import { useEffect, useState } from "react";
import type {
  CSSProperties,
  Dispatch,
  PointerEvent as ReactPointerEvent,
  SetStateAction,
} from "react";
import type {
  LogEntry,
  PanelSide,
  DebuggerLayout,
  OverlayWindowRect,
  DecoderDef,
} from "./types";
import { LogsTab } from "./LogsTab";

const WINDOW_GAP = 16;
const DEFAULT_WINDOW_WIDTH = 560;
const DEFAULT_WINDOW_HEIGHT = 640;
const MIN_WINDOW_WIDTH = 360;
const MIN_WINDOW_HEIGHT = 260;

type OverlayInteraction =
  | {
      type: "drag";
      startX: number;
      startY: number;
      startRect: OverlayWindowRect;
    }
  | {
      type: "resize";
      startX: number;
      startY: number;
      startRect: OverlayWindowRect;
    };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getOverlayConstraints() {
  if (typeof window === "undefined") {
    return {
      viewportWidth: DEFAULT_WINDOW_WIDTH + WINDOW_GAP * 2,
      viewportHeight: DEFAULT_WINDOW_HEIGHT + WINDOW_GAP * 2,
      maxWidth: DEFAULT_WINDOW_WIDTH,
      maxHeight: DEFAULT_WINDOW_HEIGHT,
      minWidth: MIN_WINDOW_WIDTH,
      minHeight: MIN_WINDOW_HEIGHT,
    };
  }

  const maxWidth = Math.max(280, window.innerWidth - WINDOW_GAP * 2);
  const maxHeight = Math.max(220, window.innerHeight - WINDOW_GAP * 2);

  return {
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    maxWidth,
    maxHeight,
    minWidth: Math.min(MIN_WINDOW_WIDTH, maxWidth),
    minHeight: Math.min(MIN_WINDOW_HEIGHT, maxHeight),
  };
}

function clampOverlayWindow(rect: OverlayWindowRect): OverlayWindowRect {
  const {
    viewportWidth,
    viewportHeight,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
  } = getOverlayConstraints();

  const width = clamp(rect.width, minWidth, maxWidth);
  const height = clamp(rect.height, minHeight, maxHeight);
  const maxLeft = Math.max(WINDOW_GAP, viewportWidth - width - WINDOW_GAP);
  const maxTop = Math.max(WINDOW_GAP, viewportHeight - height - WINDOW_GAP);

  return {
    top: clamp(rect.top, WINDOW_GAP, maxTop),
    left: clamp(rect.left, WINDOW_GAP, maxLeft),
    width,
    height,
  };
}

export function getDefaultOverlayWindow(
  panelSide: PanelSide,
): OverlayWindowRect {
  const { viewportWidth, maxWidth, maxHeight } = getOverlayConstraints();
  const width = Math.min(DEFAULT_WINDOW_WIDTH, maxWidth);
  const height = Math.min(DEFAULT_WINDOW_HEIGHT, maxHeight);
  const left =
    panelSide === "right" ? viewportWidth - width - WINDOW_GAP : WINDOW_GAP;

  return clampOverlayWindow({
    top: WINDOW_GAP,
    left,
    width,
    height,
  });
}

interface DebugPanelProps {
  logs: LogEntry[];
  enabled: boolean;
  onToggleEnabled: () => void;
  onClearLogs: () => void;
  onClose: () => void;
  maxLogs: number;
  onChangeMaxLogs: (n: number) => void;
  panelSide?: PanelSide;
  /** @internal DEBUG ONLY — simulates unintentional disconnect */
  onDebugDisconnect?: () => void;
  /** @internal DEBUG ONLY — force-reconnects after a debug disconnect */
  onDebugConnect?: () => void;
  layoutMode?: DebuggerLayout;
  overlayWindow?: OverlayWindowRect | null;
  onOverlayWindowChange?: Dispatch<SetStateAction<OverlayWindowRect | null>>;
  customDecoders?: DecoderDef[];
  defaultDecoderId?: string;
}

export function DebugPanel({
  logs,
  enabled,
  onToggleEnabled,
  onClearLogs,
  onClose,
  maxLogs,
  onChangeMaxLogs,
  panelSide = "left",
  onDebugDisconnect,
  onDebugConnect,
  layoutMode = "overlay",
  overlayWindow,
  onOverlayWindowChange,
  customDecoders = [],
  defaultDecoderId,
}: DebugPanelProps) {
  const isRight = panelSide === "right";
  const isOverlay = layoutMode === "overlay";
  const [interaction, setInteraction] = useState<OverlayInteraction | null>(
    null,
  );
  const windowRect = isOverlay
    ? clampOverlayWindow(overlayWindow ?? getDefaultOverlayWindow(panelSide))
    : null;

  useEffect(() => {
    if (!isOverlay || !onOverlayWindowChange) return;

    const handleResize = () => {
      onOverlayWindowChange((current) =>
        clampOverlayWindow(current ?? getDefaultOverlayWindow(panelSide)),
      );
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOverlay, onOverlayWindowChange, panelSide]);

  useEffect(() => {
    if (!interaction || !isOverlay || !onOverlayWindowChange) return;

    const handlePointerMove = (event: PointerEvent) => {
      const deltaX = event.clientX - interaction.startX;
      const deltaY = event.clientY - interaction.startY;

      if (interaction.type === "drag") {
        onOverlayWindowChange(
          clampOverlayWindow({
            ...interaction.startRect,
            left: interaction.startRect.left + deltaX,
            top: interaction.startRect.top + deltaY,
          }),
        );
        return;
      }

      const { minWidth, minHeight, viewportWidth, viewportHeight } =
        getOverlayConstraints();
      onOverlayWindowChange({
        ...interaction.startRect,
        width: clamp(
          interaction.startRect.width + deltaX,
          minWidth,
          viewportWidth - interaction.startRect.left - WINDOW_GAP,
        ),
        height: clamp(
          interaction.startRect.height + deltaY,
          minHeight,
          viewportHeight - interaction.startRect.top - WINDOW_GAP,
        ),
      });
    };

    const handlePointerUp = () => setInteraction(null);
    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;

    document.body.style.userSelect = "none";
    document.body.style.cursor =
      interaction.type === "drag" ? "grabbing" : "nwse-resize";

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;

      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [interaction, isOverlay, onOverlayWindowChange]);

  const handleHeaderPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!isOverlay || !windowRect) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest("button, input, label, select, textarea, a")) return;

    event.preventDefault();
    setInteraction({
      type: "drag",
      startX: event.clientX,
      startY: event.clientY,
      startRect: windowRect,
    });
  };

  const handleResizePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!isOverlay || !windowRect) return;

    event.preventDefault();
    event.stopPropagation();
    setInteraction({
      type: "resize",
      startX: event.clientX,
      startY: event.clientY,
      startRect: windowRect,
    });
  };

  const panelStyle: CSSProperties = {
    position: isOverlay ? "fixed" : "relative",
    top: isOverlay ? windowRect?.top : undefined,
    left: isOverlay ? windowRect?.left : undefined,
    width: isOverlay ? windowRect?.width : undefined,
    minWidth: isOverlay ? undefined : 320,
    maxWidth: isOverlay ? undefined : 480,
    height: isOverlay ? windowRect?.height : "100%",
    background: "#1e1e2e",
    border: isOverlay ? "1px solid #3a3a5a" : undefined,
    borderRight: isOverlay
      ? undefined
      : !isRight
        ? "1px solid #3a3a5a"
        : "none",
    borderLeft: isOverlay ? undefined : isRight ? "1px solid #3a3a5a" : "none",
    borderRadius: isOverlay ? 14 : 0,
    boxShadow: isOverlay
      ? "0 18px 48px rgba(0,0,0,0.45)"
      : "4px 0 16px rgba(0,0,0,0.3)",
    zIndex: isOverlay ? 10000 : 50,
    display: "flex",
    flexDirection: "column",
    fontFamily: "system-ui, -apple-system, sans-serif",
    overflow: "hidden",
    flexShrink: 0,
    boxSizing: "border-box",
    ...(isOverlay ? {} : { [panelSide]: 0 }),
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div
        onPointerDown={handleHeaderPointerDown}
        style={{
          padding: "10px 12px",
          background: "#2a2a3e",
          borderBottom: "1px solid #3a3a5a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          cursor: isOverlay
            ? interaction?.type === "drag"
              ? "grabbing"
              : "grab"
            : "default",
          touchAction: isOverlay ? "none" : undefined,
        }}
      >
        <span style={{ color: "#cdd6f4", fontSize: 13, fontWeight: 600 }}>
          🐛 Pipewave Debug
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Debug connect/disconnect buttons */}
          {onDebugDisconnect && (
            <button
              onClick={onDebugDisconnect}
              title="DEBUG: simulate unintentional disconnect (e.g. WiFi → 4G)"
              style={{
                background: "rgba(220, 38, 38, 0.15)",
                border: "1px solid rgba(220, 38, 38, 0.5)",
                borderRadius: 6,
                cursor: "pointer",
                color: "#f87171",
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 7px",
                lineHeight: 1.6,
                letterSpacing: "0.03em",
              }}
            >
              ⛔ Disconnect
            </button>
          )}
          {onDebugConnect && (
            <button
              onClick={onDebugConnect}
              title="DEBUG: force reconnect"
              style={{
                background: "rgba(22, 163, 74, 0.15)",
                border: "1px solid rgba(22, 163, 74, 0.5)",
                borderRadius: 6,
                cursor: "pointer",
                color: "#4ade80",
                fontSize: 10,
                fontWeight: 600,
                padding: "2px 7px",
                lineHeight: 1.6,
                letterSpacing: "0.03em",
              }}
            >
              ✅ Connect
            </button>
          )}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={enabled}
              onChange={onToggleEnabled}
              style={{ accentColor: "#6366f1", width: 13, height: 13 }}
            />
            <span style={{ color: "#a0a0c0", fontSize: 11 }}>Enable</span>
          </label>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#555",
              fontSize: 16,
              padding: "0 2px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        <LogsTab
          logs={logs}
          onClear={onClearLogs}
          maxLogs={maxLogs}
          onChangeMaxLogs={onChangeMaxLogs}
          customDecoders={customDecoders}
          defaultDecoderId={defaultDecoderId}
        />
      </div>

      {isOverlay && (
        <div
          onPointerDown={handleResizePointerDown}
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: 18,
            height: 18,
            cursor: "nwse-resize",
            touchAction: "none",
            background:
              "repeating-linear-gradient(135deg, transparent 0 4px, rgba(98,114,164,0.9) 4px 6px)",
            opacity: 0.85,
            borderBottomRightRadius: 14,
          }}
        />
      )}
    </div>
  );
}
