import { useEffect, useEffectEvent } from 'react'
import { usePipewaveWsEventHandler, usePipewaveWsApi } from '@/context'

type DataHandler = (data: Uint8Array, id: string) => Promise<void>

/**
 * Subscribe to a specific message type.
 * Handler is stored by ref — no need to memoize.
 *
 * Note: This hook does NOT manage the connection lifecycle.
 * Ensure a component using usePipewave() or usePipewaveConnection() is mounted
 * to establish the WebSocket connection.
 */
export function usePipewaveMessage(msgType: string, handler: DataHandler) {
    const wsApi = usePipewaveWsApi()
    useEffect(() => {
        wsApi.connect()
        return () => wsApi.disconnect()
    }, [wsApi])

    const wsHandler = usePipewaveWsEventHandler()
    const onMessage = useEffectEvent(async (data: Uint8Array, id: string) => {
        await handler(data, id)
    })

    useEffect(() => {
        const unsub = wsHandler.onMsgType(msgType, async (data, id) => {
            await onMessage(data, id)
        })
        return unsub
    }, [wsHandler, msgType])
}
