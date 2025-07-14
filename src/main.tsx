import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThirdwebProvider } from "thirdweb/react"
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App.tsx';
import { FarcasterProvider } from './lib/farcaster'
import { wagmiConfig } from './lib/wagmi'
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <ThirdwebProvider>
            <FarcasterProvider>
                <App />
            </FarcasterProvider>
          </ThirdwebProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);