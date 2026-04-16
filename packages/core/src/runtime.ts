import {
  WebsocketApi,
  type WebsocketEventHandler,
  WsEventHandlerUtils,
} from "./external/pipewave";
import { PipewaveModuleConfig, type PipewaveConfigInput, toPipewaveModuleConfig } from "./config";

const EMPTY_EVENT_HANDLER: WebsocketEventHandler = {};

export interface PipewaveRuntime {
  api: WebsocketApi;
  config: PipewaveModuleConfig;
  handler: WsEventHandlerUtils;
}

export function createPipewaveRuntime(
  configInput: PipewaveConfigInput,
  eventHandler: WebsocketEventHandler = EMPTY_EVENT_HANDLER,
): PipewaveRuntime {
  const config = toPipewaveModuleConfig(configInput);
  const handler = new WsEventHandlerUtils(eventHandler);
  const api = new WebsocketApi({
    restConfig: {
      endpoint: config.backendEndpoint,
      insecure: config.insecure,
      getAccessToken: config.getAccessToken,
      additionalHeaders: config.additionalHeaders,
    },
    websocketConfig: {
      eventHandler: handler,
      retryCfg: config.retry,
      enableLongPollingFallback: config.enableLongPollingFallback,
      heartbeatInterval: config.heartbeatInterval,
      instanceID: config.getInstanceID,
    },
  });

  return { api, config, handler };
}
