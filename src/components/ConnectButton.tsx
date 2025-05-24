// src/components/ConnectButton.tsx
import React from 'react';
import { ConnectButton } from "thirdweb/react";
import { createWallet, inAppWallet } from "thirdweb/wallets";
import { client } from "../lib/thirdweb";
import { base } from "thirdweb/chains";

// Create wallet options including Farcaster for Frame support
const wallets = [
  inAppWallet({
    auth: {
      options: ["farcaster", "email", "phone"],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
];

export function WalletConnect() {
  return (
    <ConnectButton
      client={client}
      wallets={wallets}
      chains={[base]}
      theme="light"
      connectButton={{
        label: "Connect Wallet",
        style: {
          backgroundColor: '#7c3aed',
          color: 'white',
          borderRadius: '0.5rem',
          padding: '0.5rem 1rem',
          fontFamily: 'serif',
        }
      }}
      detailsButton={{
        style: {
          backgroundColor: '#f3f4f6',
          color: '#374151',
          borderRadius: '0.5rem',
          padding: '0.5rem 1rem',
          fontFamily: 'serif',
        }
      }}
    />
  );
}