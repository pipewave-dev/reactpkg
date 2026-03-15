import type { WebsocketEventHandler, WebsocketMessage } from '../configs'

type DataHandler = (data: Uint8Array, id: string, returnToId: string) => Promise<void>
type ErrorHandler = (error: string, id: string) => Promise<void>

export class WsEventHandlerUtils implements WebsocketEventHandler {
    private _onOpenHandlers: Set<() => Promise<void>> = new Set()
    private _onCloseHandlers: Set<() => Promise<void>> = new Set()
    private _onErrorHandlers: Set<(error: Event) => Promise<void>> = new Set()
    private _onMaxRetryHandlers: Set<(resetRetryCount: () => void) => Promise<void>> = new Set()
    private _onReconnectHandlers: Set<(attempt: number) => Promise<void>> = new Set()
    private _onTransportChangeHandlers: Set<(transport: 'ws' | 'lp') => Promise<void>> = new Set()
    private _onStatusChangeHandlers: Set<(status: string) => Promise<void>> = new Set()
    private _dataHandlers: Map<string, Set<DataHandler>> = new Map()
    private _errorHandlers: Map<string, Set<ErrorHandler>> = new Map()

    constructor(params: WebsocketEventHandler) {
        if (params.onOpen) this._onOpenHandlers.add(params.onOpen)
        if (params.onClose) this._onCloseHandlers.add(params.onClose)
        if (params.onError) this._onErrorHandlers.add(params.onError)
        if (params.onMaxRetry) this._onMaxRetryHandlers.add(params.onMaxRetry)
        if (params.onReconnect) this._onReconnectHandlers.add(params.onReconnect)
        if (params.onTransportChange) this._onTransportChangeHandlers.add(params.onTransportChange)
        if (params.onStatusChange) this._onStatusChangeHandlers.add(params.onStatusChange)
    }

    // --- Setters (subscribe pattern) ---

    setOnOpen(handler: () => Promise<void>): () => void {
        this._onOpenHandlers.add(handler)
        return () => { this._onOpenHandlers.delete(handler) }
    }

    setOnClose(handler: () => Promise<void>): () => void {
        this._onCloseHandlers.add(handler)
        return () => { this._onCloseHandlers.delete(handler) }
    }

    setOnError(handler: (error: Event) => Promise<void>): () => void {
        this._onErrorHandlers.add(handler)
        return () => { this._onErrorHandlers.delete(handler) }
    }

    setOnMaxRetry(handler: (resetRetryCount: () => void) => Promise<void>): () => void {
        this._onMaxRetryHandlers.add(handler)
        return () => { this._onMaxRetryHandlers.delete(handler) }
    }

    setOnReconnect(handler: (attempt: number) => Promise<void>): () => void {
        this._onReconnectHandlers.add(handler)
        return () => { this._onReconnectHandlers.delete(handler) }
    }

    setOnTransportChange(handler: (transport: 'ws' | 'lp') => Promise<void>): () => void {
        this._onTransportChangeHandlers.add(handler)
        return () => { this._onTransportChangeHandlers.delete(handler) }
    }

    setOnStatusChange(handler: (status: string) => Promise<void>): () => void {
        this._onStatusChangeHandlers.add(handler)
        return () => { this._onStatusChangeHandlers.delete(handler) }
    }

    // --- Per-msgType handler registration ---

    private subscribeByMsgType<T>(
        store: Map<string, Set<T>>,
        msgType: string,
        handler: T
    ): () => void {
        let handlers = store.get(msgType)
        if (!handlers) {
            handlers = new Set<T>()
            store.set(msgType, handlers)
        }

        handlers.add(handler)

        return () => {
            const currentHandlers = store.get(msgType)
            if (!currentHandlers) return

            currentHandlers.delete(handler)
            if (currentHandlers.size === 0) {
                store.delete(msgType)
            }
        }
    }

    onMsgType(msgType: string, handler: DataHandler): () => void {
        return this.subscribeByMsgType(this._dataHandlers, msgType, handler)
    }

    onErrorType(msgType: string, handler: ErrorHandler): () => void {
        return this.subscribeByMsgType(this._errorHandlers, msgType, handler)
    }

    // --- WebsocketEventHandler interface implementation ---

    onOpen = async (): Promise<void> => {
        await Promise.all(Array.from(this._onOpenHandlers, h => h()))
    }

    onClose = async (): Promise<void> => {
        await Promise.all(Array.from(this._onCloseHandlers, h => h()))
    }

    onError = async (error: Event): Promise<void> => {
        await Promise.all(Array.from(this._onErrorHandlers, h => h(error)))
    }

    onData = async (data: WebsocketMessage): Promise<void> => {
        if (data.Error && data.Error.length > 0) {
            const handlers = this._errorHandlers.get(data.MsgType)
            if (handlers) {
                await Promise.all(Array.from(handlers).map(h => h(data.Error, data.Id)))
            }
        } else {
            const handlers = this._dataHandlers.get(data.MsgType)
            if (handlers) {
                await Promise.all(Array.from(handlers).map(h => h(data.Data, data.Id, data.ReturnToId)))
            }
        }
    }

    onMaxRetry = async (resetRetryCount: () => void): Promise<void> => {
        await Promise.all(Array.from(this._onMaxRetryHandlers, h => h(resetRetryCount)))
    }

    onReconnect = async (attempt: number): Promise<void> => {
        await Promise.all(Array.from(this._onReconnectHandlers, h => h(attempt)))
    }

    onTransportChange = async (transport: 'ws' | 'lp'): Promise<void> => {
        await Promise.all(Array.from(this._onTransportChangeHandlers, h => h(transport)))
    }

    onStatusChange = async (status: string): Promise<void> => {
        await Promise.all(Array.from(this._onStatusChangeHandlers, h => h(status)))
    }
}
