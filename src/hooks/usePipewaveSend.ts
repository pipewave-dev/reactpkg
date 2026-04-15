import { useCallback, useEffect } from 'react'
import { usePipewaveWsApi } from '@/context'

/**
 * Hook for sending messages without subscribing to incoming data.
 */
export function usePipewaveSend() {
    const wsApi = usePipewaveWsApi()
    useEffect(() => {
        wsApi.connect()
        return () => wsApi.disconnect()
    }, [wsApi])

    const send = useCallback(
        (args: { id: string; msgType: string; data: Uint8Array<ArrayBufferLike> }) =>
            wsApi.send(args),
        [wsApi]
    )

    return { send }
}
