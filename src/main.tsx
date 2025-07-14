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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
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