import { PropsWithChildren } from 'react';
import { ThirdwebProvider } from "thirdweb/react";

export function AppThirdwebProvider({ children }: PropsWithChildren) {
  return (
    <ThirdwebProvider>
      {children}
    </ThirdwebProvider>
  );
}
