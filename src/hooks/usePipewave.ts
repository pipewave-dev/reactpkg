import { usePipewaveWsApi, usePipewaveWsEventHandler } from "@/context";
import { useCallback, useEffect, useState } from "react";

// OnMessage is a record of key is message type and value is data handler
export type OnMessage = Record<string, DataHandler>
/**
 * Handler for a WebSocket message type.
 *
 * ⚠️  Avoid capturing state or props directly inside the handler, as it will
 * become stale when onMessage is memoized with stable deps.
 *
 * - To update state: use functional form → setX(prev => ...)
 * - To read latest value: store it in a ref and read ref.current inside the handler
 */
type DataHandler = (data: Uint8Array, id: string) => Promise<void>

export type OnError = Record<string, DataErrorHandler>
type DataErrorHandler = (data: string, id: string) => Promise<void>

/**
 * @param onMessage - Map of message type to handler function.
 *   Must be memoized with useMemo in the caller.
 *   If a new object reference is passed on every render, handlers will be
 *   briefly unregistered between re-renders, causing incoming messages
 *   to be silently dropped during that window.
 *
 *   @example
 *   const onMessage = useMemo(() => ({
 *     "MSG_TYPE": async (data, id) => { ... }
 *   }), [])
 */
export function usePipewave(onMessage?: OnMessage, onDataError?: OnError) {
    const wsApi = usePipewaveWsApi()
    const wsHandler = usePipewaveWsEventHandler()
    const [status, setStatus] = useState(wsApi.getStatus())

    useEffect(() => {
        const fns: (() => void)[] = []
        fns.push(wsHandler.setOnOpen(async () => setStatus(wsApi.getStatus())))
        fns.push(wsHandler.setOnClose(async () => setStatus(wsApi.getStatus())))
        fns.push(wsHandler.setOnError(async () => setStatus(wsApi.getStatus())))
        fns.push(wsHandler.setOnMaxRetry(async () => setStatus(wsApi.getStatus())))
        wsApi.connect()
        return () => {
            fns.forEach(fn => fn())
            wsApi.disconnect()
        }
    }, [wsApi, wsHandler])

    // Separate effect for message handlers: re-subscribes when onMessage changes
    // without triggering WebSocket reconnection
    useEffect(() => {
        if (!onMessage) {
            return () => { }
        }
        const fns = Object.entries(onMessage).map(([msgType, handler]) =>
            wsHandler.onMsgType(msgType, handler)
        )
        return () => fns.forEach(fn => fn())
    }, [wsHandler, onMessage])

    // Separate effect for message handlers: re-subscribes when onMessage changes
    // without triggering WebSocket reconnection
    useEffect(() => {
        if (!onDataError) {
            return () => { }
        }
        const fns = Object.entries(onDataError).map(([msgType, handler]) =>
            wsHandler.onErrorType(msgType, handler)
        )
        return () => fns.forEach(fn => fn())
    }, [wsHandler, onDataError])

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