// src/lib/farcaster-wallet.ts
import { defineChain } from "thirdweb/chains";
import { createWallet } from "thirdweb/wallets";

// Create a custom Farcaster wallet connector
export function createFarcasterWallet() {
  return createWallet("embedded", {
    auth: {
      options: ["farcaster"],
    },
  });
}

// Check if we're in a Farcaster context and auto-connect
export async function autoConnectFarcasterWallet(client: any) {
  // Check if we're in Farcaster
  const isInFarcaster = (() => {
    if (typeof window === 'undefined') return false;
    
    const ua = navigator.userAgent.toLowerCase();
    const isWarpcast = ua.includes('warpcast') || ua.includes('farcaster');
    
    let isFramed = false;
    try {
      isFramed = window.self !== window.top;
    } catch (e) {
      isFramed = true;
    }
    
    return isWarpcast || isFramed;
  })();

  if (!isInFarcaster) return null;

  // Check if Frame SDK is available
  if (typeof window !== 'undefined' && (window as any).FrameSDK) {
    try {
      const wallet = createFarcasterWallet();
      
      // Try to connect using the Frame SDK context
      const account = await wallet.connect({
        client,
        strategy: "farcaster",
      });
      
      return account;
    } catch (error) {
      console.warn('Failed to auto-connect Farcaster wallet:', error);
      return null;
    }
  }

  return null;
}