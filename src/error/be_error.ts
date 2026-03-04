import { AppError } from './app_error'

class BeNetworkError extends AppError {
    public readonly statusCode: number;
    public override readonly msg: string;
    constructor(statusCode: number, msg: string) {
        super('BeNetworkError', msg)
        this.statusCode = statusCode
        this.msg = msg
        console.error('BeNetworkError:', `Status: ${statusCode}, message: ${msg}`)
    }
}

class BeAppError extends AppError {
    public readonly code: string;
    public override readonly msg: string;
    constructor(code: string, msg: string) {
        super('BeAppError', msg)
        this.code = code
        this.msg = msg
        if (BeAppError.conditionalChatNotify(this)) {
            console.error('BeAppError:', `Code: ${code}, message: ${msg}`)
        }
    }

    private static conditionalChatNotify(e: BeAppError): boolean {
        return e.code.startsWith('ErrUnexpected')
    }
}

export { BeNetworkError, BeAppError }
