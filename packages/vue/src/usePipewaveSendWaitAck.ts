import { inject, onMounted, onUnmounted } from 'vue'
import { PipewaveApiKey, PipewaveHandlerKey } from './plugin'

/**
 * Composable for sending a message and waiting for an acknowledgment (Ack).
 *
 * Returns { sendWaitAck } — a function that sends a message and resolves:
 *   - { ackOk: true, data }  if an Ack is received before timeout
 *   - { ackOk: false, data: null } if timeout expires or send fails
 *
 * Ack is defined as an incoming message with the same MsgType
 * and ReturnToId matching the sent message's Id.
 *
 * @example
 * const { sendWaitAck } = usePipewaveSendWaitAck(5000)
 * const { ackOk, data } = await sendWaitAck({ id, msgType, data: encoded })
 */
export function usePipewaveSendWaitAck(timeout: number = 5000) {
    const api = inject(PipewaveApiKey)!
    const wsHandler = inject(PipewaveHandlerKey)!

    onMounted(() => api.connect())
    onUnmounted(() => api.disconnect())

    const sendWaitAck = (
        { id, msgType, data }: { id: string; msgType: string; data: Uint8Array },
    ): Promise<{ ackOk: boolean; data: Uint8Array | null }> => {
        let resolveResult!: (ackOk: boolean, d?: Uint8Array | null) => void

        const result = new Promise<{ ackOk: boolean; data: Uint8Array | null }>((resolve) => {
            resolveResult = (ackOk, d: Uint8Array | null = null) => resolve({ ackOk, data: d })
        })

        // Subscribe BEFORE send to avoid race condition where Ack arrives first
        const unsub = wsHandler.onMsgType(msgType, async (incomingData, _id, returnToId) => {
            if (returnToId === id) {
                clearTimeout(timer)
                unsub()
                resolveResult(true, incomingData)
            }
        })

        const timer = setTimeout(() => {
            unsub()
            resolveResult(false)
        }, timeout)

        api.send({ id, msgType, data }).catch(() => {
            clearTimeout(timer)
            unsub()
            resolveResult(false)
        })

        return result
    }

    return { sendWaitAck }
}
