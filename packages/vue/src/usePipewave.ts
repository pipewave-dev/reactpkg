import { inject, onMounted, onUnmounted } from 'vue'
import { PipewaveApiKey, PipewaveHandlerKey, PipewaveStatusKey } from './plugin'

type DataHandler = (data: Uint8Array, id: string) => Promise<void>
type ErrorHandler = (error: string, id: string) => Promise<void>

/**
 * All-in-one composable: connects, subscribes to message/error handlers,
 * and exposes send/reconnect/resetRetryCount.
 *
 * @example
 * const { status, send } = usePipewave({
 *   CHAT_MSG: async (data, id) => { ... },
 * })
 */
export function usePipewave(
    onMessage?: Record<string, DataHandler>,
    onDataError?: Record<string, ErrorHandler>,
) {
    const api = inject(PipewaveApiKey)!
    const handler = inject(PipewaveHandlerKey)!
    const status = inject(PipewaveStatusKey)!

    const unsubs: (() => void)[] = []

    onMounted(() => {
        api.connect()

        if (onMessage) {
            for (const [msgType, cb] of Object.entries(onMessage)) {
                unsubs.push(handler.onMsgType(msgType, cb))
            }
        }

        if (onDataError) {
            for (const [msgType, cb] of Object.entries(onDataError)) {
                unsubs.push(handler.onErrorType(msgType, cb))
            }
        }
    })

    onUnmounted(() => {
        api.disconnect()
        unsubs.forEach(fn => fn())
    })

    return {
        /** Reactive connection status */
        status,
        send: (args: { id: string; msgType: string; data: Uint8Array }) => api.send(args),
        resetRetryCount: () => api.resetRetryCount(),
        reconnect: () => api.reconnect(),
    }
}
