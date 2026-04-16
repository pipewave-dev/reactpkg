import { useCallback, useEffect, useMemo } from 'react'
import { WsStatus } from '@pipewave/core'
import { useConnectionStatus, usePipewaveWsApi } from '../context'

export function usePipewaveConnectionInfo() {
    const wsApi = usePipewaveWsApi()
    const { status } = useConnectionStatus()
    useEffect(() => {
        wsApi.connect()
        return () => wsApi.disconnect()
    }, [wsApi])


    const resetRetryCount = useCallback(() => wsApi.resetRetryCount(), [wsApi])

    const info = useMemo(() => ({
        status,
        isConnected: status === WsStatus.READY,
        isReconnecting: status === WsStatus.RECONNECTING,
        isSuspended: status === WsStatus.SUSPEND,
        transport: wsApi.getActiveTransport(),
    }), [status, wsApi])

    return {
        ...info,
        resetRetryCount,
    }
}
