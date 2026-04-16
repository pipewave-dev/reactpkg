export interface RestConfig {
    endpoint: string
    insecure: boolean
    getAccessToken: () => Promise<string>
    additionalHeaders?: () => Promise<Record<string, string>>
}

export interface WebsocketConfig {
    eventHandler: WebsocketEventHandler
    retryCfg: WebSocketServiceParams
    enableLongPollingFallback?: boolean
    heartbeatInterval?: number
    instanceID?: () => Promise<string>
}
export interface WebsocketMessage {
    Id: string
    ReturnToId: string
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
    onReconnect?: (attempt: number) => Promise<void>;
    onTransportChange?: (transport: 'ws' | 'lp') => Promise<void>;
    onStatusChange?: (status: string) => Promise<void>;
    onSend?: (msg: { id: string; msgType: string; data: Uint8Array }) => Promise<void>;
}

export interface WebSocketServiceParams {
    maxRetry: number
    initialRetryDelay: number
    maxRetryDelay: number
}
