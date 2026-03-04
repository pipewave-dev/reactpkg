/**
 * Configuration interface for Pipewave module
 * This allows the module to be reused across different projects
 */
export interface PipewaveModuleConfigProps {
    backendEndpoint: string
    insecure?: boolean
    getAccessToken: () => Promise<string>
    retry?: RetryConfig
}

export class PipewaveModuleConfig {
    backendEndpoint: string
    insecure: boolean
    getAccessToken: () => Promise<string>
    retry: RetryConfig = {
        maxRetry: 3,
        initialRetryDelay: 1000,
        maxRetryDelay: 5000,
    }

    constructor({
        backendEndpoint,
        insecure,
        getAccessToken,
        retry }: PipewaveModuleConfigProps) {
        this.backendEndpoint = backendEndpoint
        this.insecure = insecure ?? false
        this.getAccessToken = getAccessToken
        this.retry = retry ?? {
            maxRetry: 3,
            initialRetryDelay: 1000,
            maxRetryDelay: 5000,
        }
    }
}

export interface RetryConfig {
    maxRetry: number
    initialRetryDelay: number
    maxRetryDelay: number
}

export interface WebsocketEventHandler {
    onOpen?: () => Promise<void>;
    onClose?: () => Promise<void>;
    onError?: (error: Event) => Promise<void>;
    onData?: (data: WebsocketMessage) => Promise<void>;
    onMaxRetry?: (resetRetryCount: () => void) => Promise<void>;
}
export interface WebsocketMessage {
    Id: string
    MsgType: string
    Data: Uint8Array
    Error: string
}