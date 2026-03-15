# Pipewave React SDK Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the Pipewave React SDK's DX, correctness, and feature set based on the IMPROVE.md review proposals, organized by priority (P0 → P1 → P2 → P3).

**Architecture:** Extend the existing 3-context provider pattern with a new ConnectionStatusContext. Decompose the monolithic `usePipewave` hook into granular hooks (`usePipewaveStatus`, `usePipewaveSend`, `usePipewaveMessage`, etc.). Add configuration options to `PipewaveModuleConfig` and `PipewaveProvider`. Fix 6 technical issues in the core transport layer.

**Tech Stack:** React 19+, TypeScript 5.9, Vite, @msgpack/msgpack

---

## Chunk 1: P0 — DX & Correctness (Tasks 1-5)

### Task 1: Fix Section 5 Technical Issues (Quick Wins)

**Files:**
- Modify: `src/external/pipewave/websocket-api.ts:206-216` — replace `Math.random()` with `crypto.getRandomValues()`
- Modify: `src/external/pipewave/services/websocket/service.ts:117-133` — extract duplicate retry logic
- Modify: `src/context/types.ts:16-20,30-34` — extract default retry config constant
- Modify: `src/hooks/usePipewave.ts:55` — remove unnecessary empty function return
- Modify: `src/context/provider.tsx:29` — use `const` with default value instead of mutating param

**Note:** Issue #3 (token via query string) is a backend concern — document as known limitation, do not change client.

- [ ] **Step 1: Fix `randomString()` to use `crypto.getRandomValues()`**

In `src/external/pipewave/websocket-api.ts`, replace the `randomString` function:

```ts
function randomString(length: number): string {
    const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const values = crypto.getRandomValues(new Uint8Array(length));
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(values[i] % chars.length);
    }
    return result;
}
```

- [ ] **Step 2: Extract duplicate retry logic in `service.ts`**

In `src/external/pipewave/services/websocket/service.ts`, extract a private method:

```ts
private handleRetryOrSuspend() {
    this.retryCount++
    if (this.retryCount >= this.params.retryCfg.maxRetry) {
        this.isSuspend = true
        if (this.params.eventHandler.onMaxRetry) {
            this.params.eventHandler.onMaxRetry(() => this.resetRetryCount())
        }
    } else {
        const delay = this.retryDelay
        this.retryDelay = Math.min(this.retryDelay * 2, this.params.retryCfg.maxRetryDelay)
        setTimeout(() => this.connect(), delay)
    }
}
```

Then replace both blocks in `onclose` (lines 101-113) and `catch` (lines 117-133) with calls to `this.handleRetryOrSuspend()`. The catch block should still set `this.retryCount = this.params.retryCfg.maxRetry` before calling it.

- [ ] **Step 3: Extract default retry config constant in `types.ts`**

In `src/context/types.ts`, add constant and reference it:

```ts
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetry: 3,
    initialRetryDelay: 1000,
    maxRetryDelay: 5000,
}
```

Then update `PipewaveModuleConfig`:
```ts
export class PipewaveModuleConfig {
    // ...
    retry: RetryConfig = DEFAULT_RETRY_CONFIG

    constructor({ backendEndpoint, insecure, getAccessToken, retry }: PipewaveModuleConfigProps) {
        this.backendEndpoint = backendEndpoint
        this.insecure = insecure ?? false
        this.getAccessToken = getAccessToken
        this.retry = retry ?? DEFAULT_RETRY_CONFIG
    }
}
```

- [ ] **Step 4: Fix empty return and provider mutation**

In `src/hooks/usePipewave.ts:53-55`, change:
```ts
if (!onMessage) {
    return () => { }
}
```
to:
```ts
if (!onMessage) return
```

Do the same for the `onDataError` effect at line 65.

In `src/context/provider.tsx:28`, change:
```ts
eventHandler = eventHandler || {}
```
to:
```ts
const handler = eventHandler ?? {}
```
And use `handler` in the `useMemo` below.

- [ ] **Step 5: Verify build passes**

Run: `npm run build && npm run typecheck`
Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add src/external/pipewave/websocket-api.ts src/external/pipewave/services/websocket/service.ts src/context/types.ts src/hooks/usePipewave.ts src/context/provider.tsx
git commit -m "fix: resolve 5 technical issues from code review

- Use crypto.getRandomValues() instead of Math.random() for ID generation
- Extract duplicate retry logic into handleRetryOrSuspend method
- Extract DEFAULT_RETRY_CONFIG constant to avoid duplication
- Remove unnecessary empty function returns in usePipewave
- Avoid mutating eventHandler parameter in PipewaveProvider"
```

---

### Task 2: Add `ConnectionStatusContext` and `usePipewaveStatus` hook (IMPROVE.md 2.1 + 3.1a)

**Files:**
- Create: `src/context/connectionStatusContext.ts` — new context for WsStatus
- Create: `src/context/connectionStatus.tsx` — ConnectionStatusProvider component
- Create: `src/hooks/usePipewaveStatus.ts` — public hook for connection status
- Modify: `src/context/provider.tsx` — add ConnectionStatusProvider to the provider tree
- Modify: `src/context/index.ts` — export new context
- Modify: `src/hooks/index.ts` — export new hook
- Modify: `src/hooks/usePipewave.ts` — use shared status from context instead of local state

- [ ] **Step 1: Create `connectionStatusContext.ts`**

Create `src/context/connectionStatusContext.ts`:

```ts
import { createContext, useContext } from 'react'
import type { WsStatus } from '@/external/pipewave/services'

interface ConnectionStatusContextValue {
    status: WsStatus
    setStatus: (status: WsStatus) => void
}

const ConnectionStatusContext = createContext<ConnectionStatusContextValue>(
    null as unknown as ConnectionStatusContextValue
)

export const useConnectionStatus = () => {
    const ctx = useContext(ConnectionStatusContext)
    if (!ctx) throw new Error("useConnectionStatus must be used within ConnectionStatusProvider")
    return ctx
}

