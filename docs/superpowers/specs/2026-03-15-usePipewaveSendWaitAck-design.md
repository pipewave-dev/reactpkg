# Design: usePipewaveSendWaitAck

**Date:** 2026-03-15
**Status:** Approved

## Overview

Add a hook `usePipewaveSendWaitAck` that sends a WebSocket message and waits for an acknowledgment (Ack) message. Returns a `Promise<boolean>` — `true` if Ack received within timeout, `false` otherwise.

An Ack is defined as an incoming message with:
- Same `MsgType` as the sent message
- `ReturnToId` equal to the `Id` of the sent message

## Changes Required

### 1. Extend `DataHandler` in `eventHandler.ts`

**File:** `src/external/pipewave/utils/eventHandler.ts`

Add `returnToId: string` as 3rd parameter to `DataHandler`:

```ts
type DataHandler = (data: Uint8Array, id: string, returnToId: string) => Promise<void>
```

Update `onData` to forward `data.ReturnToId` when calling data handlers:

```ts
await Promise.all(
    Array.from(handlers).map(h => h(data.Data, data.Id, data.ReturnToId))
)
```

**Backward-compatible:** existing handlers using only `(data, id)` are unaffected — TypeScript allows ignoring trailing parameters.

### 2. Implement `usePipewaveSendWaitAck` hook

**File:** `src/hooks/usePipewaveSendWaitAck.ts`

```ts
export function usePipewaveSendWaitAck(timeout: number = 5000) {
    const wsApi = usePipewaveWsApi()
    const wsHandler = usePipewaveWsEventHandler()

    useEffect(() => {
        wsApi.connect()
        return () => wsApi.disconnect()
    }, [wsApi])

    const sendWaitAck = useCallback(
        ({ id, msgType, data }) =>
            new Promise<boolean>((resolve) => {
                // Subscribe BEFORE send to avoid race condition
                const unsub = wsHandler.onMsgType(
                    msgType,
                    async (_data, _id, returnToId) => {
                        if (returnToId === id) {
                            clearTimeout(timer)
                            unsub()
                            resolve(true)
                        }
                    }
                )

                const timer = setTimeout(() => {
                    unsub()
                    resolve(false)
                }, timeout)

                wsApi.send({ id, msgType, data }).catch(() => {
                    clearTimeout(timer)
                    unsub()
                    resolve(false)
                })
            }),
        [wsApi, wsHandler, timeout]
    )

    return { sendWaitAck }
}
```

## Algorithm Details

- **Subscribe before send:** prevents race condition where Ack arrives before handler is registered
- **Per-call cleanup:** each `sendWaitAck` call owns its `unsub` + `timer` — concurrent calls with different `id`s work correctly
- **Send failure:** if `wsApi.send` throws (disconnected, network error) → resolve `false`
- **Timeout:** default 5000ms, configurable per hook instance

## Files to Modify

1. `src/external/pipewave/utils/eventHandler.ts` — extend `DataHandler`, update `onData`
2. `src/hooks/usePipewaveSendWaitAck.ts` — implement hook
3. `src/hooks/index.ts` — export new hook
