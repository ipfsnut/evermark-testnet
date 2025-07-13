import { useState, useEffect } from "react";
import { toEther, toWei } from "thirdweb/utils";
import { LockIcon, UnlockIcon, CoinsIcon, AlertCircleIcon, CheckCircleIcon, ClockIcon, XIcon } from 'lucide-react';
import { useWrapping } from "../../hooks/useWrapping";
import { useRewards } from "../../hooks/useRewards";
import { formatDistanceToNow } from "date-fns";
import { cn, useIsMobile } from "../../utils/responsive";

interface WrappingWidgetProps {
  userAddress?: string;
}

export function WrappingWidget({ userAddress }: WrappingWidgetProps) {
  const [wrapAmount, setWrapAmount] = useState("");
  const [unwrapAmount, setUnwrapAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"wrap" | "unwrap">("wrap");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const isMobile = useIsMobile();
  
  // Use core wrapping hook
  const {
    emarkBalance,
    wEmarkBalance,
    totalWrapped,
    unbondingAmount,
    unbondingReleaseTime,
    isWrapping,
    isUnwrapping,
    wrapTokens,
    requestUnwrap,
    completeUnwrap,
    cancelUnbonding,
    hasWalletAccess,
    refetch
  } = useWrapping(userAddress);
  
  // Use core rewards hook
  const {
    pendingRewards,
    isClaimingRewards,
    claimRewards,
    error: rewardsError,
    success: rewardsSuccess,
    clearMessages: clearRewardsMessages
  } = useRewards(userAddress);
  
  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);
  
  useEffect(() => {
    if (rewardsSuccess || rewardsError) {
      const timer = setTimeout(() => clearRewardsMessages(), 5000);
      return () => clearTimeout(timer);
    }
  }, [rewardsSuccess, rewardsError, clearRewardsMessages]);
  
  const handleWrap = async () => {
    if (!wrapAmount || parseFloat(wrapAmount) <= 0) return;
    
    try {
      setError(null);
      setSuccess(null);
      
      await wrapTokens(toWei(wrapAmount));
      
      setSuccess("Wrap transaction submitted!");
      setWrapAmount("");
      setTimeout(() => refetch(), 2000);
    } catch (error: any) {
      console.error("Wrap failed:", error);
      setError(error.message || "Wrapping failed");
    }
  };
  
  const handleRequestUnwrap = async () => {
    if (!unwrapAmount || parseFloat(unwrapAmount) <= 0) return;
    
    try {
      setError(null);
      setSuccess(null);
      
      await requestUnwrap(toWei(unwrapAmount));
      
      setSuccess("Unwrap request submitted!");
      setUnwrapAmount("");
      setTimeout(() => refetch(), 2000);
    } catch (error: any) {
      console.error("Unwrap request failed:", error);
      setError(error.message || "Unwrap request failed");
    }
  };
  
  const handleCompleteUnwrap = async () => {
    try {
      setError(null);
      setSuccess(null);
      
      await completeUnwrap();
      
      setSuccess("Complete unwrap transaction submitted!");
      setTimeout(() => refetch(), 2000);
    } catch (error: any) {
      console.error("Complete unwrap failed:", error);
      setError(error.message || "Complete unwrap failed");
    }
  };
  
  const handleCancelUnbonding = async () => {
    try {
      setError(null);
      setSuccess(null);
      
      await cancelUnbonding();
      
      setSuccess("Cancel unbonding transaction submitted!");
      setTimeout(() => refetch(), 2000);
    } catch (error: any) {
      console.error("Cancel unbonding failed:", error);
      setError(error.message || "Cancel unbonding failed");
    }
  };
  
  const handleClaimRewards = async () => {
    try {
      await claimRewards();
      setTimeout(() => refetch(), 2000);
    } catch (error: any) {
      console.error("Claim rewards failed:", error);
    }
  };
  
  const isUnbondingReady = () => {
    return Number(unbondingReleaseTime) * 1000 <= Date.now();
  };
  
  if (!hasWalletAccess) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
        <div className="text-center py-6 sm:py-8">
          <LockIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">Connect Wallet</h3>
          <p className="text-sm sm:text-base text-gray-600">Connect your wallet to wrap and unwrap tokens</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-serif font-bold text-gray-900 mb-4 sm:mb-6">Wrapping & Rewards</h2>
      
      {/* Status Messages - Mobile optimized */}
      {(error || rewardsError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
          <AlertCircleIcon className="h-4 w-4 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
          <span className="text-red-700 text-sm leading-relaxed">{error || rewardsError}</span>
        </div>
      )}
      
      {(success || rewardsSuccess) && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start">
          <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
          <span className="text-green-700 text-sm leading-relaxed">{success || rewardsSuccess}</span>
        </div>
      )}
      
      {/* Tabs - Mobile friendly */}
      <div className="flex border-b border-gray-200 mb-4 sm:mb-6">
        <button
          className={cn(
            "px-4 py-2 sm:py-3 font-medium text-sm sm:text-base flex-1 sm:flex-none transition-colors touch-manipulation",
            activeTab === "wrap"
              ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
              : "text-gray-500 hover:text-gray-700"
          )}
          onClick={() => setActiveTab("wrap")}
        >
          Wrap
        </button>
        <button
          className={cn(
            "px-4 py-2 sm:py-3 font-medium text-sm sm:text-base flex-1 sm:flex-none transition-colors touch-manipulation",
            activeTab === "unwrap"
              ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
              : "text-gray-500 hover:text-gray-700"
          )}
          onClick={() => setActiveTab("unwrap")}
        >
          Unwrap
        </button>
      </div>
      
      {/* Wrap Tab */}
      {activeTab === "wrap" && (
        <div className="space-y-4">
          <div>
            <label htmlFor="wrap-amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount to Wrap ($EMARK)
            </label>
            <div className="text-xs text-gray-500 mb-2">
              Available: {emarkBalance ? toEther(emarkBalance) : "0"} $EMARK
            </div>
            <input
              id="wrap-amount"
              type="number"
              value={wrapAmount}
              onChange={(e) => setWrapAmount(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
              placeholder="0.0"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              You'll receive wEMARK tokens for voting and governance
            </p>
          </div>
          
          <div className={cn(
            "flex gap-3",
            isMobile ? "flex-col" : "flex-row"
          )}>
            <button
              onClick={handleWrap}
              disabled={isWrapping || !wrapAmount || parseFloat(wrapAmount) <= 0}
              className={cn(
                "flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium",
                isMobile ? "w-full" : "flex-1"
              )}
            >
              {isWrapping ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {wrapAmount ? "Approving & Wrapping..." : "Processing..."}
                </>
              ) : (
                <>
                  <LockIcon className="h-4 w-4 mr-2" />
                  Wrap $EMARK
                </>
              )}
            </button>
            
            <button
              onClick={handleClaimRewards}
              disabled={isClaimingRewards || !pendingRewards || pendingRewards === BigInt(0)}
              className={cn(
                "flex items-center justify-center px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium",
                isMobile ? "w-full" : "flex-1"
              )}
            >
              {isClaimingRewards ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Claiming...
                </>
              ) : (
                <>
                  <CoinsIcon className="h-4 w-4 mr-2" />
                  Claim Rewards
                </>
              )}
            </button>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-blue-800 leading-relaxed">
              <strong>Two-step process:</strong> First approve $EMARK spending, then wrap to receive wEMARK voting tokens.
            </p>
          </div>
        </div>
      )}
      
      {/* Unwrap Tab */}
      {activeTab === "unwrap" && (
        <div className="space-y-4">
          <div>
            <label htmlFor="unwrap-amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount to Unwrap (wEMARK)
            </label>
            <div className="text-xs text-gray-500 mb-2">
              Available: {wEmarkBalance ? toEther(wEmarkBalance) : "0"} wEMARK
            </div>
            <input
              id="unwrap-amount"
              type="number"
              value={unwrapAmount}
              onChange={(e) => setUnwrapAmount(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base"
              placeholder="0.0"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              You'll receive $EMARK back after the unbonding period
            </p>
          </div>
          
          <button
            onClick={handleRequestUnwrap}
            disabled={
              isUnwrapping || 
              !unwrapAmount || 
              parseFloat(unwrapAmount) <= 0 || 
              !totalWrapped || 
              toWei(unwrapAmount) > totalWrapped
            }
            className="w-full flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium touch-manipulation"
          >
            {isUnwrapping ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <UnlockIcon className="h-4 w-4 mr-2" />
                Request Unwrap
              </>
            )}
          </button>
          
          <p className="text-xs text-gray-500 leading-relaxed">
            Unwrapping requires a waiting period before your $EMARK tokens are available again.
          </p>
          
          {/* Pending Unbonding Request - Mobile optimized */}
          {unbondingAmount > BigInt(0) && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Pending Unbonding Request</h3>
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className={cn(
                  "flex justify-between",
                  isMobile ? "flex-col space-y-3" : "items-center"
                )}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-medium text-gray-900">
                      {toEther(unbondingAmount)} $EMARK
                    </p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <ClockIcon className="h-3 w-3 mr-1 flex-shrink-0" />
                      {isUnbondingReady() ? (
                        <span className="text-green-600 font-medium">Ready to claim</span>
                      ) : (
                        <span>
                          Ready {formatDistanceToNow(new Date(Number(unbondingReleaseTime) * 1000), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={cn(
                    "flex gap-2",
                    isMobile ? "w-full" : "flex-shrink-0"
                  )}>
                    {isUnbondingReady() ? (
                      <button
                        onClick={handleCompleteUnwrap}
                        disabled={isUnwrapping}
                        className={cn(
                          "px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50 font-medium touch-manipulation",
                          isMobile ? "flex-1" : ""
                        )}
                      >
                        Claim $EMARK
                      </button>
                    ) : (
                      <button
                        onClick={handleCancelUnbonding}
                        disabled={isUnwrapping}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 rounded touch-manipulation"
                        title="Cancel unbonding"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}