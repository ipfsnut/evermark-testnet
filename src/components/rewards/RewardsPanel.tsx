import { useEffect } from "react";
import { useRewards } from "../../hooks/useRewards";
import { CoinsIcon, AlertCircleIcon, CheckCircleIcon, GiftIcon } from 'lucide-react';
import { formatEmark, formatEmarkWithSymbol } from "../../utils/formatters";
import { useWalletAuth } from "../../providers/WalletProvider";
import { toEther } from "thirdweb/utils";
import { DevRewardsDashboard } from "./DevRewardsDashboard";

export function RewardsPanel() {
  const { address } = useWalletAuth();
  
  // 🔍 DEBUG: Check wallet address
  console.log('🔍 RewardsPanel Debug wallet info:', {
    currentAddress: address,
    devWalletAddress: "0x2B27EA7DaA8Bf1dE98407447b269Dfe280753fe3",
    isMatch: address && address.toLowerCase() === "0x2B27EA7DaA8Bf1dE98407447b269Dfe280753fe3".toLowerCase(),
    hasAddress: !!address
  });
  
  const {
    pendingRewards,
    pendingEthRewards,
    pendingEmarkRewards,
    isLoadingRewards,
    isClaimingRewards,
    error,
    success,
    claimRewards,
    clearMessages,
    authInfo
  } = useRewards(address);

  // 🔧 FIX: Add comprehensive debugging for the display issue
  console.log('🔍 RewardsPanel Detailed Debug:', {
    walletAddress: address,
    authInfo,
    // Raw BigInt values
    pendingRewards_raw: pendingRewards ? pendingRewards.toString() : 'none',
    pendingEthRewards_raw: pendingEthRewards ? pendingEthRewards.toString() : 'none',
    pendingEmarkRewards_raw: pendingEmarkRewards ? pendingEmarkRewards.toString() : 'none',
    // Converted values
    pendingRewards_formatted: pendingRewards ? formatEmarkWithSymbol(pendingRewards) : 'none',
    pendingEthRewards_ether: pendingEthRewards ? toEther(pendingEthRewards) + ' ETH' : 'none',
    pendingEmarkRewards_ether: pendingEmarkRewards ? toEther(pendingEmarkRewards) + ' $EMARK' : 'none',
  });
  
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
  
  // 🔧 FIX: Use toEther directly for more reliable conversion
  const formattedRewards = pendingRewards ? toEther(pendingRewards) : '0';
  const hasClaimableRewards = formattedRewards && parseFloat(formattedRewards) > 0.0001; // Minimum threshold
  
  // 🔧 FIX: Use consistent toEther conversion for all amounts
  const formattedEthRewards = pendingEthRewards ? toEther(pendingEthRewards) : '0';
  const formattedEmarkRewards = pendingEmarkRewards ? toEther(pendingEmarkRewards) : '0';
  const hasEthRewards = parseFloat(formattedEthRewards) > 0.0001;
  const hasEmarkOnlyRewards = parseFloat(formattedEmarkRewards) > 0.0001;
  
  // 🔧 FIX: Better reward type detection
  const totalRewardValue = parseFloat(formattedEthRewards) + parseFloat(formattedEmarkRewards);
  const primaryRewardType = parseFloat(formattedEthRewards) > parseFloat(formattedEmarkRewards) ? 'ETH' : 'EMARK';
  
  // 🔧 FIX: Add debugging output to console for verification
  console.log('🎁 Rewards Display Debug:', {
    formattedRewards,
    formattedEthRewards,
    formattedEmarkRewards,
    hasClaimableRewards,
    hasEthRewards,
    hasEmarkOnlyRewards,
    totalRewardValue,
    primaryRewardType
  });
  
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
                : "Connect your wallet to see and claim your dual-token rewards (ETH + $EMARK)"
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
        
        {/* 🔧 FIX: Improved dual reward display with better logic */}
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-6 rounded-lg border border-yellow-200 mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <p className="text-sm text-amber-700 mb-1">Available to Claim</p>
              
              {/* 🔧 FIX: More accurate reward display */}
              {isLoadingRewards ? (
                <p className="text-2xl font-bold text-amber-800">
                  <span className="text-lg">Loading...</span>
                </p>
              ) : hasClaimableRewards ? (
                <div className="space-y-1">
                  {/* Show individual reward types */}
                  {hasEthRewards && (
                    <div className="flex items-center space-x-2">
                      <p className="text-xl font-bold text-blue-800">
                        {parseFloat(formattedEthRewards).toFixed(6)} ETH
                      </p>
                      <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">ETH Rewards</span>
                    </div>
                  )}
                  {hasEmarkOnlyRewards && (
                    <div className="flex items-center space-x-2">
                      <p className="text-xl font-bold text-purple-800">
                        {parseFloat(formattedEmarkRewards).toFixed(6)} $EMARK
                      </p>
                      <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">EMARK Rewards</span>
                    </div>
                  )}
                  
                  {/* Show total if both types exist */}
                  {hasEthRewards && hasEmarkOnlyRewards && (
                    <p className="text-sm text-amber-700 mt-2">
                      Total Value: {totalRewardValue.toFixed(6)} tokens across both pools
                    </p>
                  )}
                  
                  {/* 🔧 FIX: Debug display for verification */}
                  <details className="text-xs text-gray-600 mt-2">
                    <summary className="cursor-pointer">Debug Info</summary>
                    <div className="mt-1 font-mono bg-gray-100 p-2 rounded">
                      <div>Raw ETH: {pendingEthRewards?.toString() || '0'} wei</div>
                      <div>Raw EMARK: {pendingEmarkRewards?.toString() || '0'} wei</div>
                      <div>Formatted ETH: {formattedEthRewards}</div>
                      <div>Formatted EMARK: {formattedEmarkRewards}</div>
                      <div>Total: {formattedRewards}</div>
                    </div>
                  </details>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-amber-800">
                    <span className="text-lg text-amber-600">No rewards available</span>
                  </p>
                  {/* 🔧 FIX: Show debug info even when no rewards to help diagnose */}
                  <details className="text-xs text-gray-600">
                    <summary className="cursor-pointer">Debug: Why no rewards?</summary>
                    <div className="mt-1 font-mono bg-gray-100 p-2 rounded">
                      <div>Raw total: {pendingRewards?.toString() || '0'} wei</div>
                      <div>Formatted total: {formattedRewards}</div>
                      <div>Threshold: 0.0001</div>
                      <div>Meets threshold: {totalRewardValue > 0.0001 ? 'Yes' : 'No'}</div>
                    </div>
                  </details>
                </div>
              )}
            </div>
            
            <button
              onClick={handleClaimRewards}
              disabled={isClaimingRewards || !hasClaimableRewards}
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
                  {hasClaimableRewards ? 
                    `Claim ${totalRewardValue.toFixed(4)} Tokens` : 
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
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-green-700 text-sm">{success}</span>
          </div>
        )}
        
        {/* 🔧 FIX: Enhanced reward breakdown display */}
        {hasClaimableRewards && (hasEthRewards || hasEmarkOnlyRewards) && (
          <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Detailed Reward Breakdown</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {hasEthRewards && (
                <div className="flex items-center justify-between p-2 bg-white rounded">
                  <span className="text-blue-700">ETH/WETH Rewards:</span>
                  <span className="font-bold text-blue-900">
                    {parseFloat(formattedEthRewards).toFixed(6)} ETH
                  </span>
                </div>
              )}
              {hasEmarkOnlyRewards && (
                <div className="flex items-center justify-between p-2 bg-white rounded">
                  <span className="text-purple-700">$EMARK Rewards:</span>
                  <span className="font-bold text-purple-900">
                    {parseFloat(formattedEmarkRewards).toFixed(6)} $EMARK
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded col-span-full">
                <span className="text-gray-700">Total Claimable Value:</span>
                <span className="font-bold text-gray-900">
                  {totalRewardValue.toFixed(6)} tokens
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
              <span>Stake $EMARK to get wEMARK and earn from both ETH and $EMARK reward pools</span>
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
        
        {/* 🔧 FIX: Enhanced period-based rewards explanation */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600">
            💡 <strong>Dual-Token System:</strong> Earn both ETH and $EMARK tokens automatically. 
            Reward rates adjust periodically based on pool funding and staking participation.
            The more you stake and participate, the more you earn from both pools.
            {hasClaimableRewards && (
              <strong className="text-green-700"> You currently have {totalRewardValue.toFixed(6)} tokens ready to claim!</strong>
            )}
          </p>
        </div>
      </div>
      
      <DevRewardsDashboard />
    </>
  );
}