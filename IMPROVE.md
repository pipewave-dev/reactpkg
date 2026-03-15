# Pipewave React SDK — Review & Improvement Proposals

## 1. Tổng quan đánh giá

**@pipewave/reactpkg** là một React SDK cho real-time communication qua WebSocket với fallback sang Long-Polling. Thiết kế hiện tại gọn gàng, core architecture tốt với reference counting, transport fallback, và message routing theo type. Tuy nhiên, API surface hướng đến người dùng (Context & Hooks) còn khá hạn chế về tính năng và khả năng tuỳ biến.

---

## 2. Review Context Layer

### Điểm tốt
- Tách biệt 3 context (Config, EventHandler, WsApi) — clean separation of concerns
- `PipewaveProvider` đơn giản, dễ setup

### Vấn đề & Đề xuất cải thiện

#### 2.1. Thiếu `ConnectionStatusContext` riêng biệt

Hiện tại `status` chỉ có thể lấy qua `usePipewave()`, buộc component phải đăng ký cả message handler chỉ để đọc status. Nên tách riêng:

```tsx
// Đề xuất: hook riêng cho connection status
const { status, isConnected, isReconnecting, isSuspended } = usePipewaveStatus()
```

Lợi ích: Component chỉ cần hiển thị trạng thái kết nối (ví dụ: badge "Online/Offline") không cần phải gọi `usePipewave()`.

#### 2.2. Thiếu tuỳ chọn `enableLongPollingFallback`

Trong `PipewaveProvider`, `enableLongPollingFallback` luôn hardcode `true`. Nên cho user quyết định:

```tsx
<PipewaveProvider
  config={config}
  enableLongPollingFallback={false}  // User có thể tắt LP fallback
>
```

#### 2.3. Thiếu tuỳ chọn cấu hình Heartbeat

Heartbeat interval hardcode 30s. Nên cho phép cấu hình:

```ts
class PipewaveModuleConfig {
  heartbeatInterval?: number  // default: 30000ms
}
```

#### 2.4. Thiếu `onReconnect` và `onTransportChange` event

`WebsocketEventHandler` hiện có: `onOpen`, `onClose`, `onError`, `onData`, `onMaxRetry`. Nên bổ sung:

```ts
interface WebsocketEventHandler {
  // ... existing
  onReconnect?: (attempt: number) => Promise<void>         // Mỗi lần retry
  onTransportChange?: (transport: 'ws' | 'lp') => Promise<void>  // Khi switch WS <-> LP
  onStatusChange?: (status: WsStatus) => Promise<void>     // Bất kỳ thay đổi status
}
```

#### 2.5. Không support multiple PipewaveProvider instances

Nếu app cần kết nối đến nhiều backend endpoint khác nhau (multi-tenant, microservices), hiện tại không có cách phân biệt context. Đề xuất hỗ trợ named instances hoặc scope context.

---

## 3. Review Hook Layer

### Điểm tốt
- Tách biệt connection lifecycle effect và message handler effect — tránh reconnect khi thay đổi handler
- Return interface gọn: `{ status, send, resetRetryCount, reconnect }`

### Vấn đề & Đề xuất cải thiện

#### 3.1. `usePipewave` quá monolithic — nên tách thành nhiều hooks nhỏ

Hiện tại `usePipewave` vừa quản lý connection, vừa đăng ký handler, vừa cung cấp `send`. Đề xuất tách:

```tsx
// Hook chỉ đọc status
const { status, isConnected } = usePipewaveStatus()

// Hook chỉ gửi message
const { send } = usePipewaveSend()

// Hook đăng ký nhận message theo type
usePipewaveMessage('CHAT_MSG', async (data, id) => { ... })

// Hook đăng ký nhận error theo type
usePipewaveError('CHAT_MSG', async (error, id) => { ... })

// Hook quản lý connection (cho admin/debug panel)
const { reconnect, resetRetryCount, disconnect } = usePipewaveConnection()
```

