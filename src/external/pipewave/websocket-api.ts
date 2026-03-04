import { RestClients } from './clients'
import type { RestConfig, WebsocketConfig } from './configs'
import { WebSocketService, WsStatus } from './services'
import { LongPollingService } from './services/long-polling'

class WebsocketApi {
    private static readonly SESSION_TRANSPORT_KEY = 'PIPEWAVE_TRANSPORT'

    private readonly clients: RestClients
    private readonly websocketSvc: WebSocketService
    private lpSvc: LongPollingService | null = null
    private activeTransport: 'ws' | 'lp' = 'ws'
    private useCount: number = 0
    private readonly wsConfig: WebsocketConfig
    private transportLocked: boolean = false

    constructor({ restConfig, websocketConfig }: { restConfig: RestConfig, websocketConfig: WebsocketConfig }) {
        if (!websocketConfig.instanceID) {
            websocketConfig.instanceID = () => Promise.resolve(randomString(8))
        }
        this.clients = new RestClients(restConfig, websocketConfig.instanceID())
        this.wsConfig = websocketConfig

        const wsConfig = websocketConfig.enableLongPollingFallback
            ? this.wrapConfigForFallback(websocketConfig)
            : websocketConfig

        this.websocketSvc = new WebSocketService(this.clients, wsConfig)

        const forceLongPolling = typeof window !== 'undefined' && window.localStorage?.getItem('FORCE_LONG_POLLING') === 'true'
        if (forceLongPolling) {
            this.switchToLongPolling()
            return
        }

        const savedTransport = this.getSavedTransport()
        if (savedTransport === 'lp') {
            this.switchToLongPolling()
        }
    }

    private getSavedTransport(): 'ws' | 'lp' | null {
        if (typeof window === 'undefined') return null
        const val = window.sessionStorage?.getItem(WebsocketApi.SESSION_TRANSPORT_KEY)
        if (val === 'ws' || val === 'lp') return val
        return null
    }

    private saveTransport(transport: 'ws' | 'lp') {
        if (typeof window === 'undefined') return
        window.sessionStorage?.setItem(WebsocketApi.SESSION_TRANSPORT_KEY, transport)
        this.transportLocked = true
    }

    /**
     * Wraps the event handler so that when WS hits max retry,
     * we silently switch to Long Polling instead of surfacing onMaxRetry.
     * If transport is already locked (proven successful before), skip fallback
     * and surface onMaxRetry to the caller (suspend).
     */
    private wrapConfigForFallback(cfg: WebsocketConfig): WebsocketConfig {
        return {
            ...cfg,
            eventHandler: {
                ...cfg.eventHandler,
                onOpen: async () => {
                    this.saveTransport('ws')
                    if (cfg.eventHandler.onOpen) {
                        await cfg.eventHandler.onOpen()
                    }
                },
                onMaxRetry: async (resetRetryCount: () => void) => {
                    if (this.transportLocked) {
                        // Transport was proven, don't fallback — suspend
                        if (cfg.eventHandler.onMaxRetry) {
                            await cfg.eventHandler.onMaxRetry(resetRetryCount)
                        }
                        return
                    }
                    this.switchToLongPolling()
                },
            },
        }
    }

    private switchToLongPolling() {
        if (this.activeTransport === 'lp') return

        this.activeTransport = 'lp'

        // LP onMaxRetry falls back to the original user-provided handler
        const lpConfig: WebsocketConfig = {
            ...this.wsConfig,
            eventHandler: {
                ...this.wsConfig.eventHandler,
                onOpen: async () => {
                    this.saveTransport('lp')
                    if (this.wsConfig.eventHandler.onOpen) {
                        await this.wsConfig.eventHandler.onOpen()
                    }
                },
                onMaxRetry: this.wsConfig.eventHandler.onMaxRetry,
            },
        }

        this.lpSvc = new LongPollingService(this.clients, lpConfig)
        if (this.useCount > 0) {
            this.websocketSvc.close()
        }
        this.lpSvc.enableKeepAlive()
        this.lpSvc.connect()
    }

    private get activeSvc(): WebSocketService | LongPollingService {
        if (this.activeTransport === 'lp' && this.lpSvc) {
            return this.lpSvc
        }
        return this.websocketSvc
    }

    public pushUseCount(): void {
        this.useCount += 1
    }

    public popUseCount(): void {
        this.useCount -= 1
    }

    public getStatus(): WsStatus {
        return this.activeSvc.getStatus()
    }

    public resetRetryCount() {
        if (this.activeSvc.getStatus() === WsStatus.SUSPEND) {
            this.activeSvc.resetRetryCount()
        }
    }

    public connect() {
        if (this.useCount === 0) {
            if (this.activeTransport === 'lp' && this.lpSvc) {
                this.lpSvc.enableKeepAlive()
                this.lpSvc.connect()
            } else {
                this.websocketSvc.enableKeepAlive()
                this.websocketSvc.WsConnection()
            }
        }
        this.pushUseCount()
    }

    public disconnect() {
        this.popUseCount()
        if (this.useCount === 0) {
            this.activeSvc.close()
        }
    }

    public reconnect() {
        const forceLongPolling = typeof window !== 'undefined' && window.localStorage?.getItem('FORCE_LONG_POLLING') === 'true'

        if (forceLongPolling) {
            this.websocketSvc.close()
            if (this.activeTransport !== 'lp') {
                this.switchToLongPolling()
            } else if (this.lpSvc) {
                this.lpSvc.close()
                this.lpSvc.enableKeepAlive()
                this.lpSvc.connect()
            }
            return
        }

        // Respect the proven transport from session
        const savedTransport = this.getSavedTransport()

        if (savedTransport === 'lp') {
            // Network/browser blocks WS — stay on LP
            this.websocketSvc.close()
            if (this.activeTransport !== 'lp') {
                this.switchToLongPolling()
            } else if (this.lpSvc) {
                this.lpSvc.close()
                this.lpSvc.enableKeepAlive()
                this.lpSvc.connect()
            }
            return
        }

        // savedTransport is 'ws' or null — use WS
        if (this.activeTransport === 'lp') {
            this.lpSvc?.close()
            this.lpSvc = null
            this.activeTransport = 'ws'
        }
        this.websocketSvc.close()
        this.websocketSvc.enableKeepAlive()
        this.websocketSvc.WsConnection()
    }

    public send({ id, msgType, data }: { id: string, msgType: string, data: Uint8Array }): Promise<void> {
        return this.activeSvc.send({ Id: id, MsgType: msgType, Data: data, Error: "" })
    }
}

function randomString(length: number): string {
    const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
}


export { WebsocketApi }
