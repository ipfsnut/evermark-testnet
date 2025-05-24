import React, { PropsWithChildren } from 'react';
import { ThirdwebProvider } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { CHAIN } from './contracts';

// Add at the top of the file
const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;
console.log("Thirdweb Client ID:", clientId ? "Loaded (length: " + clientId.length + ")" : "Missing");

export const client = createThirdwebClient({
  clientId: clientId || "your_client_id_here",
});

export function AppThirdwebProvider({ children }: PropsWithChildren) {
  // Configure with reduced polling to prevent auto-refresh
  const providerProps = {
    client,
    activeChain: CHAIN,
    // Reduce aggressive polling that might cause auto-refresh
    queryOptions: {
      refetchInterval: false, // Disable automatic refetching
      refetchOnWindowFocus: false, // Don't refetch when window gains focus
      refetchOnReconnect: false, // Don't refetch on network reconnect
      staleTime: 60000, // Consider data fresh for 1 minute
      cacheTime: 300000, // Keep data in cache for 5 minutes
    }
  } as any;

  return (
    <ThirdwebProvider {...providerProps}>
      {children}
    </ThirdwebProvider>
  );
}