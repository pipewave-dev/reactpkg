import { computed, inject, onMounted, onUnmounted } from 'vue'
import { WsStatus } from '@pipewave/core'
import { PipewaveApiKey, PipewaveStatusKey } from './plugin'

/**
 * Returns reactive connection info and control methods.
 *
 * @example
 * const { isConnected, transport, resetRetryCount } = usePipewaveConnectionInfo()
 */
export function usePipewaveConnectionInfo() {
    const api = inject(PipewaveApiKey)!
    const status = inject(PipewaveStatusKey)!

    onMounted(() => api.connect())
    onUnmounted(() => api.disconnect())

    return {
        status,
        isConnected: computed(() => status.value === WsStatus.READY),
        isReconnecting: computed(() => status.value === WsStatus.RECONNECTING),
        isSuspended: computed(() => status.value === WsStatus.SUSPEND),
        transport: computed(() => api.getActiveTransport()),
        resetRetryCount: () => api.resetRetryCount(),
        reconnect: () => api.reconnect(),
    }
}
