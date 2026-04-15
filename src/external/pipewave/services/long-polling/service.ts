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
    private abortController: AbortController | null = null

    constructor(
        private client: RestClients,
        private params: WebsocketConfig,
    ) {
    }

    public getStatus(): WsStatus {
        if (this.isSuspend) return WsStatus.SUSPEND
        if (this.isConnected) return WsStatus.READY
        return WsStatus.NOT_READY
    }

    public enableKeepAlive() {
        this.keepAlive = true
    }

    public connect() {
        if (this.isConnected) return
        this.startPollLoop()
    }

    public close() {
        this.keepAlive = false
        this.stopLoop()
    }

    /**
     * @internal DEBUG ONLY — force-closes the LP connection without touching
     * useCount. Simulates an unintentional network disconnect (e.g. WiFi → 4G).
     * WARNING: Do NOT call this in production code.
     */
    public debugForceClose(): void {
        this.keepAlive = false
        this.stopLoop()
    }

    /**
     * @internal DEBUG ONLY — re-establishes the LP connection after a
     * debugForceClose(). Bypasses useCount.
     * WARNING: Do NOT call this in production code.
     */
    public debugForceConnect(): void {
        this.keepAlive = true
        this.connect()
    }

    public resetRetryCount() {
        this.isSuspend = false
        this.startPollLoop()
    }

    public async send(data: Pick<WebsocketMessage, 'Id' | 'MsgType' | 'Data'>): Promise<void> {
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
        this.abortController?.abort()
        this.abortController = null
    }

    private async startPollLoop() {
        this.isConnected = true

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
        for (const bytes of messages) {
            try {
                const unpacked = unpackMessage(bytes)
                if (unpacked.t === HEARTBEAT_MSG_TYPE) continue
                if (unpacked.a) {
                    this.sendAck(unpacked.a)
                }
                if (!this.params.eventHandler.onData) continue
                await this.params.eventHandler.onData({
                    Id: unpacked.i,
                    ReturnToId: unpacked.r,
                    MsgType: unpacked.t,
                    Data: unpacked.b,
                    Error: unpacked.e,
                })
            } catch {
                // Skip malformed message
            }
        }
    }

    private sendAck(ackId: string): void {
        this.send({ Id: '', MsgType: '__ack__', Data: new TextEncoder().encode(ackId) }).catch(() => { })
    }

    private async handleSessionGone() {
        // 410: server closed session (idle timeout). Reset and start over.
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
        this.isSuspend = true
        this.isConnected = false
        if (this.params.eventHandler.onMaxRetry) {
            await this.params.eventHandler.onMaxRetry(() => this.resetRetryCount())
        }
        return true // stop loop
    }
}

function packMessage(data: Pick<WebsocketMessage, 'Id' | 'MsgType' | 'Data'>): Uint8Array<ArrayBuffer> {
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
        a?: string
    }
}
