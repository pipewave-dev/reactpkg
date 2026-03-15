# ExamplePage Hooks Coverage Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand `src/pages/Example.tsx` to showcase all hooks in `src/hooks/` as individual, clearly-labeled demo components on a single page, and produce a `BACKEND-REQUEST-TASK.md` guide for building the matching Go backend.

**Architecture:** One `ExamplePage` component wraps everything in a single `PipewaveProvider`. Each hook gets its own self-contained demo component, stacked vertically and separated by a visible section header. The Go backend document maps each frontend message type to a concrete handler pattern.

**Tech Stack:** React 18+, TypeScript, Pipewave React SDK (all hooks from `src/hooks/`), Go 1.21+ (for backend doc)

---

## Chunk 1: File Structure & Section Layout

### Task 1: Define file structure and all message-type constants

**Files:**
- Modify: `src/pages/Example.tsx`

**Design decisions (lock in before coding):**

| Example component | Hook(s) used | msgType sent | msgType received |
|---|---|---|---|
| `ConnectionStatusExample` | `usePipewaveStatus` | — | — |
| `ConnectionInfoExample` | `usePipewaveConnectionInfo` | — | — |
| `DebugLoggerExample` | `useDebugLogger` | — | — |
| `SendOnlyExample` | `usePipewaveSend` | `FIRE_AND_FORGET` | — |
| `MessageSubscribeExample` | `usePipewaveMessage` | `ECHO` | `ECHO_RESPONSE` |
| `ErrorSubscribeExample` | `usePipewaveError` | `ERROR_TEST` | error on `ERROR_TEST` |
| `LatestMessageExample` | `usePipewaveLatestMessage` | — | `PRICE_TICK` (server-push) |
| `MessageHistoryExample` | `usePipewaveMessageHistory` | — | `EVENT_LOG` (server-push) |
| `RequestResponseExample` | `usePipewaveSendWaitAck` | `SEARCH_REQ` | `SEARCH_RES` (via ReturnToId) |
| `AllInOneExample` | `usePipewave` | `PING` | `PONG` |
| `ResetConnectionExample` | `usePipewaveResetConnection` | — | — |

**Section header helper** (shared UI, placed at top of file):

```tsx
function SectionHeader({ title, hook }: { title: string; hook: string }) {
  return (
    <div style={{
      borderTop: "3px solid #333",
      margin: "32px 0 16px",
      paddingTop: 12,
    }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      <code style={{ fontSize: 12, color: "#666" }}>{hook}</code>
    </div>
  );
}
```

- [ ] **Step 1: Replace Example.tsx with the new skeleton**

Keep the existing `config` block. Replace the body with:
1. `SectionHeader` helper component (above)
2. All constants for every msgType (`ECHO`, `ECHO_RESPONSE`, `FIRE_AND_FORGET`, `ERROR_TEST`, `PRICE_TICK`, `EVENT_LOG`, `SEARCH_REQ`, `SEARCH_RES`, `PING`, `PONG`)
3. Stub for each example component (just returns `<p>TODO</p>`)
4. New `ExamplePage` that renders all stubs in order wrapped in `PipewaveProvider`

