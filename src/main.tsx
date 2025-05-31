import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThirdwebProvider } from "thirdweb/react"
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import { FarcasterProvider } from './lib/farcaster'
import { wagmiConfig } from './lib/wagmi'
import { client } from './lib/thirdweb'
import './index.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <ThirdwebProvider>
          <FarcasterProvider>
            <App />
          </FarcasterProvider>
        </ThirdwebProvider>
      </WagmiProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);