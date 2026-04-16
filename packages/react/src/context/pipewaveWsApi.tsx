import type { WebsocketApi } from '@pipewave/core'
import { PipewaveWsApiContext } from './pipewaveWsApiContext'

export const PipewaveContextProvider = ({ value, children }: { value: WebsocketApi, children: React.ReactNode }) => (
    <PipewaveWsApiContext.Provider value={value}>
        {children}
    </PipewaveWsApiContext.Provider>
);
