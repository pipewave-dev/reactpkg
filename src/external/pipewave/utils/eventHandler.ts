import type { WebsocketEventHandler, WebsocketMessage } from '../configs'

type DataHandler = (data: Uint8Array, id: string) => Promise<void>
type ErrorHandler = (error: string, id: string) => Promise<void>

export class WsEventHandlerUtils implements WebsocketEventHandler {
    private _onOpenHandlers: (() => Promise<void>)[] = []
    private _onCloseHandlers: (() => Promise<void>)[] = []
    private _onErrorHandlers: ((error: Event) => Promise<void>)[] = []
    private _onMaxRetryHandlers: ((resetRetryCount: () => void) => Promise<void>)[] = []
    private _dataHandlers: Map<string, DataHandler[]> = new Map()
    private _errorHandlers: Map<string, ErrorHandler[]> = new Map()

    constructor(params: WebsocketEventHandler) {
        if (params.onOpen) this._onOpenHandlers.push(params.onOpen)
        if (params.onClose) this._onCloseHandlers.push(params.onClose)
        if (params.onError) this._onErrorHandlers.push(params.onError)
        if (params.onMaxRetry) this._onMaxRetryHandlers.push(params.onMaxRetry)
    }

    // --- Setters (subscribe pattern) ---

    setOnOpen(handler: () => Promise<void>): () => void {
        this._onOpenHandlers.push(handler)
        return () => {
            const idx = this._onOpenHandlers.indexOf(handler)
            if (idx !== -1) this._onOpenHandlers.splice(idx, 1)
        }
    }

    setOnClose(handler: () => Promise<void>): () => void {
        this._onCloseHandlers.push(handler)
        return () => {
            const idx = this._onCloseHandlers.indexOf(handler)
            if (idx !== -1) this._onCloseHandlers.splice(idx, 1)
        }
    }

    setOnError(handler: (error: Event) => Promise<void>): () => void {
        this._onErrorHandlers.push(handler)
        return () => {
            const idx = this._onErrorHandlers.indexOf(handler)
            if (idx !== -1) this._onErrorHandlers.splice(idx, 1)
        }
    }

    setOnMaxRetry(handler: (resetRetryCount: () => void) => Promise<void>): () => void {
        this._onMaxRetryHandlers.push(handler)
        return () => {
            const idx = this._onMaxRetryHandlers.indexOf(handler)
            if (idx !== -1) this._onMaxRetryHandlers.splice(idx, 1)
        }
    }

    // --- Per-msgType handler registration ---

    onMsgType(msgType: string, handler: DataHandler): () => void {
        if (!this._dataHandlers.has(msgType)) {
            this._dataHandlers.set(msgType, [])
        }
        this._dataHandlers.get(msgType)!.push(handler)
        return () => {
            const handlers = this._dataHandlers.get(msgType)
            if (handlers) {
                const idx = handlers.indexOf(handler)
                if (idx !== -1) handlers.splice(idx, 1)
            }
        }
    }

    onErrorType(msgType: string, handler: ErrorHandler): () => void {
        if (!this._errorHandlers.has(msgType)) {
            this._errorHandlers.set(msgType, [])
        }
        this._errorHandlers.get(msgType)!.push(handler)
        return () => {
            const handlers = this._errorHandlers.get(msgType)
            if (handlers) {
                const idx = handlers.indexOf(handler)
                if (idx !== -1) handlers.splice(idx, 1)
            }
        }
    }

    // --- WebsocketEventHandler interface implementation ---

    onOpen = async (): Promise<void> => {
        await Promise.all(this._onOpenHandlers.map(h => h()))
    }

    onClose = async (): Promise<void> => {
        await Promise.all(this._onCloseHandlers.map(h => h()))
    }

    onError = async (error: Event): Promise<void> => {
        await Promise.all(this._onErrorHandlers.map(h => h(error)))
    }

    onData = async (data: WebsocketMessage): Promise<void> => {
        if (data.Error && data.Error.length > 0) {
            const handlers = this._errorHandlers.get(data.MsgType)
            if (handlers) {
                await Promise.all(handlers.map(h => h(data.Error, data.Id)))
            }
        } else {
            const handlers = this._dataHandlers.get(data.MsgType)
            if (handlers) {
                await Promise.all(handlers.map(h => h(data.Data, data.Id)))
            }
        }
    }

    onMaxRetry = async (resetRetryCount: () => void): Promise<void> => {
        await Promise.all(this._onMaxRetryHandlers.map(h => h(resetRetryCount)))
    }
}
