import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react-router-dom'],
  },
  build: {
    outDir: '../backend/public/build',
    manifest: 'manifest.json',
    rollupOptions: {
      input: 'src/main.tsx',
    },
  },
})
