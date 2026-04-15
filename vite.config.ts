import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import { resolve } from 'path';

// https://vite.dev/config/
export default defineConfig(() => {
    return {
        plugins: [
            react({
                // Disable React Compiler for library builds
                // Using React Compiler in libraries can cause "Invalid hook call" errors
                // in consuming projects due to runtime dependencies
                babel: {
                    plugins: []
                }
            }),
            dts({
                tsconfigPath: "./tsconfig.app.json",
                include: ["src/**/*.ts", "src/**/*.tsx"],
                exclude: [],
                insertTypesEntry: true,
                bundledPackages: [],
                rollupTypes: false,
            }),
        ],
        build: {
            lib: {
                entry: {
                    // Main entry point
                    index: resolve(__dirname, "src/index.ts"),

                    // Context exports
                    context: resolve(__dirname, "src/context/index.ts"),

                    // Hooks
                    hooks: resolve(__dirname, "src/hooks/index.ts"),
                },
                formats: ["es"],
                fileName: (format, entryName) => `${entryName}.${format}.js`,
            },
            copyPublicDir: false,
            rollupOptions: {
                external: (id) => {
                    // Externalize all peer dependencies and their subpaths
                    const externals = [
                        'react',
                        'react-dom',
                        'react-router-dom',
                        '@msgpack/msgpack',
                    ];

                    // Check exact match or subpath
                    return externals.some(ext => id === ext || id.startsWith(ext + '/'));
                },
                output: {
                    assetFileNames: 'assets/[name][extname]',
                    preserveModules: false,
                    globals: {
                        'react': 'React',
                        'react-dom': 'ReactDOM',
                        'react/jsx-runtime': 'jsxRuntime'
                    }
                }
            },
        },
        resolve: {
            alias: {
                '@': resolve(__dirname, './src/'),
            },
        },
    };
});
