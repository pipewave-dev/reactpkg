import { useCallback, useEffect } from 'react'
import { usePipewaveWsApi, usePipewaveWsEventHandler } from '@/context'

/**
 * Hook for sending a message and waiting for an acknowledgment (Ack).
 *
 * Returns { sendWaitAck } — a function that sends a message and resolves:
 *   - true  if an Ack is received before timeout
 *   - false if timeout expires or send fails
 *
 * Ack is defined as an incoming message with the same MsgType
 * and ReturnToId matching the sent message's Id.
 *
 * Note: This hook does NOT manage the connection lifecycle.
 * Ensure a component using usePipewave() or usePipewaveConnection() is mounted.
 */
export function usePipewaveSendWaitAck(timeout: number = 5000) {
    const wsApi = usePipewaveWsApi()
    const wsHandler = usePipewaveWsEventHandler()

    useEffect(() => {
        wsApi.connect()
        return () => wsApi.disconnect()
    }, [wsApi])

    const sendWaitAck = useCallback(
        ({ id, msgType, data }: { id: string; msgType: string; data: Uint8Array }) =>
            new Promise<boolean>((resolve) => {
                // Subscribe BEFORE send to avoid race condition where Ack arrives first
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
