import type { WsEventHandlerUtils } from '@pipewave/core'
import { PipewaveWsEventHandlerContext } from './pipewaveWsEventHandlerContext'

export const PipewaveEventHandlerProvider = ({ value, children }: { value: WsEventHandlerUtils, children: React.ReactNode }) => (
    <PipewaveWsEventHandlerContext.Provider value={value}>
        {children}
    </PipewaveWsEventHandlerContext.Provider>
);
