import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate problematic dependencies into their own chunks
          'web3-libs': ['thirdweb', 'wagmi', 'viem'],
          'farcaster': ['@farcaster/frame-sdk', '@farcaster/frame-wagmi-connector'],
        }
      }
    }
  },
  esbuild: {
    target: 'es2020',
  },
  resolve: {
    dedupe: ['@emotion/react', '@emotion/styled', 'react', 'react-dom']
  },
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    // Force Vite to pre-bundle these CommonJS dependencies as ESM
    include: [
      'eventemitter3',
      '@farcaster/frame-sdk',
      '@farcaster/frame-core', 
      'thirdweb',
      'wagmi',
      '@wagmi/connectors',
      'classnames',
      'date-fns'
    ],
    // Handle ESM/CommonJS compatibility
    esbuildOptions: {
      target: 'es2020'
    }
  }
});