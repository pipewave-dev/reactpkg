export interface RestConfig {
    endpoint: string
    insecure: boolean
    debugMode: boolean
    getAccessToken: () => Promise<string>
}

export interface WebsocketConfig {
    eventHandler: WebsocketEventHandler
    retryCfg: WebSocketServiceParams
    enableLongPollingFallback?: boolean
    instanceID?: () => Promise<string>
}
export interface WebsocketMessage {
    Id: string
    MsgType: string
    Data: Uint8Array
    Error: string
}
export interface WebsocketEventHandler {
    onOpen?: () => Promise<void>;
    onClose?: () => Promise<void>;
    onError?: (error: Event) => Promise<void>;
    onData?: (data: WebsocketMessage) => Promise<void>;
    onMaxRetry?: (resetRetryCount: () => void) => Promise<void>;
}

export interface WebSocketServiceParams {
    maxRetry: number
    initialRetryDelay: number
    maxRetryDelay: number
}
