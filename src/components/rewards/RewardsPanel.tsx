import React, { useEffect } from "react";
import { useWallet } from "../../hooks/useWallet";
import { useRewards } from "../../hooks/useRewards";
import { CoinsIcon, AlertCircleIcon, CheckCircleIcon, GiftIcon } from 'lucide-react';
import { toEther } from "thirdweb/utils";

export function RewardsPanel() {
  const { address, isConnected } = useWallet();
  
  const {
    pendingRewards,
    isLoadingRewards,
    isClaimingRewards,
    error,
    success,
    claimRewards,
    clearMessages,
  } = useRewards(address);
  
  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => clearMessages(), 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error, clearMessages]);
  
  const handleClaimRewards = async () => {
    await claimRewards();
  };
  
  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="text-center py-8">
          <CoinsIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Connect to View Rewards</h3>
          <p className="text-gray-600">Connect your wallet to see and claim your rewards</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center mb-4">
        <CoinsIcon className="h-6 w-6 text-yellow-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Your Rewards</h3>
      </div>
      
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-6 rounded-lg border border-yellow-200 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <p className="text-sm text-amber-700 mb-1">Available to Claim</p>
            <p className="text-3xl font-bold text-amber-800">
              {isLoadingRewards ? (
                <span className="text-lg">Loading...</span>
              ) : (
                `${toEther(pendingRewards || BigInt(0))} Tokens`
              )}
            </p>
          </div>
          
          <button
            onClick={handleClaimRewards}
            disabled={isClaimingRewards || !pendingRewards || pendingRewards === BigInt(0)}
            className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isClaimingRewards ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                Claiming...
              </>
            ) : (
              <>
                <GiftIcon className="h-4 w-4 mr-2 inline-block" />
                Claim Rewards
              </>
            )}
          </button>
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
      
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">How to Earn Rewards</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start">
            <span className="h-5 w-5 bg-green-100 rounded-full flex items-center justify-center mr-2 text-green-600 text-xs">1</span>
            <span>Create valuable Evermarks that others vote on</span>
          </li>
          <li className="flex items-start">
            <span className="h-5 w-5 bg-green-100 rounded-full flex items-center justify-center mr-2 text-green-600 text-xs">2</span>
            <span>Participate in voting on quality content</span>
          </li>
          <li className="flex items-start">
            <span className="h-5 w-5 bg-green-100 rounded-full flex items-center justify-center mr-2 text-green-600 text-xs">3</span>
            <span>Get your Evermarks featured on the leaderboard</span>
          </li>
        </ul>
      </div>
    </div>
  );
}