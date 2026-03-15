/**
 * Configuration interface for Pipewave module
 * This allows the module to be reused across different projects
 */
export interface PipewaveModuleConfigProps {
    backendEndpoint: string
    debug?: boolean
    enableLongPollingFallback?: boolean
    insecure?: boolean
    getAccessToken: () => Promise<string>
    retry?: RetryConfig
    heartbeatInterval?: number  // default: 30000ms
}

export class PipewaveModuleConfig {
    backendEndpoint: string
    debug: boolean
    enableLongPollingFallback: boolean
    insecure: boolean
    getAccessToken: () => Promise<string>
    retry: RetryConfig = DEFAULT_RETRY_CONFIG
    heartbeatInterval: number = 30000

    constructor({
        backendEndpoint,
        debug,
        enableLongPollingFallback,
        insecure,
        getAccessToken,
        retry,
        heartbeatInterval }: PipewaveModuleConfigProps) {
        this.backendEndpoint = backendEndpoint
        this.debug = debug ?? false
        this.enableLongPollingFallback = enableLongPollingFallback ?? true
        this.insecure = insecure ?? false
        this.getAccessToken = getAccessToken
        this.retry = retry ?? DEFAULT_RETRY_CONFIG
        this.heartbeatInterval = heartbeatInterval ?? 30000
    }
}

export interface RetryConfig {
    maxRetry: number
    initialRetryDelay: number
    maxRetryDelay: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetry: 3,
    initialRetryDelay: 1000,
    maxRetryDelay: 5000,
}

export interface WebsocketEventHandler {
    onOpen?: () => Promise<void>;
    onClose?: () => Promise<void>;
    onError?: (error: Event) => Promise<void>;
    onData?: (data: WebsocketMessage) => Promise<void>;
    onMaxRetry?: (resetRetryCount: () => void) => Promise<void>;
    onReconnect?: (attempt: number) => Promise<void>;
    onTransportChange?: (transport: 'ws' | 'lp') => Promise<void>;
    onStatusChange?: (status: string) => Promise<void>;
}
export interface WebsocketMessage {
    Id: string
    MsgType: string
    Data: Uint8Array
    Error: string
}