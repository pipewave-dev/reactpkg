import type { RestClients } from '../../clients'
import { encode, decode } from '@msgpack/msgpack';
import { toAppError, Unexpected } from '@/error'
import type { WebsocketConfig, WebsocketMessage } from '../../configs';

const HEARTBEAT_MSG_TYPE = new Uint8Array([202]);


export enum WsStatus {
    NOT_READY = "NOT_READY",
    READY = "READY",
    RECONNECTING = "RECONNECTING",
    SUSPEND = "SUSPEND", // Reach max retry, wait user reset
    ERROR = "ERROR", // Error status when broser is not support websocket
}

export class WebSocketService {
    private WebSocketClient: WebSocket | null = null
    private connectingPromise: Promise<WebSocket | null> | null = null
    private keepAlive: boolean = false
    private retryDelay: number
    private retryCount: number = 0
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null
    private isSuspend: boolean = false

    constructor(
        private client: RestClients,
        private params: WebsocketConfig,
    ) {
        this.retryDelay = params.retryCfg.initialRetryDelay
    }

    async WsConnection(): Promise<WebSocket | null> {
        if (this.WebSocketClient) {
            return this.WebSocketClient
        }
        if (this.connectingPromise) {
            return this.connectingPromise
        }
        this.connectingPromise = this.connect().finally(() => {
            this.connectingPromise = null
        })
        return this.connectingPromise
    }

    private async connect() {
        try {
            const headers = await this.client.getAuthHeaders()
            const response = await fetch(`${this.client.httpBaseUrl}/issue-tmp-token`, {
                method: "POST",
                headers: headers,
                redirect: "manual"
            })
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`)
            }
            const tmpToken = await response.text()
            this.WebSocketClient = new WebSocket(`${this.client.wsBaseUrl}/gw?tk=${tmpToken}`)
            this.WebSocketClient.binaryType = "arraybuffer";

            this.WebSocketClient.onopen = async () => {
                this.retryCount = 0
                this.retryDelay = this.params.retryCfg.initialRetryDelay
                this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), this.params.heartbeatInterval ?? 30000)
                if (this.params.eventHandler.onOpen) {
                    await this.params.eventHandler.onOpen()
                }
            };

            this.WebSocketClient.onmessage = async (event: MessageEvent) => {
                if (!this.params.eventHandler.onData) {
                    return
                }
                const data = Unpack(new Uint8Array(event.data))
                if (data.t === HEARTBEAT_MSG_TYPE) {
                    return
                }
                this.params.eventHandler.onData({
                    Id: data.i,
                    ReturnToId: data.r,
                    MsgType: data.t as string,
                    Data: data.b,
                    Error: data.e
                })
            };

            this.WebSocketClient.onerror = async (error: Event) => {
                if (this.params.eventHandler.onError) {
                    await this.params.eventHandler.onError(error)
                }
            };

            this.WebSocketClient.onclose = async () => {
                if (this.heartbeatInterval !== null) {
                    clearInterval(this.heartbeatInterval)
                    this.heartbeatInterval = null
                }
                if (this.params.eventHandler.onClose) {
                    await this.params.eventHandler.onClose()
                }
                this.WebSocketClient = null
                if (this.keepAlive) {
                    this.handleRetryOrSuspend()
                }
            };

            return this.WebSocketClient
        } catch {
            // When network error, we will set to MAX RETRY (need user action to reset)
            this.retryCount = this.params.retryCfg.maxRetry
            if (this.keepAlive) {
                this.handleRetryOrSuspend()
            }
            return null
        }
    }

    private handleRetryOrSuspend() {
        this.retryCount++
        if (this.retryCount >= this.params.retryCfg.maxRetry) {
            this.isSuspend = true
            if (this.params.eventHandler.onMaxRetry) {
                this.params.eventHandler.onMaxRetry(() => this.resetRetryCount())
            }
        } else {
            if (this.params.eventHandler.onReconnect) {
                this.params.eventHandler.onReconnect(this.retryCount)
            }
            const delay = this.retryDelay
            this.retryDelay = Math.min(this.retryDelay * 2, this.params.retryCfg.maxRetryDelay)
            setTimeout(() => this.connect(), delay)
        }
    }

    resetRetryCount() {
        this.isSuspend = false
        this.retryCount = 0
        this.retryDelay = this.params.retryCfg.initialRetryDelay
        this.connect()
    }

    reconnect() {
        if (this.heartbeatInterval !== null) {
            clearInterval(this.heartbeatInterval)
            this.heartbeatInterval = null
        }
        this.WebSocketClient?.close()
        this.WebSocketClient = null
        this.isSuspend = false
        this.retryCount = 0
        this.retryDelay = this.params.retryCfg.initialRetryDelay
        this.keepAlive = true
        this.connect()
    }

    public getStatus(): WsStatus {
        if (this.isSuspend) {
            return WsStatus.SUSPEND
        }
        if (!this.WebSocketClient) {
            return WsStatus.NOT_READY
        }
        switch (this.WebSocketClient.readyState) {
            case WebSocket.OPEN:
                return WsStatus.READY
            case WebSocket.CONNECTING:
                return WsStatus.RECONNECTING
            case WebSocket.CLOSING:
                return WsStatus.NOT_READY
            case WebSocket.CLOSED:
                return WsStatus.NOT_READY
            default:
                return WsStatus.ERROR
        }
    }

    async send(data: Pick<WebsocketMessage, 'Id' | 'MsgType' | 'Data'>) {
        if (this.getStatus() !== WsStatus.READY) {
            throw new Unexpected('WebSocket is not open')
        }
        try {
            this.WebSocketClient?.send(Pack(data))
        } catch (error) {
            throw toAppError(error)
        }
    }

    close() {
        this.keepAlive = false
        if (this.heartbeatInterval !== null) {
            clearInterval(this.heartbeatInterval)
            this.heartbeatInterval = null
        }
        this.WebSocketClient?.close()
    }

    enableKeepAlive() {
        this.keepAlive = true
    }

    // Should interval call every 30s
    private async sendHeartbeat() {
        try {
            this.WebSocketClient?.send(encode({
                t: HEARTBEAT_MSG_TYPE, // Heartbeat message type
            }))
        } catch {/**/ }
    }
}

function Pack(data: Pick<WebsocketMessage, 'Id' | 'MsgType' | 'Data'>): Uint8Array<ArrayBuffer> {
    return encode({
        i: data.Id,
        t: data.MsgType,
        b: data.Data,
    })
}

function Unpack(data: Uint8Array) {
    return decode(data) as {
        i: string,
        r: string,
        t: string | Uint8Array,
        e: string,
        b: Uint8Array,
    }
}