export { ConnectionStatusContext }
```

- [ ] **Step 2: Create `connectionStatus.tsx`**

Create `src/context/connectionStatus.tsx`:

```tsx
import { useState, useEffect, type ReactNode } from 'react'
import { ConnectionStatusContext } from './connectionStatusContext'
import { WsStatus } from '@/external/pipewave/services'
import type { WebsocketApi } from '@/external/pipewave'
import type { WsEventHandlerUtils } from '@/external/pipewave/utils/eventHandler'

interface Props {
    wsApi: WebsocketApi
    wsHandler: WsEventHandlerUtils
    children: ReactNode
}

export function ConnectionStatusProvider({ wsApi, wsHandler, children }: Props) {
    const [status, setStatus] = useState<WsStatus>(wsApi.getStatus())

    useEffect(() => {
        const updateStatus = async () => setStatus(wsApi.getStatus())
        const fns: (() => void)[] = []
        fns.push(wsHandler.setOnOpen(updateStatus))
        fns.push(wsHandler.setOnClose(updateStatus))
        fns.push(wsHandler.setOnError(updateStatus))
        fns.push(wsHandler.setOnMaxRetry(updateStatus))
        return () => fns.forEach(fn => fn())
    }, [wsApi, wsHandler])

    return (
        <ConnectionStatusContext.Provider value={{ status, setStatus }}>
            {children}
        </ConnectionStatusContext.Provider>
    )
}
```

- [ ] **Step 3: Create `usePipewaveStatus` hook**

Create `src/hooks/usePipewaveStatus.ts`:

```ts
import { useMemo } from 'react'
import { useConnectionStatus } from '@/context/connectionStatusContext'
import { WsStatus } from '@/external/pipewave/services'

export function usePipewaveStatus() {
    const { status } = useConnectionStatus()

    return useMemo(() => ({
        status,
        isConnected: status === WsStatus.READY,
        isReconnecting: status === WsStatus.RECONNECTING,
        isSuspended: status === WsStatus.SUSPEND,
    }), [status])
}
```

- [ ] **Step 4: Wire into PipewaveProvider**

Modify `src/context/provider.tsx` — add `ConnectionStatusProvider` as innermost wrapper (so it has access to wsApi and wsHandler):

```tsx
import { type ReactNode, useMemo } from 'react'
import { WebsocketApi as PipewaveApi, type WebsocketEventHandler } from '@/external/pipewave'
import type { PipewaveModuleConfig } from './types'
import { WsEventHandlerUtils } from '@/external/pipewave/utils/eventHandler'
import { ModuleConfigProvider } from './moduleConfig'
import { PipewaveEventHandlerProvider } from './pipewaveWsEventHandler'
import { PipewaveContextProvider } from './pipewaveWsApi'
import { ConnectionStatusProvider } from './connectionStatus'

interface Props {
    config: PipewaveModuleConfig
    eventHandler?: WebsocketEventHandler
    children: ReactNode
}

function PipewaveProvider({ config, eventHandler, children }: Props) {
    const handler = eventHandler ?? {}
    const eventHandlerUtils = useMemo(() => new WsEventHandlerUtils(handler), [handler])

    const api = useMemo(() => new PipewaveApi({
        restConfig: {
            endpoint: config.backendEndpoint,
            insecure: config.insecure,
            getAccessToken: config.getAccessToken,
        },
        websocketConfig: {
            eventHandler: eventHandlerUtils,
            retryCfg: config.retry,
            enableLongPollingFallback: true,
        }
    }), [eventHandlerUtils, config])

    return (
        <ModuleConfigProvider value={config}>
            <PipewaveEventHandlerProvider value={eventHandlerUtils}>
                <PipewaveContextProvider value={api}>
                    <ConnectionStatusProvider wsApi={api} wsHandler={eventHandlerUtils}>
                        {children}
                    </ConnectionStatusProvider>
                </PipewaveContextProvider>
            </PipewaveEventHandlerProvider>
        </ModuleConfigProvider>
    )
}

export { PipewaveProvider }
```

- [ ] **Step 5: Update `usePipewave` to use shared status**

Modify `src/hooks/usePipewave.ts` — remove local status state and lifecycle status effect, use `useConnectionStatus` instead:

```ts
import { usePipewaveWsApi, usePipewaveWsEventHandler } from "@/context";
import { useConnectionStatus } from "@/context/connectionStatusContext";
import { useCallback, useEffect } from "react";

export type OnMessage = Record<string, DataHandler>
type DataHandler = (data: Uint8Array, id: string) => Promise<void>

export type OnError = Record<string, DataErrorHandler>
type DataErrorHandler = (data: string, id: string) => Promise<void>

export function usePipewave(onMessage?: OnMessage, onDataError?: OnError) {
    const wsApi = usePipewaveWsApi()
    const wsHandler = usePipewaveWsEventHandler()
    const { status } = useConnectionStatus()

    // Connection lifecycle: connect/disconnect with ref counting
    useEffect(() => {
        wsApi.connect()
        return () => wsApi.disconnect()
    }, [wsApi])

    // Message handler registration
    useEffect(() => {
        if (!onMessage) return
        const fns = Object.entries(onMessage).map(([msgType, handler]) =>
            wsHandler.onMsgType(msgType, handler)
        )
        return () => fns.forEach(fn => fn())
    }, [wsHandler, onMessage])

    // Error handler registration
    useEffect(() => {
        if (!onDataError) return
        const fns = Object.entries(onDataError).map(([msgType, handler]) =>
            wsHandler.onErrorType(msgType, handler)
        )
        return () => fns.forEach(fn => fn())
    }, [wsHandler, onDataError])

    const send = useCallback(
        (args: { id: string; msgType: string; data: Uint8Array<ArrayBufferLike> }) =>
            wsApi.send(args),
        [wsApi]
    )

    const resetRetryCount = useCallback(() => wsApi.resetRetryCount(), [wsApi])
    const reconnect = useCallback(() => wsApi.reconnect(), [wsApi])

    return { status, send, resetRetryCount, reconnect }
}
```

- [ ] **Step 6: Update barrel exports**

In `src/context/index.ts`, add:
```ts
export * from './connectionStatusContext'
```

In `src/hooks/index.ts`, add:
```ts
export * from './usePipewaveStatus'
```

- [ ] **Step 7: Verify build passes**

Run: `npm run build && npm run typecheck`
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/context/connectionStatusContext.ts src/context/connectionStatus.tsx src/hooks/usePipewaveStatus.ts src/context/provider.tsx src/hooks/usePipewave.ts src/context/index.ts src/hooks/index.ts
git commit -m "feat: add ConnectionStatusContext and usePipewaveStatus hook

Allows components to read connection status without subscribing to messages.
usePipewaveStatus() returns { status, isConnected, isReconnecting, isSuspended }.
Shared status state eliminates duplicate lifecycle listeners across hooks."
```

