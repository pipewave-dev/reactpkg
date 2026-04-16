import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [],
      },
    }),
  ],
  resolve: {
    alias: {
      "@pipewave/core": resolve(__dirname, "./packages/core/src/index.ts"),
      "@pipewave/react": resolve(__dirname, "./packages/react/src/index.ts"),
      "@pipewave/vue": resolve(__dirname, "./packages/vue/src/index.ts"),
      "@pipewave/vanilla": resolve(__dirname, "./packages/vanilla/src/index.ts"),
    },
  },
});
