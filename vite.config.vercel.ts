import path from "path";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      input: 'index.html'
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, "./src/react-app")
    }
  },
  server: {
    allowedHosts: true,
  }
})
