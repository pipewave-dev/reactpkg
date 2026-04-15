export interface MessageCodec<T> {
    encode: (data: T) => Uint8Array
    decode: (bytes: Uint8Array) => T
}

export type PipewaveSchema<T extends Record<string, MessageCodec<unknown>>> = T

/**
 * Creates a type-safe message schema registry.
 *
 * @example
 * const schema = createPipewaveSchema({
 *   CHAT_MSG: { encode: encodeChatMsg, decode: decodeChatMsg },
 *   USER_STATUS: { encode: encodeUserStatus, decode: decodeUserStatus },
 * })
 */
export function createPipewaveSchema<T extends Record<string, MessageCodec<unknown>>>(
    schema: T,
): T {
    return schema
}
