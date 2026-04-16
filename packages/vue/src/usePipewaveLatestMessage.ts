import { inject, onMounted, onUnmounted, shallowRef } from 'vue'
import { PipewaveApiKey, PipewaveHandlerKey } from './plugin'

interface LatestMessage<T> {
    data: T
    id: string
    receivedAt: Date
}

/**
 * Returns a reactive ref holding the latest decoded message of a given type.
 *
 * @example
 * const latest = usePipewaveLatestMessage('CHAT_MSG', bytes => decode(bytes))
 * // template: {{ latest?.data }}
 */
export function usePipewaveLatestMessage<T>(
    msgType: string,
    decode: (bytes: Uint8Array) => T,
) {
    const api = inject(PipewaveApiKey)!
    const wsHandler = inject(PipewaveHandlerKey)!

    const latest = shallowRef<LatestMessage<T> | null>(null)

    let unsub: (() => void) | null = null

    onMounted(() => {
        api.connect()
        unsub = wsHandler.onMsgType(msgType, async (data, id) => {
            latest.value = { data: decode(data), id, receivedAt: new Date() } as LatestMessage<T>
        })
    })

    onUnmounted(() => {
        api.disconnect()
        unsub?.()
    })

    return latest
}
