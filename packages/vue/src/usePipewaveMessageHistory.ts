import { inject, onMounted, onUnmounted, shallowRef } from 'vue'
import { PipewaveApiKey, PipewaveHandlerKey } from './plugin'

interface MessageEntry<T> {
    data: T
    id: string
    receivedAt: Date
}

/**
 * Returns a reactive ref holding an array of decoded messages of a given type.
 * Older messages are dropped once maxSize is reached.
 *
 * @example
 * const messages = usePipewaveMessageHistory('CHAT_MSG', {
 *   decode: bytes => decode(bytes),
 *   maxSize: 100,
 * })
 * // template: <div v-for="m in messages" :key="m.id">{{ m.data }}</div>
 */
export function usePipewaveMessageHistory<T>(
    msgType: string,
    options: { decode: (bytes: Uint8Array) => T; maxSize: number },
) {
    const api = inject(PipewaveApiKey)!
    const wsHandler = inject(PipewaveHandlerKey)!

    const messages = shallowRef<MessageEntry<T>[]>([])

    let unsub: (() => void) | null = null

    onMounted(() => {
        api.connect()
        unsub = wsHandler.onMsgType(msgType, async (data, id) => {
            const entry = { data: options.decode(data), id, receivedAt: new Date() } as MessageEntry<T>
            const next = [...messages.value, entry]
            messages.value = next.length > options.maxSize ? next.slice(-options.maxSize) : next
        })
    })

    onUnmounted(() => {
        api.disconnect()
        unsub?.()
    })

    return messages
}
