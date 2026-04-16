import { type ReactNode, useMemo } from "react";
import {
  createPipewaveRuntime,
  type PipewaveConfigInput,
  type PipewaveModuleConfig,
  type WebsocketEventHandler,
} from "@pipewave/core";
import { ModuleConfigProvider } from "./moduleConfig";
import { PipewaveEventHandlerProvider } from "./pipewaveWsEventHandler";
import { PipewaveContextProvider } from "./pipewaveWsApi";
import { ConnectionStatusProvider } from "./connectionStatus";

interface Props {
  config: PipewaveConfigInput;
  eventHandler?: WebsocketEventHandler;
  children: ReactNode;
}

const EMPTY_HANDLER: WebsocketEventHandler = {};

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
  const resolvedEventHandler = eventHandler ?? EMPTY_HANDLER;
  const runtime = useMemo(
    () => createPipewaveRuntime(config, resolvedEventHandler),
    [config, resolvedEventHandler],
  );
  const normalizedConfig: PipewaveModuleConfig = runtime.config;
  const eventHandlerUtils = runtime.handler;
  const api = runtime.api;

  return (
    <ModuleConfigProvider value={normalizedConfig}>
      <PipewaveEventHandlerProvider value={eventHandlerUtils}>
        <PipewaveContextProvider value={api}>
          <ConnectionStatusProvider wsApi={api} wsHandler={eventHandlerUtils}>
            {children}
          </ConnectionStatusProvider>
        </PipewaveContextProvider>
      </PipewaveEventHandlerProvider>
    </ModuleConfigProvider>
  );
}

export { PipewaveProvider };