Lợi ích:
- Component chỉ re-render khi data nó quan tâm thay đổi
- Giảm boilerplate — không cần tạo `useMemo` map cho mỗi handler
- DX tốt hơn — API rõ ràng hơn cho từng use case

#### 3.2. Handler phải là `Uint8Array` — thiếu built-in deserialization

User luôn phải tự decode `Uint8Array` → object. Nên cung cấp helper hoặc option:

```tsx
// Option 1: Generic hook tự decode
const { data, id } = usePipewaveMessage<ChatMessage>('CHAT_MSG', {
  decode: (bytes) => decode(bytes) as ChatMessage
})

// Option 2: Cung cấp utility decode
import { unpackMessage } from '@pipewave/reactpkg'
const msg = unpackMessage<ChatMessage>(data)
```

#### 3.3. Thiếu `usePipewaveLatestMessage` — hook lưu message gần nhất

Rất phổ biến trong real-time app: component cần hiển thị message mới nhất mà không phải tự quản lý state:

```tsx
const latestChat = usePipewaveLatestMessage<ChatMessage>('CHAT_MSG', {
  decode: (bytes) => decode(bytes) as ChatMessage
})
// latestChat = { data: ChatMessage, id: string, receivedAt: Date } | null
```

#### 3.4. Thiếu `usePipewaveMessageHistory` — hook buffer messages

Cho các use case cần accumulate messages (chat log, activity feed):

```tsx
const messages = usePipewaveMessageHistory<ChatMessage>('CHAT_MSG', {
  decode: (bytes) => decode(bytes) as ChatMessage,
  maxSize: 100,  // giữ tối đa 100 messages
})
// messages = Array<{ data: ChatMessage, id: string, receivedAt: Date }>
```

#### 3.5. User phải `useMemo` cho `onMessage` map — DX kém

Đây là pain point lớn nhất. Nếu quên `useMemo`, handler bị unregister/re-register mỗi render, message bị drop silently. Nên:

- **Giải pháp ngắn hạn**: Dùng `useRef` nội bộ để so sánh handler keys thay vì so sánh reference.
- **Giải pháp dài hạn**: Tách thành hook `usePipewaveMessage(msgType, handler)` nhận single handler — dễ memoize hơn object map.

#### 3.6. Thiếu hook cho request-response pattern

Nhiều app cần gửi message và chờ response tương ứng (theo message ID):

```tsx
const { sendAndWait, isLoading } = usePipewaveRequest<Req, Res>('REQ_TYPE', 'RES_TYPE', {
  encode: (req) => encode(req),
  decode: (bytes) => decode(bytes) as Res,
  timeout: 5000,
})

const response = await sendAndWait({ action: 'getUser', userId: '123' })
```

#### 3.7. `send()` không trả về Promise có ý nghĩa

`WebsocketApi.send()` return `Promise<void>` nhưng chỉ throw nếu socket chưa ready. Không có cách biết message đã gửi thành công hay chưa (ít nhất ở transport level). Nên cung cấp send acknowledgement hoặc `onSendError` callback.

---

## 4. Đề xuất chung cho cả Context & Hooks

### 4.1. Thiếu Debug/DevTools support

```tsx
<PipewaveProvider config={config} debug={true}>
```

Khi `debug=true`:
- Log tất cả message in/out ra console
- Expose metrics: messages sent/received, reconnect count, transport type
- Có thể tích hợp React DevTools

### 4.2. Thiếu middleware/interceptor pattern

Cho phép user can thiệp vào message pipeline:

```tsx
<PipewaveProvider
  config={config}
  middleware={[
    loggingMiddleware,
    authRefreshMiddleware,  // Tự refresh token khi 401
    retryMiddleware,
  ]}
>
```

### 4.3. Thiếu connection quality indicator

```tsx
const { latency, transport, uptime } = usePipewaveConnectionInfo()
```

