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
        manualChunks: (id) => {
          // React ecosystem
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
            return 'react-vendor';
          }
          
          // Thirdweb - split into smaller chunks
          if (id.includes('thirdweb')) {
            if (id.includes('react')) return 'thirdweb-react';
            if (id.includes('wallets') || id.includes('wallet')) return 'thirdweb-wallets';
            if (id.includes('chains')) return 'thirdweb-chains';
            if (id.includes('extensions')) return 'thirdweb-extensions';
            return 'thirdweb-core';
          }
          
          // Crypto and web3 related
          if (id.includes('viem') || id.includes('abitype') || id.includes('ox')) {
            return 'web3-vendor';
          }
          
          // Wallet libraries
          if (id.includes('walletconnect') || id.includes('coinbase') || id.includes('metamask')) {
            return 'wallet-vendor';
          }
          
          // UI libraries
          if (id.includes('lucide-react') || id.includes('classnames')) {
            return 'ui-vendor';
          }
          
          // Utility libraries
          if (id.includes('date-fns') || id.includes('@tanstack/react-query')) {
            return 'utils';
          }
          
          // Farcaster
          if (id.includes('@farcaster/frame-sdk')) {
            return 'farcaster';
          }
          
          // Large node_modules dependencies
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500, // Back to 500KB to catch any remaining large chunks
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
