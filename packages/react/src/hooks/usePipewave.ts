import { usePipewaveWsApi, usePipewaveWsEventHandler } from "../context";
import { useConnectionStatus } from "../context/connectionStatusContext";
import { useCallback, useEffect, useEffectEvent } from "react";

// OnMessage is a record of key is message type and value is data handler
export type OnMessage = Record<string, DataHandler>
/**
 * Handler for a WebSocket message type.
 */
type DataHandler = (data: Uint8Array, id: string) => Promise<void>

export type OnError = Record<string, DataErrorHandler>
type DataErrorHandler = (data: string, id: string) => Promise<void>

/**
 * @param onMessage - Map of message type to handler function.
 *   Handlers are stored by ref internally — no need to memoize with useMemo.
 *   Only re-subscribes when the set of message type keys changes.
 */
export function usePipewave(onMessage?: OnMessage, onDataError?: OnError) {
    const wsApi = usePipewaveWsApi()
    const wsHandler = usePipewaveWsEventHandler()
    const { status } = useConnectionStatus()

    const handleMessage = useEffectEvent(async (msgType: string, data: Uint8Array, id: string) => {
        const handler = onMessage?.[msgType]
        if (handler) await handler(data, id)
    })

    const handleDataError = useEffectEvent(async (msgType: string, error: string, id: string) => {
        const handler = onDataError?.[msgType]
        if (handler) await handler(error, id)
    })

    // Connection lifecycle: connect/disconnect with ref counting
    useEffect(() => {
        wsApi.connect()
        return () => wsApi.disconnect()
    }, [wsApi])

    // Separate effect for message handlers: re-subscribes when handler keys change
    // without triggering WebSocket reconnection
    useEffect(() => {
        if (!onMessage) return
        const fns = Object.entries(onMessage).map(([msgType]) =>
            wsHandler.onMsgType(msgType, async (data, id) => {
                await handleMessage(msgType, data, id)
            })
        )
        return () => fns.forEach(fn => fn())
        // Re-register only when handler keys change, not values
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wsHandler, onMessage && Object.keys(onMessage).sort().join(',')])

    // Separate effect for error handlers: re-subscribes when handler keys change
    // without triggering WebSocket reconnection
    useEffect(() => {
        if (!onDataError) return
        const fns = Object.entries(onDataError).map(([msgType]) =>
            wsHandler.onErrorType(msgType, async (error, id) => {
                await handleDataError(msgType, error, id)
            })
        )
        return () => fns.forEach(fn => fn())
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wsHandler, onDataError && Object.keys(onDataError).sort().join(',')])

    const send = useCallback(
        (args: {
            id: string;
            msgType: string;
            data: Uint8Array<ArrayBufferLike>;
        }) => wsApi.send(args),
        [wsApi]
    )

    const resetRetryCount = useCallback(() => wsApi.resetRetryCount(), [wsApi])

    const reconnect = useCallback(() => wsApi.reconnect(), [wsApi])

    return { status, send, resetRetryCount, reconnect }
}
