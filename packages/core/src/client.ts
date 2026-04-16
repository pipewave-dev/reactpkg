import type { WebsocketMessage } from "./external/pipewave/configs";
import type { WsStatus } from "./external/pipewave/services/websocket/service";
import { createPipewaveRuntime } from "./runtime";
import type { PipewaveConfigInput } from "./config";

type DataHandler = (data: Uint8Array, id: string) => Promise<void>;
type ErrorHandler = (error: string, id: string) => Promise<void>;

export interface PipewaveSendArgs {
  id: string;
  msgType: string;
  data: Uint8Array;
}

export interface PipewaveAckResult {
  ackOk: boolean;
  data: Uint8Array | null;
}

export interface PipewaveClient {
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  resetRetryCount: () => void;
  getStatus: () => WsStatus;
  getTransport: () => "ws" | "lp";
  send: (args: PipewaveSendArgs) => Promise<void>;
  sendWaitAck: (args: PipewaveSendArgs, timeout?: number) => Promise<PipewaveAckResult>;
  onMessage: (msgType: string, cb: DataHandler) => () => void;
  onError: (msgType: string, cb: ErrorHandler) => () => void;
  onData: (cb: (data: WebsocketMessage) => Promise<void>) => () => void;
  onOpen: (cb: () => Promise<void>) => () => void;
  onClose: (cb: () => Promise<void>) => () => void;
  onConnectionError: (cb: (error: Event) => Promise<void>) => () => void;
  onStatusChange: (cb: (status: string) => Promise<void>) => () => void;
  onReconnect: (cb: (attempt: number) => Promise<void>) => () => void;
  onMaxRetry: (cb: (resetRetryCount: () => void) => Promise<void>) => () => void;
  onTransportChange: (cb: (transport: "ws" | "lp") => Promise<void>) => () => void;
  onSend: (cb: (msg: PipewaveSendArgs) => Promise<void>) => () => void;
  debugForceDisconnect: () => void;
  debugForceConnect: () => void;
}

export function createPipewave(config: PipewaveConfigInput): PipewaveClient {
  const { api, handler } = createPipewaveRuntime(config);

  return {
    connect: () => api.connect(),
    disconnect: () => api.disconnect(),
    reconnect: () => api.reconnect(),
    resetRetryCount: () => api.resetRetryCount(),
    getStatus: () => api.getStatus(),
    getTransport: () => api.getActiveTransport(),
    send: (args: PipewaveSendArgs) => api.send(args),
    sendWaitAck: (
      args: PipewaveSendArgs,
      timeout = 5000,
    ): Promise<PipewaveAckResult> => {
      let resolveResult!: (ackOk: boolean, data?: Uint8Array | null) => void;

      const result = new Promise<PipewaveAckResult>((resolve) => {
        resolveResult = (ackOk, data: Uint8Array | null = null) =>
          resolve({ ackOk, data });
      });

      const unsub = handler.onMsgType(
        args.msgType,
        async (incomingData, _id, returnToId) => {
          if (returnToId === args.id) {
            clearTimeout(timer);
            unsub();
            resolveResult(true, incomingData);
          }
        },
      );

      const timer = setTimeout(() => {
        unsub();
        resolveResult(false);
      }, timeout);

      api.send(args).catch(() => {
        clearTimeout(timer);
        unsub();
        resolveResult(false);
      });

      return result;
    },
    onMessage: (msgType: string, cb: DataHandler) => handler.onMsgType(msgType, cb),
    onError: (msgType: string, cb: ErrorHandler) => handler.onErrorType(msgType, cb),
    onData: (cb: (data: WebsocketMessage) => Promise<void>) => handler.setOnData(cb),
    onOpen: (cb: () => Promise<void>) => handler.setOnOpen(cb),
    onClose: (cb: () => Promise<void>) => handler.setOnClose(cb),
    onConnectionError: (cb: (error: Event) => Promise<void>) => handler.setOnError(cb),
    onStatusChange: (cb: (status: string) => Promise<void>) => handler.setOnStatusChange(cb),
    onReconnect: (cb: (attempt: number) => Promise<void>) => handler.setOnReconnect(cb),
    onMaxRetry: (cb: (resetRetryCount: () => void) => Promise<void>) =>
      handler.setOnMaxRetry(cb),
    onTransportChange: (cb: (transport: "ws" | "lp") => Promise<void>) =>
      handler.setOnTransportChange(cb),
    onSend: (cb: (msg: PipewaveSendArgs) => Promise<void>) => handler.setOnSend(cb),
    debugForceDisconnect: () => api.debugForceDisconnect(),
    debugForceConnect: () => api.debugForceConnect(),
  };
}

export const createPipewaveClient = createPipewave;
