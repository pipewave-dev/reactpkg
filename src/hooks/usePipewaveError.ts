import { useEffect, useEffectEvent } from 'react'
import { usePipewaveWsEventHandler, usePipewaveWsApi } from '@/context'

type ErrorHandler = (error: string, id: string) => Promise<void>

/**
 * Subscribe to error messages of a specific type.
 * Handler is stored by ref — no need to memoize.
 *
 */
export function usePipewaveError(msgType: string, handler: ErrorHandler) {
    const wsApi = usePipewaveWsApi()
    useEffect(() => {
        wsApi.connect()
        return () => wsApi.disconnect()
    }, [wsApi])

    const wsHandler = usePipewaveWsEventHandler()
    const onError = useEffectEvent(async (error: string, id: string) => {
        await handler(error, id)
    })

    useEffect(() => {
        const unsub = wsHandler.onErrorType(msgType, async (error, id) => {
            await onError(error, id)
        })
        return unsub
    }, [wsHandler, msgType])
}
