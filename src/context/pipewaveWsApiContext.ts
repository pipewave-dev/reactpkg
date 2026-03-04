import { createContext, useContext } from 'react'
import type { WebsocketApi } from '@/external/pipewave'

const PipewaveWsApiContext = createContext<WebsocketApi>(null as unknown as WebsocketApi)

export const usePipewaveWsApi = () => {
    const ctx = useContext(PipewaveWsApiContext);
    if (!ctx) throw new Error("usePipewaveWsApi must be used within PipewaveContextProvider");
    return ctx;
};

export { PipewaveWsApiContext }