---

### Task 3: Solve `useMemo` requirement — internal ref-based handler comparison (IMPROVE.md 3.5)

**Files:**
- Modify: `src/hooks/usePipewave.ts` — use `useRef` to compare handler keys instead of object reference

- [ ] **Step 1: Update message handler effect to use ref-based comparison**

In `src/hooks/usePipewave.ts`, change the message handler effect to use `useRef` so handlers are stable across re-renders:

```ts
import { usePipewaveWsApi, usePipewaveWsEventHandler } from "@/context";
import { useConnectionStatus } from "@/context/connectionStatusContext";
import { useCallback, useEffect, useRef } from "react";

// ... type definitions stay the same ...

export function usePipewave(onMessage?: OnMessage, onDataError?: OnError) {
    const wsApi = usePipewaveWsApi()
    const wsHandler = usePipewaveWsEventHandler()
    const { status } = useConnectionStatus()

    // Store latest handler refs to avoid stale closures
    const onMessageRef = useRef(onMessage)
    onMessageRef.current = onMessage

    const onDataErrorRef = useRef(onDataError)
    onDataErrorRef.current = onDataError

    // Connection lifecycle
    useEffect(() => {
        wsApi.connect()
        return () => wsApi.disconnect()
    }, [wsApi])

    // Message handler registration — uses stable wrapper that delegates to ref
    useEffect(() => {
        if (!onMessage) return
        const fns = Object.entries(onMessage).map(([msgType]) =>
            wsHandler.onMsgType(msgType, async (data, id) => {
                const handler = onMessageRef.current?.[msgType]
                if (handler) await handler(data, id)
            })
        )
        return () => fns.forEach(fn => fn())
    // Re-register only when handler keys change, not values
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wsHandler, onMessage && Object.keys(onMessage).sort().join(',')])

    // Error handler registration — same pattern
    useEffect(() => {
        if (!onDataError) return
        const fns = Object.entries(onDataError).map(([msgType]) =>
            wsHandler.onErrorType(msgType, async (error, id) => {
                const handler = onDataErrorRef.current?.[msgType]
                if (handler) await handler(error, id)
            })
        )
        return () => fns.forEach(fn => fn())
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wsHandler, onDataError && Object.keys(onDataError).sort().join(',')])

    const send = useCallback(
        (args: { id: string; msgType: string; data: Uint8Array<ArrayBufferLike> }) =>
            wsApi.send(args),
        [wsApi]
    )

    const resetRetryCount = useCallback(() => wsApi.resetRetryCount(), [wsApi])
    const reconnect = useCallback(() => wsApi.reconnect(), [wsApi])

    return { status, send, resetRetryCount, reconnect }
}
```

- [ ] **Step 2: Update JSDoc to remove `useMemo` requirement warning**

Remove the old JSDoc block that warns about `useMemo`. Replace with:

```ts
/**
 * @param onMessage - Map of message type to handler function.
 *   Handlers are stored by ref internally — no need to memoize with useMemo.
 *   Only re-subscribes when the set of message type keys changes.
 */
```

- [ ] **Step 3: Update Example.tsx to remove unnecessary useMemo**

In `src/pages/Example.tsx`, change:
```tsx
const onMessage: OnMessage = useMemo(() => ({
    [ECHO_RESPONSE]: async (data: Uint8Array, id: string) => {
        const text = decoder.decode(data)
        setMessages(prev => [...prev, { id, text }])
    },
}), [])
```
to:
```tsx
const onMessage: OnMessage = {
    [ECHO_RESPONSE]: async (data: Uint8Array, id: string) => {
        const text = decoder.decode(data)
        setMessages(prev => [...prev, { id, text }])
    },
}
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build && npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePipewave.ts src/pages/Example.tsx
git commit -m "fix: eliminate useMemo requirement for onMessage handlers

Use useRef internally to always call the latest handler. Only re-subscribe
when message type keys change, not on every render. This prevents silent
message drops when users forget to memoize the handler map."
```

---

### Task 4: Add `usePipewaveSend` hook (IMPROVE.md 3.1b)

**Files:**
- Create: `src/hooks/usePipewaveSend.ts`
- Modify: `src/hooks/index.ts`

- [ ] **Step 1: Create `usePipewaveSend.ts`**

Create `src/hooks/usePipewaveSend.ts`:

```ts
import { useCallback } from 'react'
import { usePipewaveWsApi } from '@/context'

export function usePipewaveSend() {
    const wsApi = usePipewaveWsApi()

    const send = useCallback(
        (args: { id: string; msgType: string; data: Uint8Array<ArrayBufferLike> }) =>
            wsApi.send(args),
        [wsApi]
    )

    return { send }
}
```

- [ ] **Step 2: Export from hooks barrel**

Add to `src/hooks/index.ts`:
```ts
export * from './usePipewaveSend'
```

- [ ] **Step 3: Verify build**

