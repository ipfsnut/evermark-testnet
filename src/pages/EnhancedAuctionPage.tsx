import React, { useState, useMemo } from 'react';
import { DollarSignIcon, ClockIcon } from 'lucide-react';
import { getContract, readContract } from "thirdweb";
import { useReadContract } from "thirdweb/react";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, AUCTION_ABI } from "../lib/contracts";
import { EnhancedAuctionCard } from '../components/auction/EnhancedAuctionCard';
import PageContainer from '../components/layout/PageContainer';

const EnhancedAuctionPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  
  // Create contract instance using useMemo
  const auctionContract = useMemo(() => {
    return getContract({
      client,
      chain: CHAIN,
      address: CONTRACTS.AUCTION,
      abi: AUCTION_ABI,
    });
  }, []);
  
  // Use the useReadContract hook to get active auctions
  const { data: activeAuctionIds, isLoading } = useReadContract({
    contract: auctionContract,
    method: "getActiveAuctions",
    params: [],
  });
  
  // Process auctions for display
  const auctions = useMemo(() => {
    if (!activeAuctionIds || activeAuctionIds.length === 0) {
      // Mock data for demonstration if no real auctions
      if (process.env.NODE_ENV === 'development') {
        return [
          { auctionId: '1' },
          { auctionId: '2' },
          { auctionId: '3' }
        ];
      }
      return [];
    }
    
    // Format auction data for rendering
    return activeAuctionIds.map(id => ({
      auctionId: id.toString()
    }));
  }, [activeAuctionIds]);
  
  return (
    <PageContainer title="Auctions">
      <div className="space-y-6">
        <div className="text-center">
          <DollarSignIcon className="mx-auto h-12 w-12 text-green-500 mb-4" />
          <p className="text-gray-600">Buy and sell unique Evermarks</p>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="animate-pulse space-y-6">
              <div className="h-12 bg-gray-200 rounded"></div>
              <div className="h-48 bg-gray-200 rounded"></div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        ) : auctions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center py-12">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Auctions</h3>
              <p className="text-gray-600">Check back later for new auctions</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {auctions.map(auction => (
              <EnhancedAuctionCard 
                key={auction.auctionId} 
                auctionId={auction.auctionId} 
              />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default EnhancedAuctionPage;