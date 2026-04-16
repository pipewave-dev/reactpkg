import { inject, onMounted, onUnmounted } from 'vue'
import { PipewaveApiKey } from './plugin'

/**
 * Composable for sending messages without subscribing to incoming data.
 *
 * @example
 * const { send } = usePipewaveSend()
 * await send({ id: '1', msgType: 'CHAT_MSG', data: encoded })
 */
export function usePipewaveSend() {
    const api = inject(PipewaveApiKey)!

    onMounted(() => api.connect())
    onUnmounted(() => api.disconnect())

    return {
        send: (args: { id: string; msgType: string; data: Uint8Array }) => api.send(args),
    }
}
