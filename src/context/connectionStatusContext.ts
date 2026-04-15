import { createContext, useContext } from 'react'
import type { WsStatus } from '@/external/pipewave/services'

interface ConnectionStatusContextValue {
    status: WsStatus
    setStatus: (status: WsStatus) => void
}

const ConnectionStatusContext = createContext<ConnectionStatusContextValue>(
    null as unknown as ConnectionStatusContextValue
)

export const useConnectionStatus = () => {
    const ctx = useContext(ConnectionStatusContext)
    if (!ctx) throw new Error("useConnectionStatus must be used within ConnectionStatusProvider")
    return ctx
}

export { ConnectionStatusContext }
