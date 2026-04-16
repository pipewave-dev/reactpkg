import type { PipewaveModuleConfig } from '@pipewave/core'
import { ModuleConfigContext } from './moduleConfigContext'

export const ModuleConfigProvider = ({ value, children }: { value: PipewaveModuleConfig, children: React.ReactNode }) => (
    <ModuleConfigContext.Provider value={value}>
        {children}
    </ModuleConfigContext.Provider>
);
