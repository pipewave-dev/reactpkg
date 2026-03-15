import { useEffect, useMemo } from 'react'
import { usePipewaveWsApi } from '@/context'
import { useConnectionStatus } from '@/context/connectionStatusContext'

export function usePipewaveConnectionInfo() {
    const wsApi = usePipewaveWsApi()

    useEffect(() => {
        wsApi.connect()
        return () => wsApi.disconnect()
    }, [wsApi])

    const { status } = useConnectionStatus()

    return useMemo(() => ({
        status,
        transport: wsApi.getActiveTransport(),
    }), [wsApi, status])
}
