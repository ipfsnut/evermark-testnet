import { PropsWithChildren } from 'react';
import { ThirdwebProvider } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { WalletProvider } from '../providers/WalletProvider';

// Create the thirdweb client
const clientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID;
console.log("Thirdweb Client ID:", clientId ? "Loaded (length: " + clientId.length + ")" : "Missing");

export const client = createThirdwebClient({
  clientId: clientId as string,
});

export function AppThirdwebProvider({ children }: PropsWithChildren) {
  return (
    <ThirdwebProvider>
      <WalletProvider>
        {children}
      </WalletProvider>
    </ThirdwebProvider>
  );
}