Run: `npm run build && npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/hooks/usePipewaveSend.ts src/hooks/index.ts
git commit -m "feat: add usePipewaveSend hook for send-only components"
```

---

### Task 5: Add `usePipewaveMessage` and `usePipewaveError` granular hooks (IMPROVE.md 3.1c)

**Files:**
- Create: `src/hooks/usePipewaveMessage.ts`
- Create: `src/hooks/usePipewaveError.ts`
- Modify: `src/hooks/index.ts`

- [ ] **Step 1: Create `usePipewaveMessage.ts`**

Create `src/hooks/usePipewaveMessage.ts`:

```ts
import { useEffect, useRef } from 'react'
import { usePipewaveWsEventHandler } from '@/context'

type DataHandler = (data: Uint8Array, id: string) => Promise<void>

/**
 * Subscribe to a specific message type.
 * Handler is stored by ref — no need to memoize.
 */
export function usePipewaveMessage(msgType: string, handler: DataHandler) {
    const wsHandler = usePipewaveWsEventHandler()
    const handlerRef = useRef(handler)
    handlerRef.current = handler

    useEffect(() => {
        const unsub = wsHandler.onMsgType(msgType, async (data, id) => {
            await handlerRef.current(data, id)
        })
        return unsub
    }, [wsHandler, msgType])
}
```

- [ ] **Step 2: Create `usePipewaveError.ts`**

Create `src/hooks/usePipewaveError.ts`:

```ts
import { useEffect, useRef } from 'react'
import { usePipewaveWsEventHandler } from '@/context'

type ErrorHandler = (error: string, id: string) => Promise<void>

/**
 * Subscribe to error messages of a specific type.
 * Handler is stored by ref — no need to memoize.
 */
export function usePipewaveError(msgType: string, handler: ErrorHandler) {
    const wsHandler = usePipewaveWsEventHandler()
    const handlerRef = useRef(handler)
    handlerRef.current = handler

    useEffect(() => {
        const unsub = wsHandler.onErrorType(msgType, async (error, id) => {
            await handlerRef.current(error, id)
        })
        return unsub
    }, [wsHandler, msgType])
}
```

- [ ] **Step 3: Export from hooks barrel**

Add to `src/hooks/index.ts`:
```ts
export * from './usePipewaveMessage'
export * from './usePipewaveError'
```

- [ ] **Step 4: Verify build**

Run: `npm run build && npm run typecheck`

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePipewaveMessage.ts src/hooks/usePipewaveError.ts src/hooks/index.ts
git commit -m "feat: add usePipewaveMessage and usePipewaveError granular hooks

Single-type subscription hooks that don't require useMemo.
Components only re-render when their specific message type fires."
```

---

### Task 6: Add `usePipewaveConnection` hook (IMPROVE.md 3.1d)

**Files:**
- Create: `src/hooks/usePipewaveConnection.ts`
- Modify: `src/hooks/index.ts`

- [ ] **Step 1: Create `usePipewaveConnection.ts`**

Create `src/hooks/usePipewaveConnection.ts`:

```ts
import { useCallback, useEffect } from 'react'
import { usePipewaveWsApi } from '@/context'

/**
 * Hook for managing connection lifecycle.
 * Automatically connects on mount and disconnects on unmount.
 * Useful for admin/debug panels that need reconnect/reset controls.
 */
export function usePipewaveConnection() {
    const wsApi = usePipewaveWsApi()

    useEffect(() => {
        wsApi.connect()
        return () => wsApi.disconnect()
    }, [wsApi])

    const reconnect = useCallback(() => wsApi.reconnect(), [wsApi])
    const resetRetryCount = useCallback(() => wsApi.resetRetryCount(), [wsApi])

    return { reconnect, resetRetryCount }
}
```

- [ ] **Step 2: Export from hooks barrel**

Add to `src/hooks/index.ts`:
```ts
export * from './usePipewaveConnection'
```

- [ ] **Step 3: Verify build**

Run: `npm run build && npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/hooks/usePipewaveConnection.ts src/hooks/index.ts
git commit -m "feat: add usePipewaveConnection hook for connection management"
```

---

## Chunk 2: P1 — Missing Features (Tasks 7-9)

### Task 7: Add `onReconnect`, `onStatusChange`, `onTransportChange` events (IMPROVE.md 2.4)

**Files:**
- Modify: `src/context/types.ts` — extend `WebsocketEventHandler` interface
- Modify: `src/external/pipewave/configs/index.ts` — extend internal `WebsocketEventHandler`
- Modify: `src/external/pipewave/utils/eventHandler.ts` — add new handler arrays and subscribe methods
- Modify: `src/external/pipewave/services/websocket/service.ts` — fire `onReconnect` during retry
- Modify: `src/external/pipewave/websocket-api.ts` — fire `onTransportChange` when switching transport

- [ ] **Step 1: Extend both `WebsocketEventHandler` interfaces**

In `src/context/types.ts`, add to `WebsocketEventHandler`:
```ts
export interface WebsocketEventHandler {
    onOpen?: () => Promise<void>;
    onClose?: () => Promise<void>;
    onError?: (error: Event) => Promise<void>;
    onData?: (data: WebsocketMessage) => Promise<void>;
    onMaxRetry?: (resetRetryCount: () => void) => Promise<void>;
    onReconnect?: (attempt: number) => Promise<void>;
    onTransportChange?: (transport: 'ws' | 'lp') => Promise<void>;
    onStatusChange?: (status: string) => Promise<void>;
}
```

In `src/external/pipewave/configs/index.ts`, add the same 3 fields to the internal `WebsocketEventHandler`.

- [ ] **Step 2: Add handlers to `WsEventHandlerUtils`**

In `src/external/pipewave/utils/eventHandler.ts`, add:

```ts
// New handler arrays
private _onReconnectHandlers: ((attempt: number) => Promise<void>)[] = []
private _onTransportChangeHandlers: ((transport: 'ws' | 'lp') => Promise<void>)[] = []
private _onStatusChangeHandlers: ((status: string) => Promise<void>)[] = []
```

Add constructor lines for the new params, subscribe methods (same pattern as existing `setOnOpen` etc.), and the interface implementation methods:

```ts
// Constructor additions
if (params.onReconnect) this._onReconnectHandlers.push(params.onReconnect)
if (params.onTransportChange) this._onTransportChangeHandlers.push(params.onTransportChange)
if (params.onStatusChange) this._onStatusChangeHandlers.push(params.onStatusChange)