```tsx
import { useState } from "react";
import { PipewaveProvider, PipewaveModuleConfig } from "@/context";
import { usePipewaveStatus } from "@/hooks/usePipewaveStatus";
import { usePipewaveConnectionInfo } from "@/hooks/usePipewaveConnectionInfo";
import { usePipewaveSend } from "@/hooks/usePipewaveSend";
import { usePipewaveMessage } from "@/hooks/usePipewaveMessage";
import { usePipewaveError } from "@/hooks/usePipewaveError";
import { usePipewaveLatestMessage } from "@/hooks/usePipewaveLatestMessage";
import { usePipewaveMessageHistory } from "@/hooks/usePipewaveMessageHistory";
import { usePipewaveSendWaitAck } from "@/hooks/usePipewaveSendWaitAck";
import { usePipewave } from "@/hooks/usePipewave";
import { usePipewaveResetConnection } from "@/hooks/usePipewaveConnection";
import { useDebugLogger } from "@/hooks/useDebugLogger";

const accessToken = { value: "default" };
const config = new PipewaveModuleConfig({
  backendEndpoint: "localhost:8080/websocket",
  debug: true,
  enableLongPollingFallback: true,
  insecure: true,
  getAccessToken: async () => accessToken.value,
});

// --- Message Type Constants ---
const ECHO = "ECHO";
const ECHO_RESPONSE = "ECHO_RESPONSE";
const FIRE_AND_FORGET = "FIRE_AND_FORGET";
const ERROR_TEST = "ERROR_TEST";
const PRICE_TICK = "PRICE_TICK";
const EVENT_LOG = "EVENT_LOG";
const SEARCH_REQ = "SEARCH_REQ";
const SEARCH_RES = "SEARCH_RES";
const PING = "PING";
const PONG = "PONG";

const decoder = new TextDecoder();
const encoder = new TextEncoder();

function SectionHeader({ title, hook }: { title: string; hook: string }) {
  return (
    <div style={{ borderTop: "3px solid #333", margin: "32px 0 16px", paddingTop: 12 }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      <code style={{ fontSize: 12, color: "#666" }}>{hook}</code>
    </div>
  );
}

function ConnectionStatusExample() { return <p>TODO</p>; }
function ConnectionInfoExample()   { return <p>TODO</p>; }
function DebugLoggerExample()      { return <p>TODO</p>; }
function SendOnlyExample()         { return <p>TODO</p>; }
function MessageSubscribeExample() { return <p>TODO</p>; }
function ErrorSubscribeExample()   { return <p>TODO</p>; }
function LatestMessageExample()    { return <p>TODO</p>; }
function MessageHistoryExample()   { return <p>TODO</p>; }
function RequestResponseExample()  { return <p>TODO</p>; }
function AllInOneExample()         { return <p>TODO</p>; }
function ResetConnectionExample()  { return <p>TODO</p>; }

export default function ExamplePage() {
  return (
    <PipewaveProvider config={config}>
      <div style={{ padding: 24, maxWidth: 640, fontFamily: "sans-serif" }}>
        <h1>Pipewave React — Hook Examples</h1>

        <SectionHeader title="Connection Status" hook="usePipewaveStatus" />
        <ConnectionStatusExample />

        <SectionHeader title="Connection Info (Status + Transport)" hook="usePipewaveConnectionInfo" />
        <ConnectionInfoExample />

        <SectionHeader title="Debug Logger" hook="useDebugLogger" />
        <DebugLoggerExample />

        <SectionHeader title="Send Only (Fire & Forget)" hook="usePipewaveSend" />
        <SendOnlyExample />

        <SectionHeader title="Subscribe to Message Type" hook="usePipewaveMessage" />
        <MessageSubscribeExample />

        <SectionHeader title="Subscribe to Error Type" hook="usePipewaveError" />
        <ErrorSubscribeExample />

        <SectionHeader title="Latest Message (Server Push)" hook="usePipewaveLatestMessage" />
        <LatestMessageExample />

        <SectionHeader title="Message History (Server Push)" hook="usePipewaveMessageHistory" />
        <MessageHistoryExample />

        <SectionHeader title="Request → Response" hook="usePipewaveRequest" />
        <RequestResponseExample />

        <SectionHeader title="All-in-One (send + receive)" hook="usePipewave" />
        <AllInOneExample />

        <SectionHeader title="Reset Connection" hook="usePipewaveResetConnection" />
        <ResetConnectionExample />
      </div>
    </PipewaveProvider>
  );
}
```

- [ ] **Step 2: Verify the page compiles and renders all "TODO" stubs**

Run: `npm run dev` (or `yarn dev`) and open the example page in browser.
Expected: Page loads, all 11 section headers visible, each shows "TODO".

- [ ] **Step 3: Commit skeleton**

```bash
git add src/pages/Example.tsx
git commit -m "feat(examples): add ExamplePage skeleton with all hook sections"
```

---

## Chunk 2: Implement Example Components

### Task 2: `ConnectionStatusExample` — `usePipewaveStatus`

**Files:**
- Modify: `src/pages/Example.tsx`

- [ ] **Step 1: Replace `ConnectionStatusExample` stub**

