import { decode, encode } from '@msgpack/msgpack'
import { toAppError, Unexpected } from '@/error'
import type { RestClients } from '../../clients'
import type { WebsocketConfig, WebsocketMessage } from '../../configs'
import { WsStatus } from '../websocket'

const HEARTBEAT_MSG_TYPE = "<3"

export class LongPollingService {
    private isConnected: boolean = false
    private keepAlive: boolean = false
    private isSuspend: boolean = false
    private isReconnecting: boolean = false
    private retryDelay: number
    private retryCount: number = 0
    private abortController: AbortController | null = null

    constructor(
        private client: RestClients,
        private params: WebsocketConfig,
    ) {
        this.retryDelay = params.retryCfg.initialRetryDelay
    }

    public getStatus(): WsStatus {
        if (this.isSuspend) return WsStatus.SUSPEND
        if (this.isReconnecting) return WsStatus.RECONNECTING
        if (this.isConnected) return WsStatus.READY
        return WsStatus.NOT_READY
    }

    public enableKeepAlive() {
        this.keepAlive = true
    }

    public connect() {
        if (this.isConnected || this.isReconnecting) return
        this.startPollLoop()
    }

    public close() {
        this.keepAlive = false
        this.stopLoop()
    }

    public resetRetryCount() {
        this.isSuspend = false
        this.retryCount = 0
        this.retryDelay = this.params.retryCfg.initialRetryDelay
        this.startPollLoop()
    }

    public async send(data: WebsocketMessage): Promise<void> {
        if (!this.isConnected) {
            throw new Unexpected('LongPolling is not connected')
        }
        const headers = await this.client.getAuthHeaders()
        const body = packMessage(data)
        const res = await fetch(`${this.client.httpBaseUrl}/lp-send`, {
            method: 'POST',
            headers: {
                ...headers,
                'Content-Type': 'application/octet-stream',
            },
            body: new Blob([body]),
        })
        if (res.status === 410) {
            // Session closed — loop will handle reconnect on next poll
            throw new Unexpected('LP session gone, reconnecting')
        }
        if (!res.ok) {
            throw toAppError(new Error(`lp-send failed: ${res.status}`))
        }
    }

    private stopLoop() {
        this.isConnected = false
        this.isReconnecting = false
        this.abortController?.abort()
        this.abortController = null
    }

    private async startPollLoop() {
        this.isConnected = true
        this.isReconnecting = false

        if (this.params.eventHandler.onOpen) {
            await this.params.eventHandler.onOpen()
        }

        while (this.keepAlive && this.isConnected) {
            this.abortController = new AbortController()
            const done = await this.poll(this.abortController.signal)
            if (done) break
        }
    }

    /**
     * Executes a single GET /lp request.
     * Returns true if the loop should stop, false to continue.
     */
    private async poll(signal: AbortSignal): Promise<boolean> {
        try {
            const headers = await this.client.getAuthHeaders()
            const res = await fetch(`${this.client.httpBaseUrl}/lp`, {
                method: 'POST',
                headers,
                signal,
            })

            if (res.status === 200) {
                const buf = await res.arrayBuffer()
                const messages = decode(buf) as Uint8Array[]
                this.retryCount = 0
                this.retryDelay = this.params.retryCfg.initialRetryDelay
                this.isReconnecting = false
                await this.processMessages(messages)
                return false // continue polling
            }

            if (res.status === 204) {
                // Timeout, no messages — poll again immediately
                return false
            }

            if (res.status === 410) {
                // Server closed LP session — need to re-establish
                await this.handleSessionGone()
                return !this.keepAlive // stop if not keepAlive
            }

            if (res.status === 409) {
                // WebSocket is active on this session
                this.isConnected = false
                if (this.params.eventHandler.onError) {
                    await this.params.eventHandler.onError(
                        new Event('LP_CONFLICT_409')
                    )
                }
                return true // stop loop
            }

            // Other HTTP errors — treat as transient, retry with backoff
            throw new Error(`LP poll error: ${res.status}`)

        } catch {
            if (signal.aborted) return true // close() was called

            return await this.handlePollError()
        }
    }

    private async processMessages(messages: Uint8Array[]) {
        if (!this.params.eventHandler.onData) return
        for (const bytes of messages) {
            try {
                const unpacked = unpackMessage(bytes)
                if (unpacked.t === HEARTBEAT_MSG_TYPE) continue
                await this.params.eventHandler.onData({
                    Id: unpacked.i,
                    MsgType: unpacked.t,
                    Data: unpacked.b,
                    Error: unpacked.e,
                })
            } catch {
                // Skip malformed message
            }
        }
    }

    private async handleSessionGone() {
        // 410: server closed session (idle timeout). Reset and start over.
        this.retryCount = 0
        this.retryDelay = this.params.retryCfg.initialRetryDelay
        if (this.params.eventHandler.onClose) {
            await this.params.eventHandler.onClose()
        }
        if (this.keepAlive) {
            // Re-establish — next iteration of while loop calls poll() again,
            // which will be treated as first-poll by the server.
            if (this.params.eventHandler.onOpen) {
                await this.params.eventHandler.onOpen()
            }
        }
    }

    private async handlePollError(): Promise<boolean> {
        this.isReconnecting = true
        this.retryCount++

        if (this.retryCount >= this.params.retryCfg.maxRetry) {
            this.isSuspend = true
            this.isConnected = false
            this.isReconnecting = false
            if (this.params.eventHandler.onMaxRetry) {
                await this.params.eventHandler.onMaxRetry(() => this.resetRetryCount())
            }
            return true // stop loop
        }

        await sleep(this.retryDelay)
        this.retryDelay = Math.min(
            this.retryDelay * 2,
            this.params.retryCfg.maxRetryDelay,
        )
        return false // retry
    }
}

function packMessage(data: WebsocketMessage): Uint8Array<ArrayBuffer> {
    const encoded = encode({
        i: data.Id,
        t: data.MsgType,
        b: data.Data,
    })
    // encode() always returns a regular ArrayBuffer at runtime — cast is safe
    return encoded
}

function unpackMessage(data: Uint8Array) {
    return decode(data) as {
        i: string
        r: string
        t: string
        e: string
        b: Uint8Array
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}