// Subscribe methods
setOnReconnect(handler: (attempt: number) => Promise<void>): () => void { /* same pattern */ }
setOnTransportChange(handler: (transport: 'ws' | 'lp') => Promise<void>): () => void { /* same pattern */ }
setOnStatusChange(handler: (status: string) => Promise<void>): () => void { /* same pattern */ }

// Interface methods
onReconnect = async (attempt: number): Promise<void> => {
    await Promise.all(this._onReconnectHandlers.map(h => h(attempt)))
}
onTransportChange = async (transport: 'ws' | 'lp'): Promise<void> => {
    await Promise.all(this._onTransportChangeHandlers.map(h => h(transport)))
}
onStatusChange = async (status: string): Promise<void> => {
    await Promise.all(this._onStatusChangeHandlers.map(h => h(status)))
}
```

- [ ] **Step 3: Fire `onReconnect` in WebSocketService**

In `src/external/pipewave/services/websocket/service.ts`, in the `handleRetryOrSuspend` method (or the retry section), add before `setTimeout`:

```ts
if (this.params.eventHandler.onReconnect) {
    this.params.eventHandler.onReconnect(this.retryCount)
}
```

- [ ] **Step 4: Fire `onTransportChange` in WebsocketApi**

In `src/external/pipewave/websocket-api.ts`, in `switchToLongPolling()`, after `this.activeTransport = 'lp'`:

```ts
if (this.wsConfig.eventHandler.onTransportChange) {
    this.wsConfig.eventHandler.onTransportChange('lp')
}
```

- [ ] **Step 5: Fire `onStatusChange` in ConnectionStatusProvider**

In `src/context/connectionStatus.tsx`, add `onStatusChange` dispatch when status changes:

```tsx
useEffect(() => {
    const updateStatus = async () => {
        const newStatus = wsApi.getStatus()
        setStatus(newStatus)
        if (wsHandler.onStatusChange) {
            await wsHandler.onStatusChange(newStatus)
        }
    }
    // ... rest stays the same
}, [wsApi, wsHandler])
```

- [ ] **Step 6: Verify build**

Run: `npm run build && npm run typecheck`

- [ ] **Step 7: Commit**

```bash
git add src/context/types.ts src/external/pipewave/configs/index.ts src/external/pipewave/utils/eventHandler.ts src/external/pipewave/services/websocket/service.ts src/external/pipewave/websocket-api.ts src/context/connectionStatus.tsx
git commit -m "feat: add onReconnect, onTransportChange, onStatusChange events

New lifecycle events for better observability:
- onReconnect(attempt) fires on each retry attempt
- onTransportChange(transport) fires when switching WS <-> LP
- onStatusChange(status) fires on any connection status change"
```

---

### Task 8: Add debug mode (IMPROVE.md 4.1)

**Files:**
- Modify: `src/context/provider.tsx` — accept `debug` prop
- Create: `src/hooks/useDebugLogger.ts` — internal hook that logs messages in/out
- Modify: `src/context/types.ts` — add `debug` to provider props concept

- [ ] **Step 1: Create debug logger hook**

Create `src/hooks/useDebugLogger.ts`:

```ts
import { useEffect, useRef } from 'react'
import { usePipewaveWsEventHandler, usePipewaveWsApi } from '@/context'
import { useConnectionStatus } from '@/context/connectionStatusContext'

export function useDebugLogger(enabled: boolean) {
    const wsHandler = usePipewaveWsEventHandler()
    const wsApi = usePipewaveWsApi()
    const { status } = useConnectionStatus()
    const metricsRef = useRef({ messagesSent: 0, messagesReceived: 0, reconnectCount: 0 })

    useEffect(() => {
        if (!enabled) return

        console.log('[Pipewave Debug] Status:', status)
    }, [enabled, status])

    useEffect(() => {
        if (!enabled) return

        const fns: (() => void)[] = []

        fns.push(wsHandler.setOnOpen(async () => {
            console.log('[Pipewave Debug] Connection opened')
        }))

        fns.push(wsHandler.setOnClose(async () => {
            console.log('[Pipewave Debug] Connection closed')
        }))

        fns.push(wsHandler.setOnError(async (error) => {
            console.log('[Pipewave Debug] Error:', error)
        }))

        fns.push(wsHandler.setOnMaxRetry(async () => {
            console.log('[Pipewave Debug] Max retry reached — connection suspended')
        }))

        return () => fns.forEach(fn => fn())
    }, [enabled, wsHandler])
}
```

- [ ] **Step 2: Wire debug into PipewaveProvider**

In `src/context/provider.tsx`, add `debug` prop and use the hook:

```tsx
interface Props {
    config: PipewaveModuleConfig
    eventHandler?: WebsocketEventHandler
    debug?: boolean
    children: ReactNode
}

// Inside PipewaveProvider, create an inner component that uses the debug hook
// (since useDebugLogger needs context to be available)
```

Create an inner wrapper component:

```tsx
function DebugWrapper({ debug, children }: { debug: boolean; children: ReactNode }) {
    useDebugLogger(debug)
    return <>{children}</>
}
```

Wrap children with it in the provider tree.

- [ ] **Step 3: Verify build**

Run: `npm run build && npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useDebugLogger.ts src/context/provider.tsx
git commit -m "feat: add debug mode to PipewaveProvider

