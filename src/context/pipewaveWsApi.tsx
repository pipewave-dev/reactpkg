import type { WebsocketApi } from '@/external/pipewave'
import { PipewaveWsApiContext } from './pipewaveWsApiContext'

export const PipewaveContextProvider = ({ value, children }: { value: WebsocketApi, children: React.ReactNode }) => (
    <PipewaveWsApiContext.Provider value={value}>
        {children}
    </PipewaveWsApiContext.Provider>
);
