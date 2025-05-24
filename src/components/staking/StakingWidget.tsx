import React, { useState, useEffect } from "react";
import { toEther, toWei } from "thirdweb/utils";
import { LockIcon, UnlockIcon, CoinsIcon, AlertCircleIcon, CheckCircleIcon, ClockIcon, XIcon } from 'lucide-react';
import { useStaking } from "../../hooks/useStaking";
import { formatDistanceToNow } from "date-fns";
import { useRewards } from "../../hooks/useRewards";

interface StakingWidgetProps {
  userAddress?: string;
}

export function StakingWidget({ userAddress }: StakingWidgetProps) {
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"stake" | "unstake">("stake");
  
  const {
    totalStaked,
    availableVotingPower,
    unbondingRequests,
    isLoadingTotalStaked,
    isLoadingVotingPower,
    isLoadingUnbondingRequests,
    isProcessing,
    error: stakingError,
    success: stakingSuccess,
    stakeTokens,
    requestUnstake,
    completeUnstake,
    cancelUnbonding,
    clearMessages: clearStakingMessages
  } = useStaking(userAddress);
  
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
    if (stakingSuccess || stakingError) {
      const timer = setTimeout(() => clearStakingMessages(), 5000);
      return () => clearTimeout(timer);
    }
  }, [stakingSuccess, stakingError, clearStakingMessages]);
  
  useEffect(() => {
    if (rewardsSuccess || rewardsError) {
      const timer = setTimeout(() => clearRewardsMessages(), 5000);
      return () => clearTimeout(timer);
    }
  }, [rewardsSuccess, rewardsError, clearRewardsMessages]);
  
  const handleStake = async () => {
    if (!stakeAmount || parseFloat(stakeAmount) <= 0) return;
    const result = await stakeTokens(stakeAmount);
    if (result.success) {
      setStakeAmount("");
    }
  };
  
  const handleRequestUnstake = async () => {
    if (!unstakeAmount || parseFloat(unstakeAmount) <= 0) return;
    const result = await requestUnstake(unstakeAmount);
    if (result.success) {
      setUnstakeAmount("");
    }
  };
  
  const handleClaimRewards = async () => {
    await claimRewards();
  };
  
  const isUnbondingReady = (releaseTime: bigint) => {
    return Number(releaseTime) * 1000 <= Date.now();
  };
  
  if (!userAddress) {
    return null;
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-serif font-bold text-gray-900 mb-4">Staking & Rewards</h2>
      
      {/* Status Messages */}
      {(stakingError || rewardsError) && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircleIcon className="h-4 w-4 text-red-600 mr-2 flex-shrink-0" />
          <span className="text-red-700 text-sm">{stakingError || rewardsError}</span>
        </div>
      )}
      
      {(stakingSuccess || rewardsSuccess) && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
          <span className="text-green-700 text-sm">{stakingSuccess || rewardsSuccess}</span>
        </div>
      )}
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center">
            <LockIcon className="h-5 w-5 text-purple-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Total Staked</p>
              <p className="text-xl font-bold text-gray-900">
                {isLoadingTotalStaked ? "..." : toEther(totalStaked || BigInt(0))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center">
            <CoinsIcon className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Available Power</p>
              <p className="text-xl font-bold text-gray-900">
                {isLoadingVotingPower ? "..." : toEther(availableVotingPower || BigInt(0))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center">
            <CoinsIcon className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Pending Rewards</p>
              <p className="text-xl font-bold text-gray-900">
                {isLoadingRewards ? "..." : toEther(pendingRewards || BigInt(0))}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "stake"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("stake")}
        >
          Stake
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "unstake"
              ? "text-purple-600 border-b-2 border-purple-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("unstake")}
        >
          Unstake
        </button>
      </div>
      
      {/* Stake Tab */}
      {activeTab === "stake" && (
        <div className="space-y-4">
          <div>
            <label htmlFor="stake-amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount to Stake (NSI)
            </label>
            <input
              id="stake-amount"
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="0.0"
              min="0"
              step="0.01"
            />
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleStake}
              disabled={isProcessing || !stakeAmount || parseFloat(stakeAmount) <= 0}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <LockIcon className="h-4 w-4 mr-2" />
                  Stake Tokens
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
          
          <p className="text-xs text-gray-500">
            Staking tokens increases your voting power and earns you rewards over time.
          </p>
        </div>
      )}
      
      {/* Unstake Tab */}
      {activeTab === "unstake" && (
        <div className="space-y-4">
          <div>
            <label htmlFor="unstake-amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount to Unstake (NSI)
            </label>
            <input
              id="unstake-amount"
              type="number"
              value={unstakeAmount}
              onChange={(e) => setUnstakeAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="0.0"
              min="0"
              step="0.01"
            />
          </div>
          
          <button
            onClick={handleRequestUnstake}
            disabled={
              isProcessing || 
              !unstakeAmount || 
              parseFloat(unstakeAmount) <= 0 || 
              !totalStaked || 
              toWei(unstakeAmount) > totalStaked
            }
            className="w-full flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Processing...
              </>
            ) : (
              <>
                <UnlockIcon className="h-4 w-4 mr-2" />
                Request Unstake
              </>
            )}
          </button>
          
          <p className="text-xs text-gray-500">
            Unstaking requires a waiting period before your tokens are available again.
          </p>
          
          {/* Pending Unbonding Requests */}
          {!isLoadingUnbondingRequests && unbondingRequests && unbondingRequests.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Pending Unbonding Requests</h3>
              <div className="space-y-3">
                {unbondingRequests.map((request, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {toEther(request.amount)} NSI
                        </p>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {isUnbondingReady(request.releaseTime) ? (
                            <span className="text-green-600">Ready to claim</span>
                          ) : (
                            <span>
                              Ready {formatDistanceToNow(new Date(Number(request.releaseTime) * 1000), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {isUnbondingReady(request.releaseTime) ? (
                          <button
                            onClick={() => completeUnstake(index)}
                            disabled={isProcessing}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            Claim
                          </button>
                        ) : (
                          <button
                            onClick={() => cancelUnbonding(index)}
                            disabled={isProcessing}
                            className="p-1 text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
                            title="Cancel unbonding"
                          >
                            <XIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}