When debug=true, logs connection lifecycle events and status changes to console."
```

---

### Task 9: Add `enableLongPollingFallback` and `heartbeatInterval` config (IMPROVE.md 2.2 + 2.3)

**Files:**
- Modify: `src/context/provider.tsx` — accept `enableLongPollingFallback` prop
- Modify: `src/context/types.ts` — add `heartbeatInterval` to `PipewaveModuleConfig`
- Modify: `src/external/pipewave/configs/index.ts` — add `heartbeatInterval` to configs
- Modify: `src/external/pipewave/services/websocket/service.ts` — use configurable heartbeat interval

- [ ] **Step 1: Add `enableLongPollingFallback` prop to PipewaveProvider**

In `src/context/provider.tsx`, add to Props interface:
```ts
enableLongPollingFallback?: boolean  // default: true
```

In the provider body, use it:
```ts
enableLongPollingFallback: enableLongPollingFallback ?? true,
```

- [ ] **Step 2: Add `heartbeatInterval` to config types**

In `src/context/types.ts`, add to `PipewaveModuleConfigProps`:
```ts
heartbeatInterval?: number  // default: 30000ms
```

Add to `PipewaveModuleConfig` class:
```ts
heartbeatInterval: number = 30000

// In constructor:
this.heartbeatInterval = heartbeatInterval ?? 30000
```

In `src/external/pipewave/configs/index.ts`, add to `WebsocketConfig`:
```ts
heartbeatInterval?: number
```

- [ ] **Step 3: Pass heartbeatInterval through provider to service**

In `src/context/provider.tsx`, pass it in websocketConfig:
```ts
websocketConfig: {
    eventHandler: eventHandlerUtils,
    retryCfg: config.retry,
    enableLongPollingFallback: enableLongPollingFallback ?? true,
    heartbeatInterval: config.heartbeatInterval,
}
```

- [ ] **Step 4: Use configurable heartbeat in WebSocketService**

In `src/external/pipewave/services/websocket/service.ts`, change line 64:
```ts
this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), this.params.heartbeatInterval ?? 30000)
```

- [ ] **Step 5: Verify build**

Run: `npm run build && npm run typecheck`

- [ ] **Step 6: Commit**

```bash
git add src/context/provider.tsx src/context/types.ts src/external/pipewave/configs/index.ts src/external/pipewave/services/websocket/service.ts
git commit -m "feat: add enableLongPollingFallback and heartbeatInterval config

- enableLongPollingFallback prop on PipewaveProvider (default: true)
- heartbeatInterval on PipewaveModuleConfig (default: 30000ms)"
```

---

## Chunk 3: P2 — Enhanced DX (Tasks 10-13)

### Task 10: Add `usePipewaveLatestMessage` hook (IMPROVE.md 3.3)

**Files:**
- Create: `src/hooks/usePipewaveLatestMessage.ts`
- Modify: `src/hooks/index.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/usePipewaveLatestMessage.ts`:

```ts
import { useEffect, useRef, useState } from 'react'
import { usePipewaveWsEventHandler } from '@/context'

interface LatestMessage<T> {
    data: T
    id: string
    receivedAt: Date
}

interface Options<T> {
    decode: (bytes: Uint8Array) => T
}

/**
 * Returns the latest message of a given type, decoded via the provided function.
 */
export function usePipewaveLatestMessage<T>(
    msgType: string,
    options: Options<T>,
): LatestMessage<T> | null {
    const wsHandler = usePipewaveWsEventHandler()
    const [latest, setLatest] = useState<LatestMessage<T> | null>(null)
    const decodeRef = useRef(options.decode)
    decodeRef.current = options.decode

    useEffect(() => {
        const unsub = wsHandler.onMsgType(msgType, async (data, id) => {
            setLatest({
                data: decodeRef.current(data),
                id,
                receivedAt: new Date(),
            })
        })
        return unsub
    }, [wsHandler, msgType])

    return latest
}
```

- [ ] **Step 2: Export from hooks barrel**

Add to `src/hooks/index.ts`:
```ts
export * from './usePipewaveLatestMessage'
```

- [ ] **Step 3: Verify build**

Run: `npm run build && npm run typecheck`

- [ ] **Step 4: Commit**

```bash
git add src/hooks/usePipewaveLatestMessage.ts src/hooks/index.ts
git commit -m "feat: add usePipewaveLatestMessage hook

Stateful hook that holds the most recent decoded message of a given type.
Returns { data, id, receivedAt } or null."
```

---

### Task 11: Add `usePipewaveMessageHistory` hook (IMPROVE.md 3.4)

**Files:**
- Create: `src/hooks/usePipewaveMessageHistory.ts`
- Modify: `src/hooks/index.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/usePipewaveMessageHistory.ts`:

```ts
import { useEffect, useRef, useState } from 'react'
import { usePipewaveWsEventHandler } from '@/context'

interface MessageEntry<T> {
    data: T
    id: string
    receivedAt: Date
}

interface Options<T> {
    decode: (bytes: Uint8Array) => T
    maxSize?: number  // default: 100
}

/**
 * Accumulates decoded messages of a given type into an array.
 */
export function usePipewaveMessageHistory<T>(
    msgType: string,
    options: Options<T>,
): MessageEntry<T>[] {
    const wsHandler = usePipewaveWsEventHandler()
    const [messages, setMessages] = useState<MessageEntry<T>[]>([])
    const decodeRef = useRef(options.decode)
    decodeRef.current = options.decode
    const maxSize = options.maxSize ?? 100

    useEffect(() => {
        const unsub = wsHandler.onMsgType(msgType, async (data, id) => {
            setMessages(prev => {
                const next = [...prev, {
                    data: decodeRef.current(data),
                    id,
                    receivedAt: new Date(),
                }]
                return next.length > maxSize ? next.slice(-maxSize) : next
            })
        })
        return unsub
    }, [wsHandler, msgType, maxSize])

    return messages
}
```

- [ ] **Step 2: Export and verify**

Add to `src/hooks/index.ts`, run build, commit.

```bash
git add src/hooks/usePipewaveMessageHistory.ts src/hooks/index.ts
git commit -m "feat: add usePipewaveMessageHistory hook

