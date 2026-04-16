import { AppError, Unexpected } from './app_error'
import { BeAppError, BeNetworkError } from './be_error'

function toAppError(e: unknown): AppError {
    if (e instanceof AppError) return e
    if (e instanceof Error) return new Unexpected(e.message, e)
    return new Unexpected(String(e), e)
}

export { toAppError, BeAppError, BeNetworkError }
