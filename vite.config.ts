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
    rollupOptions: {
      output: {
        manualChunks: {
          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // Thirdweb and crypto libraries
          'thirdweb': ['thirdweb'],
          
          // UI libraries
          'ui-vendor': ['lucide-react', 'classnames'],
          
          // Utility libraries
          'utils': ['date-fns', '@tanstack/react-query'],
          
          // Farcaster
          'farcaster': ['@farcaster/frame-sdk'],
        },
      },
    },
    chunkSizeWarningLimit: 1000, // Increase warning limit to 1MB
  },
  esbuild: {
    target: 'es2020',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020',
    },
  },
});
