import { useState, useEffect, useRef, type ReactNode } from 'react'
import { ConnectionStatusContext } from './connectionStatusContext'
import type { WsStatus } from '@/external/pipewave/services'
import type { WebsocketApi } from '@/external/pipewave'
import type { WsEventHandlerUtils } from '@/external/pipewave/utils/eventHandler'

interface Props {
    wsApi: WebsocketApi
    wsHandler: WsEventHandlerUtils
    children: ReactNode
}

export function ConnectionStatusProvider({ wsApi, wsHandler, children }: Props) {
    const [status, setStatus] = useState<WsStatus>(wsApi.getStatus())
    const statusRef = useRef(status)

    useEffect(() => {
        const updateStatus = async () => {
            const newStatus = wsApi.getStatus()
            if (newStatus === statusRef.current) return
            statusRef.current = newStatus
            setStatus(newStatus)
            try {
                if (wsHandler.onStatusChange) {
                    await wsHandler.onStatusChange(newStatus)
                }
            } catch (e) {
                console.error('[Pipewave] onStatusChange error:', e)
            }
        }
        const fns: (() => void)[] = []
        fns.push(wsHandler.setOnOpen(updateStatus))
        fns.push(wsHandler.setOnClose(updateStatus))
        fns.push(wsHandler.setOnError(updateStatus))
        fns.push(wsHandler.setOnMaxRetry(updateStatus))
        return () => fns.forEach(fn => fn())
    }, [wsApi, wsHandler])

    return (
        <ConnectionStatusContext.Provider value={{ status, setStatus }}>
            {children}
        </ConnectionStatusContext.Provider>
    )
}
