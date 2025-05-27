import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
  },
  build: {
    target: 'es2020', // Support BigInt literals
    rollupOptions: {
      output: {
        manualChunks: {
          // Split thirdweb into its own chunk to reduce main bundle size
          thirdweb: ['thirdweb'],
        },
      },
    },
  },
  esbuild: {
    target: 'es2020', // Ensure esbuild also targets ES2020
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2020', // For dependency pre-bundling
    },
  },
});
