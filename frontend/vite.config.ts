/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/build/' : '/',
  plugins: [
    react(),
    tsconfigPaths(),
    tailwindcss(),
    VitePWA({
      strategies: 'generateSW',
      injectRegister: null,
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'icon-16.png',
        'icon-32.png',
        'icon-192.png',
        'icon-512.png',
        'vite.svg',
        'site-light.webmanifest',
        'site-dark.webmanifest',
      ],
      manifest: false,
      workbox: {
        importScripts: ['sw-notification-listeners.js'],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,webmanifest}'],
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/sanctum\//, /^\/storage\//, /^\/requests\//],
        // Critical for reliable updates
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 8,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 100, maxAgeSeconds: 3600 },
            },
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/sanctum': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/storage': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/requests': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/login': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/logout': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/register': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/forgot-password': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/reset-password': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/user': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/email': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setupTests.ts',
    css: false,
    testTimeout: 30000,
    // Exclude e2e tests from Vitest (they should be run with Playwright)
    exclude: ['**/node_modules/**', '**/e2e/**'],
    // Make test output much more concise
    reporters: [
      [
        'default',
        {
          summary: false,
        },
      ],
    ],
    silent: false,
    // Reduce DOM output in test failures
    onConsoleLog: () => false,
    // Limit error output
    printConsoleTrace: false,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    manifest: true,
    assetsDir: 'assets',
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    exclude: ['@radix-ui/number'],
  },
  resolve: {
    alias: {
      /* '@radix-ui/number': path.resolve(__dirname, 'node_modules/@radix-ui/number/dist/index.mjs'), */
      '@': path.resolve(__dirname, './src'),
    },
  },
}))