Accumulates messages of a type with configurable maxSize buffer (default 100)."
```

---

### Task 12: Add `usePipewaveRequest` hook — request-response pattern (IMPROVE.md 3.6)

**Files:**
- Create: `src/hooks/usePipewaveRequest.ts`
- Modify: `src/hooks/index.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/usePipewaveRequest.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePipewaveWsApi, usePipewaveWsEventHandler } from '@/context'

interface Options<Req, Res> {
    encode: (req: Req) => Uint8Array
    decode: (bytes: Uint8Array) => Res
    timeout?: number  // default: 5000ms
}

/**
 * Request-response pattern over WebSocket.
 * Sends a message of `reqType` and waits for a response of `resType` with matching ID.
 */
export function usePipewaveRequest<Req, Res>(
    reqType: string,
    resType: string,
    options: Options<Req, Res>,
) {
    const wsApi = usePipewaveWsApi()
    const wsHandler = usePipewaveWsEventHandler()
    const [isLoading, setIsLoading] = useState(false)
    const pendingRef = useRef<Map<string, {
        resolve: (res: Res) => void
        reject: (err: Error) => void
    }>>(new Map())
    const optionsRef = useRef(options)
    optionsRef.current = options

    // Listen for responses and match by ID
    useEffect(() => {
        const unsub = wsHandler.onMsgType(resType, async (data, id) => {
            const pending = pendingRef.current.get(id)
            if (pending) {
                pendingRef.current.delete(id)
                if (pendingRef.current.size === 0) setIsLoading(false)
                pending.resolve(optionsRef.current.decode(data))
            }
        })
        return unsub
    }, [wsHandler, resType])

    // Also listen for error responses
    useEffect(() => {
        const unsub = wsHandler.onErrorType(resType, async (error, id) => {
            const pending = pendingRef.current.get(id)
            if (pending) {
                pendingRef.current.delete(id)
                if (pendingRef.current.size === 0) setIsLoading(false)
                pending.reject(new Error(error))
            }
        })
        return unsub
    }, [wsHandler, resType])

    const sendAndWait = useCallback(async (req: Req, id?: string): Promise<Res> => {
        const msgId = id ?? crypto.randomUUID()
        const encoded = optionsRef.current.encode(req)
        const timeout = optionsRef.current.timeout ?? 5000

        return new Promise<Res>((resolve, reject) => {
            const timer = setTimeout(() => {
                pendingRef.current.delete(msgId)
                if (pendingRef.current.size === 0) setIsLoading(false)
                reject(new Error(`Request ${msgId} timed out after ${timeout}ms`))
            }, timeout)

            pendingRef.current.set(msgId, {
                resolve: (res) => {
                    clearTimeout(timer)
                    resolve(res)
                },
                reject: (err) => {
                    clearTimeout(timer)
                    reject(err)
                },
            })

            setIsLoading(true)
            wsApi.send({ id: msgId, msgType: reqType, data: encoded }).catch((err) => {
                clearTimeout(timer)
                pendingRef.current.delete(msgId)
                if (pendingRef.current.size === 0) setIsLoading(false)
                reject(err)
            })
        })
    }, [wsApi, reqType])

    return { sendAndWait, isLoading }
}
```

- [ ] **Step 2: Export and verify**

Add to `src/hooks/index.ts`, run build, commit.

```bash
git add src/hooks/usePipewaveRequest.ts src/hooks/index.ts
git commit -m "feat: add usePipewaveRequest hook for request-response pattern

Send a message and await a response matched by ID, with configurable timeout."
```

---

### Task 13: Add type-safe message schema registry (IMPROVE.md 4.4)

**Files:**
- Create: `src/schema.ts` — `createPipewaveSchema` utility

- [ ] **Step 1: Create schema registry**

Create `src/schema.ts`:

```ts
export interface MessageCodec<T> {
    encode: (data: T) => Uint8Array
    decode: (bytes: Uint8Array) => T
}

export type PipewaveSchema<T extends Record<string, MessageCodec<unknown>>> = T

/**
 * Creates a type-safe message schema registry.
 *
 * @example
 * const schema = createPipewaveSchema({
 *   CHAT_MSG: { encode: encodeChatMsg, decode: decodeChatMsg },
 *   USER_STATUS: { encode: encodeUserStatus, decode: decodeUserStatus },
 * })
 */
export function createPipewaveSchema<T extends Record<string, MessageCodec<unknown>>>(
    schema: T,
): T {
    return schema
}
```

- [ ] **Step 2: Export from index.ts**

Add to `src/index.ts`:
```ts
export * from './schema'
```

- [ ] **Step 3: Verify build and commit**

```bash
git add src/schema.ts src/index.ts
git commit -m "feat: add createPipewaveSchema for type-safe message definitions"
```

---

## Chunk 4: P3 — Nice to Have (Tasks 14-15)

### Task 14: Add `PipewaveErrorBoundary` component (IMPROVE.md 4.5)

**Files:**
- Create: `src/components/PipewaveErrorBoundary.tsx`
- Modify: `src/index.ts`

- [ ] **Step 1: Create error boundary component**

Create `src/components/PipewaveErrorBoundary.tsx`:

```tsx
import { Component, type ReactNode } from 'react'

