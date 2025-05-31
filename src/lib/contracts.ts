import { base, defineChain } from "thirdweb/chains";

// 🚀 Enhanced Chain configuration for ThirdWeb v5
export const CHAIN = {
  ...base,
  rpc: `https://${base.id}.rpc.thirdweb.com/${import.meta.env.VITE_THIRDWEB_CLIENT_ID}`,
};

// Contract addresses from environment variables
export const CONTRACTS = {
  EVERMARK_NFT: import.meta.env.VITE_EVERMARK_NFT_ADDRESS as string,
  VOTING: import.meta.env.VITE_EVERMARK_VOTING_ADDRESS as string,
  REWARDS: import.meta.env.VITE_EVERMARK_REWARDS_ADDRESS as string,
  MARKETPLACE: import.meta.env.VITE_MARKETPLACE_ADDRESS as string,
  LEADERBOARD: import.meta.env.VITE_EVERMARK_LEADERBOARD_ADDRESS as string,
  CARD_CATALOG: import.meta.env.VITE_CARD_CATALOG_ADDRESS as string,
  NFT_STAKING: import.meta.env.VITE_NFT_STAKING_ADDRESS as string,
  FEE_COLLECTOR: import.meta.env.VITE_FEE_COLLECTOR_ADDRESS as string,
  EMARK_TOKEN: import.meta.env.VITE_EMARK_ADDRESS as string,
};

// Import and re-export all ABIs from the abis folder
export * from './abis';

// Enhanced validation function
const validateContracts = () => {
  const requiredContracts = Object.keys(CONTRACTS) as (keyof typeof CONTRACTS)[];
  const missing = requiredContracts.filter(contract => !CONTRACTS[contract]);
  
  if (missing.length > 0) {
    console.warn('Missing contract addresses:', missing);
    console.warn('Make sure your .env.local file has all required contract addresses');
  }
  
  // Log RPC configuration in development
  if (import.meta.env.DEV) {
    console.log('🌐 RPC Configuration:');
    console.log('- Primary: ThirdWeb RPC (with your client ID)');
    console.log('- ThirdWeb handles fallbacks automatically');
    console.log('Contract addresses:', CONTRACTS);
  }
};

// Run validation
validateContracts();