abstract class AppError extends Error {
    public readonly typeName: string;
    public readonly msg: string;
    constructor(typeName: string, msg: string) {
        super(`${typeName}: ${msg}`)
        this.typeName = typeName
        this.msg = msg
        this.stack = AppError.filterErrorStack(this.stack)
    }

    static filterErrorStack(stack: string | undefined): string | undefined {
        if (!stack) return undefined
        return stack
            .split('\n')
            .filter((line) => !line.includes('node_modules') && line.includes('src/'))
            .join('\n')
    }
}

class Unexpected extends AppError {
    public override readonly msg: string;
    public readonly origin?: unknown;
    constructor(msg: string, origin?: unknown) {
        super('Unexpected', msg)
        this.msg = msg
        this.origin = origin
        Unexpected.chatNotify(msg, this.stack)
    }

    private static chatNotify(msg: string, stacktrace?: string) {
        console.error('Unexpected error occurred:', msg)
        if (stacktrace) {
            console.debug('Stacktrace:', stacktrace)
        }
    }
}

class IndexDbNotFound extends AppError {
    public override readonly msg: string;
    public readonly origin?: unknown;
    constructor(msg: string, origin?: unknown) {
        super('IndexDbNotFound', msg)
        this.msg = msg
        this.origin = origin
    }
}

export { AppError, Unexpected, IndexDbNotFound }