interface Props {
    fallback: ReactNode
    children: ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class PipewaveErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback
        }
        return this.props.children
    }
}
```

- [ ] **Step 2: Export and commit**

Add to `src/index.ts`:
```ts
export * from './components/PipewaveErrorBoundary'
```

```bash
git add src/components/PipewaveErrorBoundary.tsx src/index.ts
git commit -m "feat: add PipewaveErrorBoundary component"
```

---

### Task 15: Add `usePipewaveConnectionInfo` hook — connection quality (IMPROVE.md 4.3)

**Files:**
- Create: `src/hooks/usePipewaveConnectionInfo.ts`
- Modify: `src/external/pipewave/websocket-api.ts` — expose `activeTransport` getter
- Modify: `src/hooks/index.ts`

- [ ] **Step 1: Add `getActiveTransport()` to WebsocketApi**

In `src/external/pipewave/websocket-api.ts`, add:

```ts
public getActiveTransport(): 'ws' | 'lp' {
    return this.activeTransport
}
```

- [ ] **Step 2: Create the hook**

Create `src/hooks/usePipewaveConnectionInfo.ts`:

```ts
import { useMemo } from 'react'
import { usePipewaveWsApi } from '@/context'
import { useConnectionStatus } from '@/context/connectionStatusContext'

export function usePipewaveConnectionInfo() {
    const wsApi = usePipewaveWsApi()
    const { status } = useConnectionStatus()

    return useMemo(() => ({
        status,
        transport: wsApi.getActiveTransport(),
    }), [wsApi, status])
}
```

- [ ] **Step 3: Export and commit**

Add to `src/hooks/index.ts`, verify build.

```bash
git add src/external/pipewave/websocket-api.ts src/hooks/usePipewaveConnectionInfo.ts src/hooks/index.ts
git commit -m "feat: add usePipewaveConnectionInfo hook

Exposes transport type (ws/lp) and connection status."
```

---

## Chunk 5: Update Example & Exports (Task 16)

### Task 16: Update Example.tsx to showcase new hooks

**Files:**
- Modify: `src/pages/Example.tsx` — demonstrate new hooks

- [ ] **Step 1: Rewrite Example.tsx**

Update `src/pages/Example.tsx` to showcase `usePipewaveStatus`, `usePipewaveMessage`, `usePipewaveSend`, and `usePipewaveConnection`:

```tsx
import { useState } from 'react'
import { PipewaveProvider, PipewaveModuleConfig } from '@/context'
import { usePipewaveStatus } from '@/hooks/usePipewaveStatus'
import { usePipewaveSend } from '@/hooks/usePipewaveSend'
import { usePipewaveMessage } from '@/hooks/usePipewaveMessage'
import { usePipewaveConnection } from '@/hooks/usePipewaveConnection'

const accessToken = { value: "default" }
const config = new PipewaveModuleConfig({
    backendEndpoint: 'localhost:8080/websocket',
    insecure: true,
    getAccessToken: async () => accessToken.value,
})

const ECHO_RESPONSE = 'ECHO_RESPONSE'
const MSG_TYPE = 'ECHO'
const decoder = new TextDecoder()
const encoder = new TextEncoder()

function StatusBadge() {
    const { status, isConnected } = usePipewaveStatus()
    return <p>Status: <strong>{status}</strong> {isConnected ? '🟢' : '🔴'}</p>
}

function Chat() {
    const [messages, setMessages] = useState<{ id: string; text: string }[]>([])
    const [input, setInput] = useState('')
    const { send } = usePipewaveSend()
    const { status } = usePipewaveStatus()
    const { reconnect, resetRetryCount } = usePipewaveConnection()

    usePipewaveMessage(ECHO_RESPONSE, async (data, id) => {
        const text = decoder.decode(data)
        setMessages(prev => [...prev, { id, text }])
    })

    const handleSend = () => {
        if (!input.trim()) return
        send({
            id: crypto.randomUUID(),
            msgType: MSG_TYPE,
            data: encoder.encode(input),
        })
        setInput('')
    }

    return (
        <div style={{ padding: 24, maxWidth: 480 }}>
            <h2>WebSocket Example (New Hooks)</h2>
            <StatusBadge />
            {status === 'SUSPEND' && <button onClick={resetRetryCount}>Reset</button>}

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSend()}
                    placeholder="Type a message..."
                    style={{ flex: 1, padding: 8 }}
                />
                <button onClick={handleSend} disabled={status !== 'READY'}>Send</button>
            </div>

            <div>
                <h3>Received Messages</h3>
                {messages.length === 0 && <p>No messages yet.</p>}
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {messages.map((msg, i) => (
                        <li key={i} style={{ padding: '4px 0', borderBottom: '1px solid #eee' }}>
                            <small style={{ color: '#888' }}>[{msg.id}]</small> {msg.text}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

export default function ExamplePage() {
    return (
        <PipewaveProvider config={config} debug={true}>
            <Chat />
        </PipewaveProvider>
    )
}
```

- [ ] **Step 2: Final build verification**

Run: `npm run build && npm run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/pages/Example.tsx
git commit -m "refactor: update Example.tsx to showcase new granular hooks"
```

---

## Summary

| Task | IMPROVE.md Ref | Priority | Description |
|------|---------------|----------|-------------|
| 1 | Section 5 | P0 | Fix 5 technical issues |
| 2 | 2.1, 3.1a | P0 | ConnectionStatusContext + usePipewaveStatus |
| 3 | 3.5 | P0 | Eliminate useMemo requirement |
| 4 | 3.1b | P0 | usePipewaveSend hook |
| 5 | 3.1c | P0 | usePipewaveMessage + usePipewaveError hooks |
| 6 | 3.1d | P0 | usePipewaveConnection hook |
| 7 | 2.4 | P1 | onReconnect, onTransportChange, onStatusChange events |
| 8 | 4.1 | P1 | Debug mode |
| 9 | 2.2, 2.3 | P1 | enableLongPollingFallback + heartbeatInterval config |
| 10 | 3.3 | P2 | usePipewaveLatestMessage hook |
| 11 | 3.4 | P2 | usePipewaveMessageHistory hook |
| 12 | 3.6 | P2 | usePipewaveRequest hook |
| 13 | 4.4 | P2 | Type-safe schema registry |
| 14 | 4.5 | P3 | PipewaveErrorBoundary |
| 15 | 4.3 | P3 | usePipewaveConnectionInfo |
| 16 | — | — | Update Example.tsx |
