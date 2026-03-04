import { createContext, useContext } from 'react'
import type { PipewaveModuleConfig } from './types'

const ModuleConfigContext = createContext<PipewaveModuleConfig>(null as unknown as PipewaveModuleConfig)

export const useModuleConfig = () => {
    const ctx = useContext(ModuleConfigContext);
    if (!ctx) throw new Error("useModuleConfig must be used within ModuleConfigProvider");
    return ctx;
};

export { ModuleConfigContext }
