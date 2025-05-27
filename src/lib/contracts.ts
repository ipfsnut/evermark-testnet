import { baseSepolia } from "thirdweb/chains";

// Chain configuration
export const CHAIN = baseSepolia; // Change to baseSepolia for testnet

// Contract addresses from environment variables
export const CONTRACTS = {
  EVERMARK_NFT: import.meta.env.VITE_EVERMARK_NFT_ADDRESS as string,
  VOTING: import.meta.env.VITE_EVERMARK_VOTING_ADDRESS as string,
  REWARDS: import.meta.env.VITE_EVERMARK_REWARDS_ADDRESS as string,
  AUCTION: import.meta.env.VITE_EVERMARK_AUCTION_ADDRESS as string,
  LEADERBOARD: import.meta.env.VITE_EVERMARK_LEADERBOARD_ADDRESS as string,
  CARD_CATALOG: import.meta.env.VITE_CARD_CATALOG_ADDRESS as string,
  NFT_STAKING: import.meta.env.VITE_NFT_STAKING_ADDRESS as string,
  FEE_COLLECTOR: import.meta.env.VITE_FEE_COLLECTOR_ADDRESS as string,
  EMARK_TOKEN: import.meta.env.VITE_EMARK_ADDRESS as string,
};

// Import and re-export all ABIs from the abis folder
export * from './abis';

// Validation function
const validateContracts = () => {
  const requiredContracts = Object.keys(CONTRACTS) as (keyof typeof CONTRACTS)[];
  const missing = requiredContracts.filter(contract => !CONTRACTS[contract]);
  
  if (missing.length > 0) {
    console.warn('Missing contract addresses:', missing);
    console.warn('Make sure your .env.local file has all required contract addresses');
  }
  
  // Log addresses in development for debugging
  if (import.meta.env.DEV) {
    console.log('Contract addresses:', CONTRACTS);
  }
};

// Run validation
validateContracts();
