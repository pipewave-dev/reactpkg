import { type ReactNode, useMemo } from "react";
import {
  WebsocketApi as PipewaveApi,
  type WebsocketEventHandler,
} from "@/external/pipewave";
import type { PipewaveModuleConfig } from "./types";
import { WsEventHandlerUtils } from "@/external/pipewave/utils/eventHandler";
import { ModuleConfigProvider } from "./moduleConfig";
import { PipewaveEventHandlerProvider } from "./pipewaveWsEventHandler";
import { PipewaveContextProvider } from "./pipewaveWsApi";
import { ConnectionStatusProvider } from "./connectionStatus";
import { useDebugLogger } from "@/hooks/useDebugLogger";

interface Props {
  config: PipewaveModuleConfig;
  eventHandler?: WebsocketEventHandler;
  children: ReactNode;
}

const EMPTY_HANDLER: WebsocketEventHandler = {};

function DebugWrapper({
  debug,
  children,
}: {
  debug: boolean;
  children: ReactNode;
}) {
  useDebugLogger(debug);
  return <>{children}</>;
}

/**
 * PipewaveProvider Component
 *
 * Provides Pipewave API and configuration context to its children.
 *
 * @important
 * The `config` and `eventHandler` props should have stable references.
 * Avoid creating these objects inline during render. Instead, use `useMemo`
 * or define them outside the component to prevent unnecessary re-initialization
 * of the Pipewave API and WebSocket connection.
 */
function PipewaveProvider({ config, eventHandler, children }: Props) {
  const handler = eventHandler ?? EMPTY_HANDLER;
  const eventHandlerUtils = useMemo(
    () => new WsEventHandlerUtils(handler),
    [handler],
  );

  const api = useMemo(
    () =>
      new PipewaveApi({
        restConfig: {
          endpoint: config.backendEndpoint,
          insecure: config.insecure,
          getAccessToken: config.getAccessToken,
        },
        websocketConfig: {
          eventHandler: eventHandlerUtils,
          retryCfg: config.retry,
          enableLongPollingFallback: config.enableLongPollingFallback,
          heartbeatInterval: config.heartbeatInterval,
        },
      }),
    [eventHandlerUtils, config],
  );

  return (
    <ModuleConfigProvider value={config}>
      <PipewaveEventHandlerProvider value={eventHandlerUtils}>
        <PipewaveContextProvider value={api}>
          <ConnectionStatusProvider wsApi={api} wsHandler={eventHandlerUtils}>
            <DebugWrapper debug={config.debug}>{children}</DebugWrapper>
          </ConnectionStatusProvider>
        </PipewaveContextProvider>
      </PipewaveEventHandlerProvider>
    </ModuleConfigProvider>
  );
}

export { PipewaveProvider };
