import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
  },
  build: {
    // Ensure compatibility with mobile environments
    target: 'es2015',
    // Reduce chunk size for mobile
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          thirdweb: ['thirdweb'],
        }
      }
    }
  },
  // Ensure proper base path
  base: './',
  // Define for mobile compatibility
  define: {
    global: 'globalThis',
  }
});
