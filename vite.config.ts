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
        // ✅ Try to prevent problematic chunking
        manualChunks: (id) => {
          // Keep thirdweb and viem together to avoid dynamic import issues
          if (id.includes('thirdweb') || id.includes('viem')) {
            return 'thirdweb-vendor';
          }
          // Keep node_modules in vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  esbuild: {
    target: 'es2020',
  },
  // ✅ Add optimizations for dependencies
  optimizeDeps: {
    include: [
      'thirdweb',
      'thirdweb/react',
      'viem',
      '@farcaster/frame-sdk'
    ],
  },
});
