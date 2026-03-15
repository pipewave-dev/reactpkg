import { useEffect } from 'react'
import { usePipewaveWsEventHandler } from '@/context'
import { useConnectionStatus } from '@/context/connectionStatusContext'

export function useDebugLogger(enabled: boolean) {
    const wsHandler = usePipewaveWsEventHandler()
    const { status } = useConnectionStatus()

    useEffect(() => {
        if (!enabled) return
        console.log('[Pipewave Debug] Status:', status)
    }, [enabled, status])

    useEffect(() => {
        if (!enabled) return

        const fns: (() => void)[] = []

        fns.push(wsHandler.setOnOpen(async () => {
            console.log('[Pipewave Debug] Connection opened')
        }))

        fns.push(wsHandler.setOnClose(async () => {
            console.log('[Pipewave Debug] Connection closed')
        }))

        fns.push(wsHandler.setOnError(async (error) => {
            console.log('[Pipewave Debug] Error:', error)
        }))

        fns.push(wsHandler.setOnMaxRetry(async () => {
            console.log('[Pipewave Debug] Max retry reached — connection suspended')
        }))

        return () => fns.forEach(fn => fn())
    }, [enabled, wsHandler])
}
