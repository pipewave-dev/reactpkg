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
 */
export function usePipewaveSendWaitAck(timeout: number = 5000) {
    const wsApi = usePipewaveWsApi()
    const wsHandler = usePipewaveWsEventHandler()

    useEffect(() => {
        wsApi.connect()
        return () => wsApi.disconnect()
    }, [wsApi])

    const sendWaitAck = useCallback(
        ({ id, msgType, data }: { id: string; msgType: string; data: Uint8Array }) => {
            let resolveResult!: (ackOk: boolean, data?: Uint8Array | null) => void

            const result = new Promise<{
                ackOk: boolean
                data: Uint8Array | null
            }>((resolve) => {
                resolveResult = (ackOk: boolean, data: Uint8Array | null = null) => {
                    resolve({ ackOk, data })
                }
            })

            // Subscribe BEFORE send to avoid race condition where Ack arrives first
            const unsub = wsHandler.onMsgType(
                msgType,
                async (incomingData, _id, returnToId) => {
                    if (returnToId === id) {
                        clearTimeout(timer)
                        unsub()
                        resolveResult(true, incomingData)
                    }
                }
            )

            const timer = setTimeout(() => {
                unsub()
                resolveResult(false)
            }, timeout)

            wsApi.send({ id, msgType, data }).catch(() => {
                clearTimeout(timer)
                unsub()
                resolveResult(false)
            })

            return result
        },
        [wsApi, wsHandler, timeout]
    )

    return { sendWaitAck }
}
