# @pipewave/reactpkg

> Real-time WebSocket, Simplified — React SDK for [PipeWave](https://pipewave.dev/)

The official React integration package for [PipeWave](https://pipewave.dev/). Connect your React app to a PipeWave backend with a single provider and hook — no boilerplate WebSocket management required.

---

## Overview

`@pipewave/reactpkg` provides React context and hooks to integrate with PipeWave's real-time WebSocket infrastructure. It handles connection lifecycle, auto-retry, message routing by type, and falls back to long-polling when WebSocket is unavailable.

**Key capabilities:**

- One-line WebSocket setup via `PipewaveProvider`
- `usePipewave` hook for sending messages and reacting to incoming data
- Message routing by type — register handlers per message type
- Automatic reconnect with configurable retry and backoff
- Long-polling fallback (enabled by default)
- Token-based authentication via async `getAccessToken`

For full documentation, guides, and backend setup, visit **[pipewave.dev](https://pipewave.dev/)**.

---

## Installation

```bash
npm install @pipewave/reactpkg
# or
pnpm add @pipewave/reactpkg
```

**Peer dependencies** — install if not already present:

```bash
npm install react react-dom react-router-dom
```

---

## Quick Start

### 1. Wrap your app with `PipewaveProvider`

```tsx
import { useMemo } from 'react'
import { PipewaveProvider, PipewaveModuleConfig } from '@pipewave/reactpkg'

const config = new PipewaveModuleConfig({
  backendEndpoint: 'your-backend-host/websocket',
  getAccessToken: async () => await getYourAuthToken(),
})

export default function App() {
  return (
    <PipewaveProvider config={config}>
      <YourApp />
    </PipewaveProvider>
  )
}
```

### 2. Use the `usePipewave` hook

```tsx
import { useMemo } from 'react'
import { usePipewave, type OnMessage } from '@pipewave/reactpkg'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function MyComponent() {
  const onMessage: OnMessage = useMemo(() => ({
    SOME_EVENT: async (data: Uint8Array, id: string) => {
      console.log('Received:', decoder.decode(data))
    },
  }), [])

  const { status, send, reconnect, resetRetryCount } = usePipewave(onMessage)

  const handleSend = () => {
    send({
      id: crypto.randomUUID(),
      msgType: 'MY_MSG_TYPE',
      data: encoder.encode('Hello, PipeWave!'),
    })
  }

  return (
    <div>
      <p>Status: {status}</p>
      <button onClick={handleSend} disabled={status !== 'READY'}>Send</button>
      {status === 'SUSPEND' && (
        <button onClick={resetRetryCount}>Retry connection</button>
      )}
    </div>
  )
}
```

---

## Configuration

```ts
new PipewaveModuleConfig({
  backendEndpoint: string        // Required. Host + path to WebSocket endpoint
  getAccessToken: () => Promise<string>  // Required. Called before each connect/reconnect
  insecure?: boolean             // Use ws:// instead of wss:// (default: false)
  retry?: {
    maxRetry: number             // Max reconnect attempts (default: 3)
    initialRetryDelay: number    // First retry delay in ms (default: 1000)
    maxRetryDelay: number        // Max delay between retries in ms (default: 5000)
  }
})
```

---

## API Reference

### `PipewaveProvider`

| Prop | Type | Description |
|------|------|-------------|
| `config` | `PipewaveModuleConfig` | Connection configuration (should be stable — use `useMemo` or define outside render) |
| `eventHandler` | `WebsocketEventHandler` | Optional lifecycle callbacks (`onOpen`, `onClose`, `onError`, `onMaxRetry`) |

### `usePipewave(onMessage?, onDataError?)`

| Return value | Type | Description |
|---|---|---|
| `status` | `string` | Current connection status (`READY`, `CONNECTING`, `SUSPEND`, …) |
| `send` | `(args: { id, msgType, data }) => void` | Send a message to the backend |
| `reconnect` | `() => void` | Manually trigger reconnection |
| `resetRetryCount` | `() => void` | Reset retry counter (use after `SUSPEND` to allow reconnecting) |

> **Note:** Pass `onMessage` wrapped in `useMemo` with stable deps to avoid handlers being briefly unregistered between renders.

---

## Learn More

- **Website & Documentation:** [pipewave.dev](https://pipewave.dev/)
- **GitHub:** [github.com/pipewave-dev/reactpkg](https://github.com/pipewave-dev/reactpkg)
- **npm:** [@pipewave/reactpkg](https://www.npmjs.com/package/@pipewave/reactpkg)

---

## License

See [LICENSE](./LICENSE) for details.
