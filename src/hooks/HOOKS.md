# Pipewave React Hooks

Tài liệu hướng dẫn sử dụng các hooks trong thư viện `pipewave-react`.

---

## Tổng quan

| Hook | Mục đích | Quản lý kết nối |
|------|----------|-----------------|
| [`usePipewave`](#usepipewave) | Hook tổng hợp: kết nối + gửi + nhận tin nhắn | Có |
| [`usePipewaveResetConnection`](#usepipewaveresetconnection) | Quản lý vòng đời kết nối, hỗ trợ reset | Có |
| [`usePipewaveStatus`](#usepipewavestatus) | Đọc trạng thái kết nối WebSocket | Không |
| [`usePipewaveConnectionInfo`](#usepipewaveconnectioninfo) | Trạng thái + transport đang dùng | Không |
| [`usePipewaveSend`](#usepipewavesend) | Gửi tin nhắn | Không |
| [`usePipewaveMessage`](#usepipewavemessage) | Subscribe một loại tin nhắn | Không |
| [`usePipewaveError`](#usepipewaveerror) | Subscribe lỗi theo loại tin nhắn | Không |
| [`usePipewaveLatestMessage`](#usepipewavelatestmessage) | Lấy tin nhắn mới nhất (có decode) | Không |
| [`usePipewaveMessageHistory`](#usepipewavemessagehistory) | Tích lũy lịch sử tin nhắn (có decode) | Không |
| [`usePipewaveRequest`](#usepipewaverequest) | Mô hình request-response qua WebSocket | Không |
| [`useDebugLogger`](#usedebuglogger) | Log debug cho kết nối và sự kiện | Không |

> **Lưu ý quan trọng:** Các hook không quản lý kết nối yêu cầu có một component đang mount `usePipewave()` hoặc `usePipewaveResetConnection()` để duy trì kết nối WebSocket.

---

## `usePipewave`

Hook tổng hợp, dùng cho component chính cần vừa kết nối vừa xử lý tin nhắn.

### Signature

```ts
function usePipewave(
  onMessage?: OnMessage,
  onDataError?: OnError
): {
  status: WsStatus
  send: (args: { id: string; msgType: string; data: Uint8Array }) => void
  resetRetryCount: () => void
  reconnect: () => void
}
```

### Types

```ts
type OnMessage = Record<string, (data: Uint8Array, id: string) => Promise<void>>
type OnError   = Record<string, (data: string,    id: string) => Promise<void>>
```

### Hành vi

- Tự động **connect** khi mount, **disconnect** khi unmount (có ref-counting).
- Handlers được lưu theo ref — **không cần `useMemo`** cho handler functions.
- Chỉ re-subscribe khi **tập hợp key** của `onMessage`/`onDataError` thay đổi, không gây reconnect WebSocket.

### Ví dụ

```tsx
function Dashboard() {
  const { status, send } = usePipewave({
    'user.update': async (data, id) => {
      const user = decodeUser(data)
      console.log('User updated:', user)
    },
    'notification': async (data, id) => {
      const msg = decodeNotification(data)
      showToast(msg)
    },
  })

  const handleSend = () => {
    send({
      id: crypto.randomUUID(),
      msgType: 'ping',
      data: new Uint8Array([]),
    })
  }

  return (
    <div>
      <p>Status: {status}</p>
      <button onClick={handleSend}>Ping</button>
    </div>
  )
}
```

---

## `usePipewaveResetConnection`

Hook dùng cho admin/debug panel cần kiểm soát reset kết nối.

### Signature

```ts
function usePipewaveResetConnection(): {
  resetRetryCount: () => void
}
```

### Hành vi

- Tự động **connect** khi mount, **disconnect** khi unmount.
- Trả về `resetRetryCount` để reset bộ đếm retry (hữu ích khi kết nối bị suspend).

### Ví dụ

```tsx
function AdminPanel() {
  const { resetRetryCount } = usePipewaveResetConnection()

  return (
    <button onClick={resetRetryCount}>
      Reset retry count
    </button>
  )
}
```

---

## `usePipewaveStatus`

Đọc trạng thái kết nối WebSocket với các flag tiện lợi.

### Signature

```ts
function usePipewaveStatus(): {
  status: WsStatus
  isConnected: boolean
  isReconnecting: boolean
  isSuspended: boolean
}
```

### Ví dụ

```tsx
function ConnectionBadge() {
  const { isConnected, isReconnecting, isSuspended } = usePipewaveStatus()

  if (isSuspended) return <Badge color="red">Suspended</Badge>
  if (isReconnecting) return <Badge color="yellow">Reconnecting...</Badge>
  if (isConnected) return <Badge color="green">Connected</Badge>
  return <Badge color="gray">Disconnected</Badge>
}
```

---

## `usePipewaveConnectionInfo`

Trả về trạng thái kết nối và transport hiện tại (WebSocket, SSE, v.v.).

### Signature

```ts
function usePipewaveConnectionInfo(): {
  status: WsStatus
  transport: string | undefined
}
```

### Ví dụ

```tsx
function ConnectionInfo() {
  const { status, transport } = usePipewaveConnectionInfo()

  return (
    <div>
      <p>Status: {status}</p>
      <p>Transport: {transport ?? 'N/A'}</p>
    </div>
  )
}
```

---

## `usePipewaveSend`

Gửi tin nhắn không cần subscribe nhận. Không quản lý vòng đời kết nối.

### Signature

```ts
function usePipewaveSend(): {
  send: (args: { id: string; msgType: string; data: Uint8Array }) => void
}
```

### Ví dụ

```tsx
function ActionButton() {
  const { send } = usePipewaveSend()

  const handleClick = () => {
    send({
      id: crypto.randomUUID(),
      msgType: 'action.trigger',
      data: encodeAction({ type: 'refresh' }),
    })
  }

  return <button onClick={handleClick}>Trigger Action</button>
}
```

---

## `usePipewaveMessage`

Subscribe và xử lý tin nhắn của một loại cụ thể (dạng raw `Uint8Array`).

### Signature

```ts
function usePipewaveMessage(
  msgType: string,
  handler: (data: Uint8Array, id: string) => Promise<void>
): void
```

### Hành vi

- Handler được lưu theo ref — **không cần `useCallback`**.
- Chỉ re-subscribe khi `msgType` thay đổi.

### Ví dụ

```tsx
function OrderListener() {
  usePipewaveMessage('order.created', async (data, id) => {
    const order = decodeOrder(data)
    console.log('New order:', order)
  })

  return null
}
```

---

## `usePipewaveError`

Subscribe lỗi trả về từ server cho một loại tin nhắn cụ thể.

### Signature

```ts
function usePipewaveError(
  msgType: string,
  handler: (error: string, id: string) => Promise<void>
): void
```

### Ví dụ

```tsx
function OrderErrorHandler() {
  usePipewaveError('order.created', async (error, id) => {
    console.error(`Order creation failed [${id}]:`, error)
    showErrorToast(error)
  })

  return null
}
```

---

## `usePipewaveLatestMessage`

Lưu trữ **tin nhắn mới nhất** của một loại, đã được decode thành kiểu dữ liệu mong muốn.

### Signature

```ts
function usePipewaveLatestMessage<T>(
  msgType: string,
  options: {
    decode: (bytes: Uint8Array) => T
  }
): { data: T; id: string; receivedAt: Date } | null
```

### Ví dụ

```tsx
function PriceDisplay() {
  const latest = usePipewaveLatestMessage('market.price', {
    decode: (bytes) => decodePrice(bytes),
  })

  if (!latest) return <p>Waiting for price...</p>

  return (
    <div>
      <p>Price: {latest.data.value}</p>
      <p>Updated: {latest.receivedAt.toLocaleTimeString()}</p>
    </div>
  )
}
```

---

## `usePipewaveMessageHistory`

Tích lũy **lịch sử tin nhắn** của một loại vào một mảng, đã được decode.

### Signature

```ts
function usePipewaveMessageHistory<T>(
  msgType: string,
  options: {
    decode: (bytes: Uint8Array) => T
    maxSize?: number  // mặc định: 100
  }
): Array<{ data: T; id: string; receivedAt: Date }>
```

### Ví dụ

```tsx
function EventLog() {
  const history = usePipewaveMessageHistory('audit.event', {
    decode: (bytes) => decodeAuditEvent(bytes),
    maxSize: 50,
  })

  return (
    <ul>
      {history.map((entry) => (
        <li key={entry.id}>
          [{entry.receivedAt.toLocaleTimeString()}] {entry.data.description}
        </li>
      ))}
    </ul>
  )
}
```

---

## `usePipewaveRequest`

Mô hình **request-response** qua WebSocket: gửi yêu cầu và chờ phản hồi khớp ID.

### Signature

```ts
function usePipewaveRequest<Req, Res>(
  reqType: string,
  resType: string,
  options: {
    encode: (req: Req) => Uint8Array
    decode: (bytes: Uint8Array) => Res
    timeout?: number  // mặc định: 5000ms
  }
): {
  sendAndWait: (req: Req, id?: string) => Promise<Res>
  isLoading: boolean
}
```

### Hành vi

- Gửi tin nhắn với `reqType`, chờ phản hồi với `resType` có **cùng ID**.
- Tự động reject nếu vượt quá `timeout` (mặc định 5 giây).
- Hỗ trợ nhiều request song song — `isLoading` là `true` khi còn bất kỳ request nào đang chờ.

### Ví dụ

```tsx
function UserSearch() {
  const { sendAndWait, isLoading } = usePipewaveRequest<SearchReq, SearchRes>(
    'user.search.req',
    'user.search.res',
    {
      encode: (req) => encodeSearchReq(req),
      decode: (bytes) => decodeSearchRes(bytes),
      timeout: 3000,
    }
  )

  const handleSearch = async (query: string) => {
    try {
      const result = await sendAndWait({ query })
      console.log('Results:', result.users)
    } catch (err) {
      console.error('Search failed:', err)
    }
  }

  return (
    <div>
      <button onClick={() => handleSearch('alice')} disabled={isLoading}>
        {isLoading ? 'Searching...' : 'Search'}
      </button>
    </div>
  )
}
```

---

## `useDebugLogger`

Log debug cho các sự kiện kết nối WebSocket ra console. Dùng trong môi trường development.

### Signature

```ts
function useDebugLogger(enabled: boolean): void
```

### Các sự kiện được log

| Sự kiện | Log message |
|---------|-------------|
| Thay đổi trạng thái | `[Pipewave Debug] Status: <status>` |
| Kết nối mở | `[Pipewave Debug] Connection opened` |
| Kết nối đóng | `[Pipewave Debug] Connection closed` |
| Lỗi | `[Pipewave Debug] Error: <error>` |
| Hết lần retry | `[Pipewave Debug] Max retry reached — connection suspended` |

### Ví dụ

```tsx
function App() {
  useDebugLogger(import.meta.env.DEV)

  return <Dashboard />
}
```

---

## Mô hình sử dụng điển hình

### Ứng dụng cơ bản

```tsx
// App.tsx — quản lý kết nối tại root
function App() {
  useDebugLogger(import.meta.env.DEV)

  const { status } = usePipewave({
    'notification': async (data, id) => {
      showToast(decodeNotification(data))
    },
  })

  return (
    <>
      <ConnectionBadge status={status} />
      <Routes />
    </>
  )
}

// FeatureComponent.tsx — dùng hook chuyên biệt, không kết nối lại
function OrdersPage() {
  const history = usePipewaveMessageHistory('order.update', {
    decode: decodeOrder,
    maxSize: 20,
  })

  const { sendAndWait, isLoading } = usePipewaveRequest(
    'order.cancel.req',
    'order.cancel.res',
    { encode: encodeCancel, decode: decodeCancel }
  )

  // ...
}
```

### Tách biệt kết nối và xử lý dữ liệu

Khi có nhiều feature cần listen cùng lúc, mount `usePipewave` một lần ở root và dùng các hook chuyên biệt (`usePipewaveMessage`, `usePipewaveLatestMessage`, v.v.) ở từng component con — kết nối WebSocket chỉ được tạo một lần nhờ ref-counting.
