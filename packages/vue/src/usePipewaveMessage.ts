import { inject, onMounted, onUnmounted, watch, isRef, type Ref } from 'vue'
import { PipewaveApiKey, PipewaveHandlerKey } from './plugin'

type DataHandler = (data: Uint8Array, id: string) => Promise<void>

/**
 * Subscribe to a specific message type.
 * Accepts a static string or a reactive Ref<string> for msgType.
 *
 * @example
 * usePipewaveMessage('CHAT_MSG', async (data, id) => { ... })
 */
export function usePipewaveMessage(msgType: string | Ref<string>, handler: DataHandler) {
    const api = inject(PipewaveApiKey)!
    const wsHandler = inject(PipewaveHandlerKey)!

    let unsub: (() => void) | null = null

    const subscribe = (type: string) => {
        unsub?.()
        unsub = wsHandler.onMsgType(type, handler)
    }

    onMounted(() => {
        api.connect()
        subscribe(isRef(msgType) ? msgType.value : msgType)
    })

    if (isRef(msgType)) {
        watch(msgType, (newType) => subscribe(newType))
    }

    onUnmounted(() => {
        api.disconnect()
        unsub?.()
    })
}
