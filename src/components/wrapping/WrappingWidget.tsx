import { useState, useEffect } from "react";
import { toEther, toWei } from "thirdweb/utils";
import { LockIcon, UnlockIcon, CoinsIcon, AlertCircleIcon, CheckCircleIcon, ClockIcon, XIcon } from 'lucide-react';
import { useWrapping } from "../../hooks/useWrapping";
import { formatDistanceToNow } from "date-fns";
import { useRewards } from "../../hooks/useRewards";

interface WrappingWidgetProps {
  userAddress?: string;
}

export function WrappingWidget({ userAddress }: WrappingWidgetProps) {
  const [wrapAmount, setWrapAmount] = useState("");
  const [unwrapAmount, setUnwrapAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"wrap" | "unwrap">("wrap");
  
  const {
    totalWrapped,
    availableVotingPower,
    unbondingAmount,
    unbondingReleaseTime,
    canClaimUnbonding,
    isLoadingWrapped,
    isLoadingVotingPower,
    isLoadingUnbonding,
    isWrapping,
    isUnwrapping,
    error: wrappingError,
    success: wrappingSuccess,
    wrapTokens,
    requestUnwrap,
    completeUnwrap,
    cancelUnbonding,
    clearMessages: clearWrappingMessages
  } = useWrapping(userAddress);
  
  const {
    pendingRewards,
    isLoadingRewards,
    isClaimingRewards,
    error: rewardsError,
    success: rewardsSuccess,
    claimRewards,
    clearMessages: clearRewardsMessages
  } = useRewards(userAddress);
  
  // Clear messages after 5 seconds
  useEffect(() => {
    if (wrappingSuccess || wrappingError) {
      const timer = setTimeout(() => clearWrappingMessages(), 5000);
      return () => clearTimeout(timer);
    }
  }, [wrappingSuccess, wrappingError, clearWrappingMessages]);
  
  useEffect(() => {
    if (rewardsSuccess || rewardsError) {
      const timer = setTimeout(() => clearRewardsMessages(), 5000);
      return () => clearTimeout(timer);
    }
  }, [rewardsSuccess, rewardsError, clearRewardsMessages]);
  
  const handleWrap = async () => {
    if (!wrapAmount || parseFloat(wrapAmount) <= 0) return;
    try {
      await wrapTokens(toWei(wrapAmount));
      setWrapAmount("");
    } catch (error) {
      console.error("Wrap failed:", error);
    }
  };
  
  const handleRequestUnwrap = async () => {
    if (!unwrapAmount || parseFloat(unwrapAmount) <= 0) return;
    try {
      await requestUnwrap(toWei(unwrapAmount));
      setUnwrapAmount("");
    } catch (error) {
      console.error("Unwrap request failed:", error);
    }
  };
  
  const handleCompleteUnwrap = async () => {
    try {
      await completeUnwrap();
    } catch (error) {
      console.error("Complete unwrap failed:", error);
    }
  };
  
  const handleCancelUnbonding = async () => {
    try {
      await cancelUnbonding();
    } catch (error) {
      console.error("Cancel unbonding failed:", error);
    }
  };
  
  const handleClaimRewards = async () => {
    try {
      await claimRewards();
    } catch (error) {
      console.error("Claim rewards failed:", error);
    }
  };
  
  const isUnbondingReady = () => {
    return Number(unbondingReleaseTime) * 1000 <= Date.now();
  };
  
  if (!userAddress) {
    return null;
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-serif font-bold text-gray-900 mb-4">Wrapping & Rewards</h2>
      
      {/* Status Messages */}
      {(wrappingError || rewardsError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircleIcon className="h-4 w-4 text-red-600 mr-2 flex-shrink-0" />
          <span className="text-red-700 text-sm">{wrappingError || rewardsError}</span>
        </div>
      )}
      
      {(wrappingSuccess || rewardsSuccess) && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
          <span className="text-green-700 text-sm">{wrappingSuccess || rewardsSuccess}</span>
        </div>
      )}
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "wrap"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("wrap")}
        >
          Wrap
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "unwrap"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
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
            <input
              id="wrap-amount"
              type="number"
              value={wrapAmount}
              onChange={(e) => setWrapAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="0.0"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-gray-500 mt-1">
              You'll receive wEMARK tokens for voting and governance
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleWrap}
              disabled={isWrapping || !wrapAmount || parseFloat(wrapAmount) <= 0}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="flex-1 flex items-center justify-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            <p className="text-xs text-blue-800">
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
            <input
              id="unwrap-amount"
              type="number"
              value={unwrapAmount}
              onChange={(e) => setUnwrapAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="0.0"
              min="0"
              step="0.01"
            />
            <p className="text-xs text-gray-500 mt-1">
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
            className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          
          <p className="text-xs text-gray-500">
            Unwrapping requires a waiting period before your $EMARK tokens are available again.
          </p>
          
          {/* Pending Unbonding Request */}
          {!isLoadingUnbonding && unbondingAmount && unbondingAmount > BigInt(0) && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Pending Unbonding Request</h3>
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {toEther(unbondingAmount)} $EMARK
                    </p>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      {isUnbondingReady() ? (
                        <span className="text-green-600">Ready to claim</span>
                      ) : (
                        <span>
                          Ready {formatDistanceToNow(new Date(Number(unbondingReleaseTime) * 1000), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {isUnbondingReady() ? (
                      <button
                        onClick={handleCompleteUnwrap}
                        disabled={isUnwrapping}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        Claim $EMARK
                      </button>
                    ) : (
                      <button
                        onClick={handleCancelUnbonding}
                        disabled={isUnwrapping}
                        className="p-1 text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
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
