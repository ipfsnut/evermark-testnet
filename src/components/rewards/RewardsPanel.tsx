import { useEffect } from "react";
import { CoinsIcon, AlertCircleIcon, CheckCircleIcon, GiftIcon } from 'lucide-react';
import { useWalletAuth } from "../../providers/WalletProvider";
import { useRewardsDisplay } from "../../hooks/useRewardsDisplay";
import { DevRewardsDashboard } from "./DevRewardsDashboard";

export function RewardsPanel() {
  const { address } = useWalletAuth();
  
  // 🔧 SIMPLIFIED: Use shared rewards calculation hook for dual-token system
  const {
    current,
    format,
    originalRewardsData,
    isLoading,
    error,
  } = useRewardsDisplay(address);

  // Extract functions from original hook
  const {
    isClaimingRewards,
    success,
    claimRewards,
    clearMessages,
    authInfo
  } = originalRewardsData;
  
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => clearMessages(), 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error, clearMessages]);
  
  const handleClaimRewards = async () => {
    await claimRewards();
  };
  
  const hasWalletAccess = !!address || authInfo?.hasWalletAccess;
  
  if (!hasWalletAccess) {
    return (
      <>
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="text-center py-8">
            <CoinsIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {authInfo?.isInFarcaster ? "Authenticate to View Rewards" : "Connect to View Rewards"}
            </h3>
            <p className="text-gray-600">
              {authInfo?.isInFarcaster 
                ? "Authenticate in Farcaster or connect a wallet to see and claim your dual-token rewards"
                : "Connect your wallet to see and claim your dual-token rewards (WETH + $EMARK)"
              }
            </p>
          </div>
        </div>
        
        <DevRewardsDashboard />
      </>
    );
  }
  
  return (
    <>
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center mb-4">
          <CoinsIcon className="h-6 w-6 text-yellow-500 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Your Dual-Token Rewards</h3>
        </div>
        
        {/* 🔧 FIXED: Dual-token reward display with proper decimal formatting */}
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-6 rounded-lg border border-yellow-200 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <p className="text-sm text-amber-700 mb-1">Available to Claim</p>
              
              {isLoading ? (
                <p className="text-2xl font-bold text-amber-800">
                  <span className="text-lg">Loading...</span>
                </p>
              ) : current.hasClaimableRewards ? (
                <div className="space-y-1">
                  {/* 🔧 FIXED: Use consistent decimal formatting */}
                  {current.hasEthRewards && (
                    <div className="flex items-center space-x-2">
                      <p className="text-xl font-bold text-blue-800">
                        {format.ethRewardsDisplay()} WETH
                      </p>
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">WETH Rewards</span>
                    </div>
                  )}
                  {current.hasEmarkRewards && (
                    <div className="flex items-center space-x-2">
                      <p className="text-xl font-bold text-purple-800">
                        {format.emarkRewardsDisplay()} $EMARK
                      </p>
                      <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">EMARK Rewards</span>
                    </div>
                  )}
                  
                  {/* 🔧 FIXED: Total value with proper formatting */}
                  <p className="text-sm text-amber-700 mt-2">
                    Total Value: {format.totalRewardsDisplay()} tokens
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-amber-800">
                    <span className="text-lg text-amber-600">No rewards available</span>
                  </p>
                  <p className="text-xs text-gray-600">
                    Current amount: {format.totalRewardsDisplay()} tokens (minimum: 0.0001)
                  </p>
                </div>
              )}
            </div>
            
            <button
              onClick={handleClaimRewards}
              disabled={isClaimingRewards || !current.hasClaimableRewards}
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
                  {current.hasClaimableRewards ? 
                    `Claim ${format.totalRewardsDisplay()} Tokens` : 
                    'No Rewards'
                  }
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Status Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircleIcon className="h-4 w-4 text-red-600 mr-2" />
            <span className="text-red-700 text-sm">{typeof error === 'string' ? error : error.message}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        )}
        
        {/* 🔧 FIXED: Dual-token breakdown display with proper decimals */}
        {current.hasClaimableRewards && (
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Detailed Reward Breakdown</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {current.hasEthRewards && (
                <div className="flex items-center justify-between p-2 bg-white rounded">
                  <span className="text-blue-700">WETH Rewards:</span>
                  <span className="font-bold text-blue-900">
                    {format.ethRewardsDisplay()} WETH
                  </span>
                </div>
              )}
              {current.hasEmarkRewards && (
                <div className="flex items-center justify-between p-2 bg-white rounded">
                  <span className="text-purple-700">$EMARK Rewards:</span>
                  <span className="font-bold text-purple-900">
                    {format.emarkRewardsDisplay()} $EMARK
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded col-span-full">
                <span className="text-gray-700">Total Claimable Value:</span>
                <span className="font-bold text-gray-900">
                  {format.totalRewardsDisplay()} tokens
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div className="border-t border-gray-200 pt-4 mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">How to Earn Dual-Token Rewards</h4>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="h-5 w-5 bg-green-100 rounded-full flex items-center justify-center mr-2 text-green-600 text-xs">1</span>
              <span>Stake $EMARK to get wEMARK and earn from both WETH and $EMARK reward pools</span>
            </li>
            <li className="flex items-start">
              <span className="h-5 w-5 bg-green-100 rounded-full flex items-center justify-center mr-2 text-green-600 text-xs">2</span>
              <span>Delegate your wEMARK voting power to support quality Evermarks (enhances rewards)</span>
            </li>
            <li className="flex items-start">
              <span className="h-5 w-5 bg-green-100 rounded-full flex items-center justify-center mr-2 text-green-600 text-xs">3</span>
              <span>Create popular Evermarks to earn from the creator reward pool</span>
            </li>
            <li className="flex items-start">
              <span className="h-5 w-5 bg-blue-100 rounded-full flex items-center justify-center mr-2 text-blue-600 text-xs">💡</span>
              <span><strong>New:</strong> Rewards automatically rebalance based on pool sizes for optimal yields</span>
            </li>
          </ul>
        </div>
        
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600">
            💡 <strong>Dual-Token System:</strong> Earn both WETH and $EMARK tokens automatically. 
            Reward rates adjust periodically based on pool funding and staking participation.
            {current.hasClaimableRewards && (
              <strong className="text-green-700"> You currently have {format.totalRewardsDisplay()} tokens ready to claim!</strong>
            )}
          </p>
        </div>
      </div>
      
      <DevRewardsDashboard />
    </>
  );
}