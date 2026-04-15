export type PanelSide = 'left' | 'right'
export type DebuggerLayout = 'overlay' | 'docked'


export interface ButtonPosition {
  top?: number | string
  bottom?: number | string
  left?: number | string
  right?: number | string
}

export interface OverlayWindowRect {
  top: number
  left: number
  width: number
  height: number
}

export type LogEntryType =
  | 'open' | 'close' | 'error' | 'recv' | 'sent'
  | 'reconnect' | 'maxRetry' | 'transport' | 'status'

export type LogEntry = {
  id: string
  timestamp: number
  type: LogEntryType
  message: string
  raw?: Uint8Array  // populated for 'recv' and 'sent' events
  // Structured fields populated for 'recv' and 'sent' type entries
  msgId?: string
  msgType?: string | number
  returnToId?: string
  size?: number
  hasError?: boolean
}

export type DecoderOutput =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[]

export interface DecoderContext {
  msgId?: string
  msgType?: string | number
  returnToId?: string
  size?: number
  hasError?: boolean
}

export type DecoderDef = {
  id: string
  name: string
  builtin?: boolean
  fn: (data: Uint8Array, context?: DecoderContext) => DecoderOutput
}
