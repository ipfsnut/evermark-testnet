import { useState, useEffect } from "react";
import { useReadContract } from "thirdweb/react";
import { getContract } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, AUCTION_ABI } from "../lib/contracts";
import { toEther } from "thirdweb/utils";
import { useAuctions } from "./useAuctions";

export function useTotalValue() {
  const [totalValue, setTotalValue] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(true);
  
  const { auctions, isLoading: isLoadingAuctions } = useAuctions();
  
  useEffect(() => {
    if (!isLoadingAuctions) {
      // Calculate total value from auctions
      const calculateValue = () => {
        let total = BigInt(0);
        
        // Add up all current bids or starting prices
        auctions.forEach(auction => {
          if (auction.currentBid > BigInt(0)) {
            total += auction.currentBid;
          } else {
            total += auction.startingPrice;
          }
        });
        
        // Convert to ETH with 2 decimal places
        const ethValue = parseFloat(toEther(total)).toFixed(2);
        setTotalValue(ethValue);
      };
      
      calculateValue();
      setIsLoading(false);
    }
  }, [auctions, isLoadingAuctions]);
  
  return { totalValue, isLoading };
}