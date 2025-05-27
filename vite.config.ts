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
          
          // Split thirdweb wallets more granularly
          if (id.includes('thirdweb')) {
            if (id.includes('wallets')) {
              if (id.includes('metamask')) return 'wallet-metamask';
              if (id.includes('coinbase')) return 'wallet-coinbase';
              if (id.includes('walletconnect')) return 'wallet-connect';
              if (id.includes('injected')) return 'wallet-injected';
              if (id.includes('embedded')) return 'wallet-embedded';
              return 'thirdweb-wallets';
            }
            if (id.includes('react')) return 'thirdweb-react';
            if (id.includes('chains')) return 'thirdweb-chains';
            if (id.includes('extensions')) return 'thirdweb-extensions';
            return 'thirdweb-core';
          }
          
          // Split wallet libraries more granularly
          if (id.includes('walletconnect')) {
            if (id.includes('modal')) return 'wc-modal';
            if (id.includes('ethereum')) return 'wc-ethereum';
            return 'walletconnect-core';
          }
          
          if (id.includes('coinbase')) return 'coinbase-wallet';
          if (id.includes('metamask')) return 'metamask-wallet';
          
          // Crypto and web3 related
          if (id.includes('viem') || id.includes('abitype')) return 'web3-core';
          if (id.includes('ox')) return 'web3-ox';
          
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
    chunkSizeWarningLimit: 1000, // Increase to 1MB since wallet chunks are inherently large
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
