/**
 * Configuration interface for Pipewave module
 * This allows the module to be reused across different projects
 */
export class PipewaveModuleConfig {
    backendEndpoint: string
    insecure: boolean

    debugMode: boolean
    getAccessToken: () => Promise<string>

    constructor({ backendEndpoint, insecure, debugMode, getAccessToken }: PipewaveModuleConfig) {
        this.backendEndpoint = backendEndpoint
        this.insecure = insecure
        this.debugMode = debugMode
        this.getAccessToken = getAccessToken
    }
}
