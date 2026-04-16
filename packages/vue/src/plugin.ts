import { type App, ref, type InjectionKey, type Ref } from 'vue'
import {
    createPipewaveRuntime,
    type PipewaveConfigInput,
    type WebsocketApi,
    type WsEventHandlerUtils,
    type WsStatus,
} from '@pipewave/core'

export const PipewaveApiKey: InjectionKey<WebsocketApi> = Symbol('pipewave-api')
export const PipewaveHandlerKey: InjectionKey<WsEventHandlerUtils> = Symbol('pipewave-handler')
export const PipewaveStatusKey: InjectionKey<Ref<WsStatus>> = Symbol('pipewave-status')

/**
 * Creates a Vue plugin that initialises the Pipewave connection.
 *
 * @example
 * // main.ts
 * import { createApp } from 'vue'
 * import { createPipewavePlugin } from '@pipewave/vue'
 *
 * const app = createApp(App)
 * app.use(createPipewavePlugin({
 *   backendEndpoint: 'https://api.example.com',
 *   getAccessToken: () => Promise.resolve(localStorage.getItem('token') ?? ''),
 * }))
 * app.mount('#app')
 */
export function createPipewavePlugin(config: PipewaveConfigInput) {
    const runtime = createPipewaveRuntime(config)
    const handler = runtime.handler
    const api = runtime.api

    return {
        install(app: App) {
            const status = ref<WsStatus>(api.getStatus())

            handler.setOnOpen(async () => { status.value = api.getStatus() })
            handler.setOnClose(async () => { status.value = api.getStatus() })
            handler.setOnError(async (_error: Event) => { status.value = api.getStatus() })
            handler.setOnMaxRetry(async (_reset: () => void) => { status.value = api.getStatus() })

            app.provide(PipewaveApiKey, api)
            app.provide(PipewaveHandlerKey, handler)
            app.provide(PipewaveStatusKey, status)
        },
    }
}
