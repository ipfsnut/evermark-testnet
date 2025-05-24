import React, { useState, useEffect } from "react";
import { useWallet } from "../../hooks/useWallet";
import { useAuctionDetails } from "../../hooks/useAuctions";
import { 
  DollarSignIcon, 
  ClockIcon, 
  UserIcon, 
  AlertCircleIcon,
  CheckCircleIcon,
  GavelIcon 
} from 'lucide-react';
import { toEther } from "thirdweb/utils";
import { Link } from "react-router-dom";

interface EnhancedAuctionCardProps {
  auctionId: string;
}

export function EnhancedAuctionCard({ auctionId }: EnhancedAuctionCardProps) {
  const { address, isConnected } = useWallet();
  const [bidAmount, setBidAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isBidding, setIsBidding] = useState(false);
  
  const {
    auction,
    isLoading,
    timeRemaining,
    placeBid,
    isAuctionEnded,
    hasActiveBid,
  } = useAuctionDetails(auctionId);
  
  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);
  
  const handleBid = async () => {
    if (!address) {
      setError("Please connect your wallet");
      return;
    }
    
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      setError("Please enter a valid bid amount");
      return;
    }
    
    setIsBidding(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await placeBid(bidAmount);
      
      if (result.success) {
        setSuccess(result.message ?? "Bid placed successfully!");
        setBidAmount("");
      } else {
        setError(result.error ?? "Failed to place bid");
      }
    } finally {
      setIsBidding(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }
  
  if (!auction) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-red-200">
        <div className="text-center py-4">
          <AlertCircleIcon className="mx-auto h-8 w-8 text-red-500 mb-2" />
          <p className="text-red-600">Failed to load auction details</p>
        </div>
      </div>
    );
  }
  
  const isUserSeller = address?.toLowerCase() === auction.seller.toLowerCase();
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <GavelIcon className="h-5 w-5 text-green-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">
              <Link to={`/evermark/${auction.tokenId.toString()}`} className="hover:text-green-700 transition-colors">
                Evermark #{auction.tokenId.toString()}
              </Link>
            </h3>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <ClockIcon className="h-4 w-4 mr-1" />
            <span className={isAuctionEnded ? "text-red-600 font-medium" : ""}>
              {timeRemaining}
            </span>
          </div>
        </div>
      </div>
      
      {/* Auction Details */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Current Bid</p>
            <p className="text-2xl font-bold text-gray-900">
              {hasActiveBid ? toEther(auction.currentBid) : toEther(auction.startingPrice)} ETH
            </p>
            <p className="text-xs text-gray-500">
              {hasActiveBid ? "Highest bid" : "Starting price"}
            </p>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 mb-1">Reserve Price</p>
            <p className="text-lg font-semibold text-gray-700">
              {toEther(auction.reservePrice)} ETH
            </p>
            <p className="text-xs text-gray-500">
              Minimum to win
            </p>
          </div>
        </div>
        
        {/* Seller Info */}
        <div className="flex items-center mb-4 p-3 bg-gray-50 rounded-lg">
          <UserIcon className="h-4 w-4 text-gray-500 mr-2" />
          <div>
            <p className="text-sm text-gray-600">Seller</p>
            <p className="text-sm font-mono text-gray-900">
              {auction.seller.slice(0, 6)}...{auction.seller.slice(-4)}
            </p>
          </div>
        </div>
        
        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircleIcon className="h-4 w-4 text-red-600 mr-2" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        )}
        
        {/* Bidding Interface */}
        {!isAuctionEnded && !isUserSeller && isConnected && (
          <div className="space-y-4">
            <div>
              <label htmlFor="bid-amount" className="block text-sm font-medium text-gray-700 mb-2">
                Your Bid (ETH)
              </label>
              <input
                id="bid-amount"
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder={`Min: ${toEther(hasActiveBid ? auction.currentBid + BigInt(10000000000000000) : auction.startingPrice)}`}
                min={toEther(hasActiveBid ? auction.currentBid + BigInt(10000000000000000) : auction.startingPrice)}
                step="0.01"
              />
            </div>
            
            <button
              onClick={handleBid}
              disabled={isBidding || !bidAmount || parseFloat(bidAmount) <= 0}
              className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isBidding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Placing Bid...
                </>
              ) : (
                <>
                  <DollarSignIcon className="h-4 w-4 mr-2" />
                  Place Bid
                </>
              )}
            </button>
          </div>
        )}
        
        {/* Auction Status */}
        {isAuctionEnded && (
          <div className="text-center py-4 bg-gray-50 rounded-lg">
            <p className="text-gray-700 font-medium">Auction Ended</p>
            {hasActiveBid && (
              <p className="text-sm text-gray-600 mt-1">
                Winner: {auction.highestBidder.slice(0, 6)}...{auction.highestBidder.slice(-4)}
              </p>
            )}
          </div>
        )}
        
        {isUserSeller && (
          <div className="text-center py-4 bg-blue-50 rounded-lg">
            <p className="text-blue-700">This is your auction</p>
          </div>
        )}
        
        {!isConnected && (
          <div className="text-center py-4 bg-gray-50 rounded-lg">
            <p className="text-gray-600">Connect your wallet to participate</p>
          </div>
        )}
      </div>
    </div>
  );
}