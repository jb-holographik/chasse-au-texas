import { defineConfig } from 'vite'

// vite.config.js
export default defineConfig({
  server: {
    host: 'localhost',
    port: 3000,
    strictPort: true,
    cors: '*',
    hmr: {
      host: 'localhost',
      protocol: 'ws',
    },
  },
  preview: {
    host: 'localhost',
    port: 3000,
    strictPort: true,
  },
  build: {
    minify: true,
    manifest: true,
    rollupOptions: {
      input: './src/main.js',
      output: {
        format: 'umd',
        entryFileNames: 'main.js',
        esModule: false,
        globals: {
          jquery: '$',
        },
      },
      external: ['jquery'],
    },
  },
})
