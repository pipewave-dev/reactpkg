import { useEffect, useEffectEvent, useState } from 'react'
import { usePipewaveWsEventHandler, usePipewaveWsApi } from '@/context'

interface MessageEntry<T> {
    data: T
    id: string
    receivedAt: Date
}

interface Options<T> {
    decode: (bytes: Uint8Array) => T
    maxSize?: number  // default: 100
}

/**
 * Accumulates decoded messages of a given type into an array.
 */
export function usePipewaveMessageHistory<T>(
    msgType: string,
    options: Options<T>,
): MessageEntry<T>[] {
    const wsApi = usePipewaveWsApi()
    useEffect(() => {
        wsApi.connect()
        return () => wsApi.disconnect()
    }, [wsApi])


    const wsHandler = usePipewaveWsEventHandler()
    const [messages, setMessages] = useState<MessageEntry<T>[]>([])
    const decodeMessage = useEffectEvent((bytes: Uint8Array) => options.decode(bytes))
    const maxSize = options.maxSize ?? 100

    useEffect(() => {
        const unsub = wsHandler.onMsgType(msgType, async (data, id) => {
            setMessages(prev => {
                const next = [...prev, {
                    data: decodeMessage(data),
                    id,
                    receivedAt: new Date(),
                }]
                return next.length > maxSize ? next.slice(-maxSize) : next
            })
        })
        return unsub
    }, [wsHandler, msgType, maxSize])

    return messages
}
