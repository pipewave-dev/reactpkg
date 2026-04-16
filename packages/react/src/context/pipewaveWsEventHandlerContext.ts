import { createContext, useContext } from 'react'
import type { WsEventHandlerUtils } from '@pipewave/core'

const PipewaveWsEventHandlerContext = createContext<WsEventHandlerUtils>(null as unknown as WsEventHandlerUtils)

export const usePipewaveWsEventHandler = () => {
    const ctx = useContext(PipewaveWsEventHandlerContext);
    if (!ctx) throw new Error("usePipewaveWsEventHandler must be used within PipewaveEventHandlerProvider");
    return ctx;
};

export { PipewaveWsEventHandlerContext }
