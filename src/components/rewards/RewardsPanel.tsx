import { useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useRewards } from "../../hooks/useRewards";
import { CoinsIcon, AlertCircleIcon, CheckCircleIcon, GiftIcon } from 'lucide-react';
import { formatEmark, formatEmarkWithSymbol } from "../../utils/formatters";

export function RewardsPanel() {
  const account = useActiveAccount();
  const address = account?.address;
  
  const {
    pendingRewards,
    isLoadingRewards,
    isClaimingRewards,
    error,
    success,
    claimRewards,
    clearMessages,
    authInfo
  } = useRewards(address);

  console.log('🔍 RewardsPanel Debug:', {
    walletAddress: address,
    authInfo,
    pendingRewards: pendingRewards ? formatEmarkWithSymbol(pendingRewards) : 'none'
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
  const formattedRewards = formatEmark(pendingRewards, 4); // Use 4 decimals for precision
  const hasClaimableRewards = formattedRewards && parseFloat(formattedRewards) > 0;
  
  if (!hasWalletAccess) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="text-center py-8">
          <CoinsIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {authInfo?.isInFarcaster ? "Authenticate to View Rewards" : "Connect to View Rewards"}
          </h3>
          <p className="text-gray-600">
            {authInfo?.isInFarcaster 
              ? "Authenticate in Farcaster or connect a wallet to see and claim your $EMARK rewards"
              : "Connect your wallet to see and claim your $EMARK rewards"
            }
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center mb-4">
        <CoinsIcon className="h-6 w-6 text-yellow-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Your $EMARK Rewards</h3>
      </div>
      
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 p-6 rounded-lg border border-yellow-200 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <p className="text-sm text-amber-700 mb-1">Available to Claim</p>
            <p className="text-3xl font-bold text-amber-800">
              {isLoadingRewards ? (
                <span className="text-lg">Loading...</span>
              ) : hasClaimableRewards ? (
                `${formattedRewards} $EMARK`
              ) : (
                <span className="text-lg text-amber-600">No rewards yet</span>
              )}
            </p>
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
                {hasClaimableRewards ? 'Claim $EMARK' : 'No Rewards'}
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
        <h4 className="text-sm font-medium text-gray-900 mb-3">How to Earn $EMARK Rewards</h4>
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