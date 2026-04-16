# Pipewave Client SDK

Monorepo for the Pipewave client SDK, split by concern so the transport/runtime stays framework-agnostic and each framework adapter can evolve independently.

## Packages

- `@pipewave/core`: transport, config, schema helpers, and framework-neutral client/runtime APIs.
- `@pipewave/react`: React provider, hooks, and debugger UI.
- `@pipewave/vue`: Vue plugin and composables.
- `@pipewave/vanilla`: thin vanilla adapter that re-exports the framework-neutral client API from `@pipewave/core`.

## Development

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm dev
```

The root Vite app is a lightweight playground that imports the workspace packages through their public package names, so it acts as a consumer-facing integration check while developing the SDK.
