import { useCallback, useEffect } from 'react'
import { usePipewaveWsApi } from '@/context'

/**
 * Hook for managing connection lifecycle.
 * Automatically connects on mount and disconnects on unmount.
 * Useful for admin/debug panels that need reconnect/reset controls.
 */
export function usePipewaveResetConnection() {
    const wsApi = usePipewaveWsApi()

    useEffect(() => {
        wsApi.connect()
        return () => wsApi.disconnect()
    }, [wsApi])

    const resetRetryCount = useCallback(() => wsApi.resetRetryCount(), [wsApi])

    return { resetRetryCount }
}
