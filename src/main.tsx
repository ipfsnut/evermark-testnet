// src/main.tsx - Updated QueryClient with strict retry limits
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App.tsx';
import { wagmiConfig } from './lib/wagmi';
import './index.css';

console.log('🚀 MAIN.TSX LOADING - React starting...');

// 🔧 FIXED: Strict limits to prevent infinite loops
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // 🚨 CRITICAL: Stop retrying on rate limit errors
        if (error?.message?.includes('rate limit') || 
            error?.message?.includes('429') || 
            error?.message?.includes('Too Many Requests')) {
          console.error('🚨 Rate limited - stopping retries');
          return false;
        }
        // Only retry once for other errors
        return failureCount < 1;
      },
      retryOnMount: false, // Don't retry when component mounts
      refetchOnWindowFocus: false, // Don't refetch when window gets focus
      refetchOnReconnect: false, // Don't refetch on network reconnect
      staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
      gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 0, // Never retry mutations
    }
  },
});

console.log('🚀 Main.tsx initializing at:', new Date().toISOString());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </WagmiProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);