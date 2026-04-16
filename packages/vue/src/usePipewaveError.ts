import { inject, onMounted, onUnmounted, watch, isRef, type Ref } from 'vue'
import { PipewaveApiKey, PipewaveHandlerKey } from './plugin'

type ErrorHandler = (error: string, id: string) => Promise<void>

/**
 * Subscribe to error messages of a specific type.
 * Accepts a static string or a reactive Ref<string> for msgType.
 *
 * @example
 * usePipewaveError('CHAT_MSG', async (error, id) => { console.error(error) })
 */
export function usePipewaveError(msgType: string | Ref<string>, handler: ErrorHandler) {
    const api = inject(PipewaveApiKey)!
    const wsHandler = inject(PipewaveHandlerKey)!

    let unsub: (() => void) | null = null

    const subscribe = (type: string) => {
        unsub?.()
        unsub = wsHandler.onErrorType(type, handler)
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