```tsx
function ConnectionStatusExample() {
  const { status, isConnected, isReconnecting, isSuspended } = usePipewaveStatus();

  const badgeColor = isConnected
    ? "green"
    : isReconnecting
    ? "orange"
    : isSuspended
    ? "red"
    : "gray";

  return (
    <div>
      <p>
        <strong>status:</strong>{" "}
        <span style={{ color: badgeColor, fontWeight: "bold" }}>{status}</span>
      </p>
      <p>isConnected: {String(isConnected)}</p>
      <p>isReconnecting: {String(isReconnecting)}</p>
      <p>isSuspended: {String(isSuspended)}</p>
    </div>
  );
}
```

---

### Task 3: `ConnectionInfoExample` — `usePipewaveConnectionInfo`

- [ ] **Step 1: Replace `ConnectionInfoExample` stub**

```tsx
function ConnectionInfoExample() {
  const { status, transport } = usePipewaveConnectionInfo();

  return (
    <div>
      <p><strong>status:</strong> {status}</p>
      <p><strong>transport:</strong> {transport ?? <em>N/A (not yet connected)</em>}</p>
    </div>
  );
}
```

---

### Task 4: `DebugLoggerExample` — `useDebugLogger`

- [ ] **Step 1: Replace `DebugLoggerExample` stub**

```tsx
function DebugLoggerExample() {
  const [enabled, setEnabled] = useState(true);
  useDebugLogger(enabled);

  return (
    <div>
      <p>Open browser DevTools → Console to see debug logs.</p>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />{" "}
        Enable debug logger
      </label>
    </div>
  );
}
```

---

### Task 5: `SendOnlyExample` — `usePipewaveSend`

- [ ] **Step 1: Replace `SendOnlyExample` stub**

