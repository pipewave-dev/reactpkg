import type { WsEventHandlerUtils } from '@/external/pipewave'
import { PipewaveWsEventHandlerContext } from './pipewaveWsEventHandlerContext'

export const PipewaveEventHandlerProvider = ({ value, children }: { value: WsEventHandlerUtils, children: React.ReactNode }) => (
    <PipewaveWsEventHandlerContext.Provider value={value}>
        {children}
    </PipewaveWsEventHandlerContext.Provider>
);
