import { useEffect, useEffectEvent, useState } from 'react'
import { usePipewaveWsEventHandler, usePipewaveWsApi } from '@/context'

interface LatestMessage<T> {
    data: T
    id: string
    receivedAt: Date
}

interface Options<T> {
    decode: (bytes: Uint8Array) => T
}

/**
 * Returns the latest message of a given type, decoded via the provided function.
 */
export function usePipewaveLatestMessage<T>(
    msgType: string,
    options: Options<T>,
): LatestMessage<T> | null {
    const wsApi = usePipewaveWsApi()
    useEffect(() => {
        wsApi.connect()
        return () => wsApi.disconnect()
    }, [wsApi])

    const wsHandler = usePipewaveWsEventHandler()
    const [latest, setLatest] = useState<LatestMessage<T> | null>(null)
    const decodeLatestMessage = useEffectEvent((bytes: Uint8Array) => options.decode(bytes))

    useEffect(() => {
        const unsub = wsHandler.onMsgType(msgType, async (data, id) => {
            setLatest({
                data: decodeLatestMessage(data),
                id,
                receivedAt: new Date(),
            })
        })
        return unsub
    }, [wsHandler, msgType])

    return latest
}