```tsx
function SendOnlyExample() {
  const { send } = usePipewaveSend();
  const [sentCount, setSentCount] = useState(0);

  const handleSend = () => {
    send({
      id: crypto.randomUUID(),
      msgType: FIRE_AND_FORGET,
      data: encoder.encode(`ping #${sentCount + 1}`),
    });
    setSentCount((n) => n + 1);
  };

  return (
    <div>
      <p>Sends a message without waiting for a response.</p>
      <button onClick={handleSend}>Send Fire-and-Forget</button>
      <p>Sent: {sentCount} message(s)</p>
    </div>
  );
}
```

---

### Task 6: `MessageSubscribeExample` — `usePipewaveMessage`

- [ ] **Step 1: Replace `MessageSubscribeExample` stub**

```tsx
function MessageSubscribeExample() {
  const { send } = usePipewaveSend();
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");

  usePipewaveMessage(ECHO_RESPONSE, async (data) => {
    setMessages((prev) => [...prev, decoder.decode(data)]);
  });

  const handleSend = () => {
    if (!input.trim()) return;
    send({ id: crypto.randomUUID(), msgType: ECHO, data: encoder.encode(input) });
    setInput("");
  };

  return (
    <div>
      <p>Subscribes to <code>{ECHO_RESPONSE}</code>. Backend echoes back what you send.</p>
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
        {messages.map((m, i) => <li key={i} style={{ padding: "2px 0" }}>← {m}</li>)}
      </ul>
    </div>
  );
}
```

---

### Task 7: `ErrorSubscribeExample` — `usePipewaveError`

- [ ] **Step 1: Replace `ErrorSubscribeExample` stub**

```tsx
function ErrorSubscribeExample() {
  const { send } = usePipewaveSend();
  const [errors, setErrors] = useState<string[]>([]);

  usePipewaveError(ERROR_TEST, async (error, id) => {
    setErrors((prev) => [...prev, `[${id.slice(0, 8)}] ${error}`]);
  });

  const triggerError = () => {
    send({
      id: crypto.randomUUID(),
      msgType: ERROR_TEST,
      data: encoder.encode("intentional error"),
    });
  };

  return (
    <div>
      <p>
        Sends <code>{ERROR_TEST}</code>; backend responds with an error. Hook captures it.
      </p>
      <button onClick={triggerError}>Trigger Error</button>
      <ul style={{ listStyle: "none", padding: 0, color: "red" }}>
        {errors.map((e, i) => <li key={i}>⚠ {e}</li>)}
      </ul>
    </div>
  );
}
```

---

### Task 8: `LatestMessageExample` — `usePipewaveLatestMessage`

- [ ] **Step 1: Replace `LatestMessageExample` stub**

```tsx
function LatestMessageExample() {
  const latest = usePipewaveLatestMessage<string>(PRICE_TICK, {
    decode: (bytes) => decoder.decode(bytes),
  });

  return (
    <div>
      <p>
        Listens to <code>{PRICE_TICK}</code> — server pushes a price every few seconds.
        Only the <em>latest</em> value is shown.
      </p>
      {latest ? (
        <div>
          <p><strong>Latest price:</strong> {latest.data}</p>
          <p style={{ color: "#888", fontSize: 13 }}>
            id: {latest.id.slice(0, 8)} &nbsp;|&nbsp;
            received: {latest.receivedAt.toLocaleTimeString()}
          </p>
        </div>
      ) : (
        <p style={{ color: "#aaa" }}>Waiting for first tick…</p>
      )}
    </div>
  );
}
```

---

### Task 9: `MessageHistoryExample` — `usePipewaveMessageHistory`

- [ ] **Step 1: Replace `MessageHistoryExample` stub**

```tsx
function MessageHistoryExample() {
  const history = usePipewaveMessageHistory<string>(EVENT_LOG, {
    decode: (bytes) => decoder.decode(bytes),
    maxSize: 20,
  });

  return (
    <div>
      <p>
        Accumulates <code>{EVENT_LOG}</code> messages from server push. Max 20 entries.
      </p>
      {history.length === 0 ? (
        <p style={{ color: "#aaa" }}>No events yet…</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, maxHeight: 200, overflowY: "auto" }}>
          {[...history].reverse().map((entry) => (
            <li key={entry.id} style={{ padding: "2px 0", borderBottom: "1px solid #eee" }}>
              <small style={{ color: "#888" }}>{entry.receivedAt.toLocaleTimeString()}</small>{" "}
              {entry.data}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

---

### Task 10: `RequestResponseExample` — `usePipewaveSendWaitAck`

> **Note:** Hook `usePipewaveRequest` không tồn tại. Dùng `usePipewaveSendWaitAck` — trả về
> `Promise<boolean>` (true = Ack nhận được, false = timeout/lỗi).
> Ack được xác định là message có cùng `MsgType` và `ReturnToId === id` của request.

- [ ] **Step 1: Replace `RequestResponseExample` stub**

```tsx
function RequestResponseExample() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "waiting" | "ack" | "timeout">("idle");

  const { sendWaitAck } = usePipewaveSendWaitAck(5000);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setStatus("waiting");
    const id = crypto.randomUUID();
    const acked = await sendWaitAck({
      id,
      msgType: SEARCH_REQ,
      data: encoder.encode(query),
    });
    setStatus(acked ? "ack" : "timeout");
  };

  return (
    <div>
      <p>
        Sends <code>{SEARCH_REQ}</code>, waits for Ack — a <code>{SEARCH_REQ}</code> response
        with <code>ReturnToId</code> matching the sent <code>id</code>. Timeout: 5s.
      </p>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search query..."
          style={{ flex: 1, padding: 6 }}
        />
        <button onClick={handleSearch} disabled={status === "waiting" || !query.trim()}>
          {status === "waiting" ? "Waiting…" : "Search"}
        </button>
      </div>
      {status === "ack" && <p style={{ color: "green" }}>✓ Ack received</p>}
      {status === "timeout" && <p style={{ color: "red" }}>✗ Timeout (no Ack in 5s)</p>}
    </div>
  );
}
```

---

### Task 11: `AllInOneExample` — `usePipewave`

- [ ] **Step 1: Replace `AllInOneExample` stub**

```tsx
function AllInOneExample() {
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
    }
  );

  const handlePing = () => {
    const payload = new Date().toISOString();
    send({ id: crypto.randomUUID(), msgType: PING, data: encoder.encode(payload) });
    setLog((prev) => [...prev, `→ PING: ${payload}`]);
  };

  return (
    <div>
      <p>
        Combined hook: manages connection + sends <code>{PING}</code> + receives{" "}
        <code>{PONG}</code> in one call.
      </p>
      <p>Status: <strong>{status}</strong></p>
      <button onClick={handlePing}>Send Ping</button>
      <ul style={{ listStyle: "none", padding: 0, maxHeight: 160, overflowY: "auto" }}>
        {[...log].reverse().map((entry, i) => (
          <li key={i} style={{ padding: "2px 0", fontFamily: "monospace", fontSize: 13 }}>
            {entry}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

### Task 12: `ResetConnectionExample` — `usePipewaveResetConnection`

- [ ] **Step 1: Replace `ResetConnectionExample` stub**

```tsx
function ResetConnectionExample() {
  const { status, isSuspended } = usePipewaveStatus();
  const { resetRetryCount } = usePipewaveResetConnection();

  return (
    <div>
      <p>
        When status is <code>SUSPEND</code> (max retries hit), click Reset to allow
        reconnection attempts again.
      </p>
      <p>Current status: <strong>{status}</strong></p>
      <button onClick={resetRetryCount} disabled={!isSuspended}>
        Reset Retry Count
      </button>
      {!isSuspended && (
        <p style={{ color: "#aaa", fontSize: 13 }}>
          (button active only when suspended)
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit all example components**

```bash
git add src/pages/Example.tsx
git commit -m "feat(examples): implement all hook example components"
```

---

## Chunk 3: BACKEND-REQUEST-TASK.md

### Task 13: Create `BACKEND-REQUEST-TASK.md`

**Files:**
- Create: `BACKEND-REQUEST-TASK.md` (at repo root)

- [ ] **Step 1: Write the backend task document**

```markdown
# Backend Task: Pipewave Example Server (Go)

This document describes all WebSocket message types used by the frontend ExamplePage
and how a Go backend should handle each one.

## Setup

The backend must:
1. Listen on `:8080` with a WebSocket endpoint at `/websocket`.
2. Accept Pipewave's binary-framed protocol.
3. Return messages using the same `id` that was sent (for request-response matching).

> **Pipewave wire format (simplified):**
> Each frame contains: `msgType` (string), `id` (UUID string), `data` (raw bytes).
> The backend reads these fields and writes frames with the same structure.
> Refer to the Pipewave server SDK docs for the exact frame codec.

---

## Message Handlers

### 1. `ECHO` → `ECHO_RESPONSE`

**Used by:** `MessageSubscribeExample` (`usePipewaveMessage`)

**Behavior:** Echo the exact `data` bytes back with type `ECHO_RESPONSE` and the same `id`.

```go
case "ECHO":
    conn.Send(ctx, Frame{
        MsgType: "ECHO_RESPONSE",
        ID:      frame.ID,
        Data:    frame.Data,
    })
```

---

### 2. `FIRE_AND_FORGET`

**Used by:** `SendOnlyExample` (`usePipewaveSend`)

**Behavior:** No response needed. Log the payload for debugging.

```go
case "FIRE_AND_FORGET":
    log.Printf("[FIRE_AND_FORGET] id=%s payload=%s", frame.ID, string(frame.Data))
    // no response
```

---

### 3. `ERROR_TEST` → error response

**Used by:** `ErrorSubscribeExample` (`usePipewaveError`)

**Behavior:** Respond with an *error frame* (not a data frame) using the same `id`.
The Pipewave server SDK provides a method to send errors; it signals the client-side
`usePipewaveError` handler.

```go
case "ERROR_TEST":
    conn.SendError(ctx, ErrorFrame{
        MsgType: "ERROR_TEST",
        ID:      frame.ID,
        Error:   "intentional error from server: " + string(frame.Data),
    })
```

> **Note:** `conn.SendError` sets the error flag in the Pipewave frame header.
> Check the server SDK for the exact API (`SendError`, `WriteErrorFrame`, etc.).

---

### 4. `PRICE_TICK` — Server Push (no client request)

**Used by:** `LatestMessageExample` (`usePipewaveLatestMessage`)

**Behavior:** Server pushes a price update to all connected clients every **2 seconds**.
No client message triggers this; it is a periodic server broadcast.

```go
// In a goroutine started when the server starts:
func priceBroadcaster(hub *Hub) {
    ticker := time.NewTicker(2 * time.Second)
    defer ticker.Stop()
    prices := []string{"$42,100", "$42,350", "$41,980", "$43,000", "$42,500"}
    i := 0
    for range ticker.C {
        hub.Broadcast(Frame{
            MsgType: "PRICE_TICK",
            ID:      uuid.NewString(),
            Data:    []byte(prices[i%len(prices)]),
        })
        i++
    }
}
```

---

### 5. `EVENT_LOG` — Server Push (no client request)

**Used by:** `MessageHistoryExample` (`usePipewaveMessageHistory`)

**Behavior:** Server pushes an event log entry to all connected clients every **3 seconds**.

```go
func eventLogBroadcaster(hub *Hub) {
    ticker := time.NewTicker(3 * time.Second)
    defer ticker.Stop()
    events := []string{
        "user_login: alice",
        "order_created: #1042",
        "payment_confirmed: #1042",
        "user_logout: bob",
        "system_health: OK",
    }
    i := 0
    for range ticker.C {
        hub.Broadcast(Frame{
            MsgType: "EVENT_LOG",
            ID:      uuid.NewString(),
            Data:    []byte(fmt.Sprintf("[%s] %s", time.Now().Format("15:04:05"), events[i%len(events)])),
        })
        i++
    }
}
```

---

### 6. `SEARCH_REQ` → Ack (`SEARCH_REQ` với `ReturnToId`)

**Used by:** `RequestResponseExample` (`usePipewaveSendWaitAck`)

**Critical:** `usePipewaveSendWaitAck` match Ack theo `MsgType == SEARCH_REQ` AND
`ReturnToId == request.Id`. Backend phải gửi response với **`Id` mới** và **`ReturnToId = frame.ID`**.

```go
case "SEARCH_REQ":
    query := string(frame.Data)
    // Simulate search (replace with real logic)
    result := fmt.Sprintf(`found 3 results for "%s": [Alice, Alberto, Alvin]`, query)
    conn.Send(ctx, Frame{
        MsgType:    "SEARCH_REQ",     // ← same MsgType as request (Ack pattern)
        ID:         uuid.NewString(), // ← new ID for the response frame
        ReturnToId: frame.ID,         // ← must match request ID for client matching
        Data:       []byte(result),
    })
```

---

### 7. `PING` → `PONG`

**Used by:** `AllInOneExample` (`usePipewave`)

**Behavior:** Respond với type `PONG`. Hook `usePipewave` subscribe theo `MsgType` không
dùng `ReturnToId`, nên backend có thể dùng Id mới hoặc echo lại tùy ý.

```go
case "PING":
    conn.Send(ctx, Frame{
        MsgType: "PONG",
        ID:      uuid.NewString(),
        Data:    frame.Data,
    })
```

---

## Summary Table

| Client sends | Backend responds | Pattern |
|---|---|---|
| `ECHO` | `ECHO_RESPONSE` (new id, same data) | request-push |
| `FIRE_AND_FORGET` | nothing | fire-and-forget |
| `ERROR_TEST` | error frame (same MsgType, same id) | request-error |
| *(nothing)* | `PRICE_TICK` broadcast every 2s | server-push |
| *(nothing)* | `EVENT_LOG` broadcast every 3s | server-push |
| `SEARCH_REQ` | `SEARCH_REQ` Ack (new id, `ReturnToId=request.Id`) | send-wait-ack |
| `PING` | `PONG` (new id) | request-response |

---

## Important: ReturnToId Matching

`usePipewaveSendWaitAck` match Ack theo **`ReturnToId`**, không phải `Id`.
Backend phải set `ReturnToId = request.Id` trên response frame — thiếu hoặc sai
`ReturnToId` sẽ khiến client timeout.

Hook `usePipewaveMessage` / `usePipewave` subscribe theo `MsgType` và không
dùng `ReturnToId`, nên các server-push và PONG không cần set `ReturnToId`.
```

- [ ] **Step 2: Commit backend task doc**

```bash
git add BACKEND-REQUEST-TASK.md
git commit -m "docs: add BACKEND-REQUEST-TASK.md for Go backend handler guide"
```

---

## Chunk 4: Final Verification

### Task 14: Manual smoke test

- [ ] **Step 1: Start dev server and verify all sections render**

```bash
npm run dev
```

Open http://localhost:5173 (or configured port) → navigate to ExamplePage.
Expected:
- 11 section headers visible, each labeled with hook name
- All components render without errors in browser console (TypeScript errors shown in terminal)

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Final commit if any cleanup needed**

```bash
git add src/pages/Example.tsx
git commit -m "fix(examples): resolve any TypeScript issues in ExamplePage"
```
