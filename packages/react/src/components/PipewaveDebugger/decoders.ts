import { decode } from '@msgpack/msgpack'
import type { DecoderDef, DecoderOutput } from './types'

export const STORAGE_KEY_ACTIVE = 'pipewave_active_decoder'

export const BUILTINS: DecoderDef[] = [
    {
        id: 'utf8',
        name: 'utf-8 text',
        builtin: true,
        fn: (data) => new TextDecoder().decode(data),
    },
    {
        id: 'msgpack',
        name: 'msgpack',
        builtin: true,
        fn: (data) => {
            try {
                return JSON.stringify(decode(data), null, 2) ?? 'null'
            } catch (e) {
                return `[msgpack error] ${e}`
            }
        },
    },
    {
        id: 'hex',
        name: 'hex',
        builtin: true,
        fn: (data) => Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' '),
    },
    {
        id: 'base64',
        name: 'base64',
        builtin: true,
        fn: (data) => btoa(Array.from(data, b => String.fromCharCode(b)).join('')),
    },
]

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Object.prototype.toString.call(value) === '[object Object]'
}

function isDecoderOutput(value: unknown): value is DecoderOutput {
    return (
        value == null ||
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        Array.isArray(value) ||
        isPlainObject(value)
    )
}

export function normalizeDecoders(customDecoders: DecoderDef[] = []): DecoderDef[] {
    const seen = new Set(BUILTINS.map((decoder) => decoder.id))
    const normalized = [...BUILTINS]

    for (const decoder of customDecoders) {
        if (!decoder || typeof decoder.id !== 'string' || decoder.id.trim() === '') {
            continue
        }

        if (typeof decoder.name !== 'string' || decoder.name.trim() === '') {
            continue
        }

        if (typeof decoder.fn !== 'function' || seen.has(decoder.id)) {
            continue
        }

        normalized.push({
            id: decoder.id,
            name: decoder.name,
            fn: (data, context) => {
                const result = decoder.fn(data, context)
                return isDecoderOutput(result)
                    ? result
                    : '[decoder output is not serializable]'
            },
        })
        seen.add(decoder.id)
    }

    return normalized
}

export function loadActiveId(
    allDecoders: DecoderDef[],
    defaultDecoderId?: string,
): string {
    const decoderIds = new Set(allDecoders.map((decoder) => decoder.id))

    if (defaultDecoderId && decoderIds.has(defaultDecoderId)) {
        return defaultDecoderId
    }

    const storedId =
        typeof window !== 'undefined'
            ? window.localStorage.getItem(STORAGE_KEY_ACTIVE)
            : null

    if (storedId && decoderIds.has(storedId)) {
        return storedId
    }

    return BUILTINS[0]?.id ?? 'utf8'
}
