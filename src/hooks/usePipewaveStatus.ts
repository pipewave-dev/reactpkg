import { useEffect, useMemo } from 'react'
import { useConnectionStatus, usePipewaveWsApi } from '@/context'
import { WsStatus } from '@/external/pipewave/services'

export function usePipewaveStatus() {
    const wsApi = usePipewaveWsApi()
    useEffect(() => {
        wsApi.connect()
        return () => wsApi.disconnect()
    }, [wsApi])


    const { status } = useConnectionStatus()

    return useMemo(() => ({
        status,
        isConnected: status === WsStatus.READY,
        isReconnecting: status === WsStatus.RECONNECTING,
        isSuspended: status === WsStatus.SUSPEND,
    }), [status])
}