Hữu ích cho UX — hiển thị chất lượng kết nối cho user.

### 4.4. Thiếu type-safe message definition

Hiện tại message type là `string`, data là `Uint8Array`. Nên hỗ trợ schema registry:

```tsx
// Định nghĩa schema
const pipewaveSchema = createPipewaveSchema({
  CHAT_MSG: { encode: encodeChatMsg, decode: decodeChatMsg },
  USER_STATUS: { encode: encodeUserStatus, decode: decodeUserStatus },
})

// Type-safe hooks
const { send } = usePipewaveSend(pipewaveSchema)
send('CHAT_MSG', { text: 'Hello' })  // TypeScript biết shape của payload
```

### 4.5. Thiếu Suspense & Error Boundary support

```tsx
// Suspense: component suspend cho đến khi connection ready
const data = usePipewaveMessage('CHAT_MSG', { suspense: true })

// Error Boundary: throw error khi connection fail
<PipewaveErrorBoundary fallback={<ConnectionLost />}>
  <ChatApp />
</PipewaveErrorBoundary>
```

---

## 5. Các vấn đề kỹ thuật cần sửa

| # | File | Vấn đề |
|---|------|--------|
| 1 | `websocket-api.ts:206` | `randomString()` dùng `Math.random()` — không an toàn cho ID. Nên dùng `crypto.randomUUID()` hoặc `crypto.getRandomValues()` |
| 2 | `service.ts:117-133` | Block catch duplicate logic retry với onclose — nên extract thành method |
| 3 | `service.ts:58` | Token truyền qua query string `?tk=` — có thể bị log. Cân nhắc dùng protocol header nếu backend hỗ trợ |
| 4 | `types.ts:16-20,30-34` | Default retry config duplicate 2 lần — nên extract thành constant |
| 5 | `usePipewave.ts:55` | `return () => { }` — empty function unnecessary, có thể return `undefined` |
| 6 | `provider.tsx:29` | `eventHandler` bị mutate (`eventHandler = eventHandler \|\| {}`) — nên dùng `const` với default value |

---

## 6. Mức ưu tiên đề xuất

### P0 — Nên làm ngay (DX & correctness)
- **3.1** Tách `usePipewaveStatus()` riêng biệt
- **3.5** Giải quyết vấn đề `useMemo` requirement — giảm khả năng bug cho user
- **3.2** Cung cấp decode utility

### P1 — Nên làm sớm (tính năng thiếu rõ ràng)
- **2.4** Thêm `onReconnect`, `onStatusChange` event
- **3.1** Tách `usePipewaveSend()` và `usePipewaveMessage()` hooks
- **4.1** Debug mode

### P2 — Nên làm (nâng cao DX)
- **2.2** Config `enableLongPollingFallback`
- **2.3** Config heartbeat interval
- **3.3** `usePipewaveLatestMessage` hook
- **3.6** Request-response pattern hook
- **4.4** Type-safe message schema

### P3 — Nice to have
- **3.4** Message history hook
- **4.2** Middleware pattern
- **4.3** Connection quality indicator
- **4.5** Suspense & Error Boundary support
- **2.5** Multiple provider instances

---

## 7. Tóm tắt

Project có foundation tốt. Core transport layer (WebSocket + Long-Polling fallback, retry, reference counting) được thiết kế cẩn thận. Tuy nhiên, **lớp API hướng đến user (Context & Hooks) cần được mở rộng đáng kể** để cạnh tranh với các SDK real-time khác (Socket.IO client, Ably, Pusher). Trọng tâm cải thiện nên là:

1. **Granular hooks** — tách nhỏ `usePipewave` để component chỉ subscribe vào data cần thiết
2. **Type safety & DX** — giảm boilerplate, cung cấp decode helpers, bỏ yêu cầu `useMemo`
3. **Observability** — status hook riêng, debug mode, connection events đầy đủ hơn
