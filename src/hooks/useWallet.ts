import { useActiveAccount, useConnect, useDisconnect } from "thirdweb/react";

export function useWallet() {
  const account = useActiveAccount();
  const { connect, isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  return {
    account,
    address: account?.address,
    isConnected: !!account,
    isConnecting,
    isDisconnecting: false,
    connect,
    disconnect,
    // Format address for display
    displayAddress: account ? 
      `${account.address.substring(0, 6)}...${account.address.substring(account.address.length - 4)}` : 
      '',
  };
}