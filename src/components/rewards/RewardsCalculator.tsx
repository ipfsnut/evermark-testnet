import React, { useState, useMemo } from 'react';
import { useReadContract } from "thirdweb/react";
import { getContract } from "thirdweb";
import { client } from "../../lib/thirdweb";
import { CHAIN, CONTRACTS, REWARDS_ABI, EMARK_TOKEN_ABI, NFT_STAKING_ABI } from "../../lib/contracts";
import { useDelegationHistory } from '../../hooks/useDelegationHistory';
import {
  CalculatorIcon,
  CoinsIcon,
  TrendingUpIcon,
  InfoIcon,
  LockIcon,
  VoteIcon,
  ClockIcon,
  RefreshCwIcon
} from 'lucide-react';
import { useRewards } from '../../hooks/useRewards';
import { formatEmark, formatEmarkWithSymbol, formatWEmarkWithSymbol } from '../../utils/formatters';
import { useWalletAuth } from '../../providers/WalletProvider';

interface RewardComponent {
  name: string;
  amount: bigint;
  multiplier: number;
  description: string;
  icon: React.ReactNode;
  isLoading?: boolean;
}

export const RewardsCalculator: React.FC = () => {
  const { address, isConnected } = useWalletAuth();
  const { authInfo } = useRewards(address);
  const { delegationStats, getConsistencyBonus, currentCycle } = useDelegationHistory(address);
  const [showDetails, setShowDetails] = useState(false);

  const hasWalletAccess = !!address || authInfo?.hasWalletAccess;
  const effectiveAddress = address || authInfo?.effectiveUserAddress;

  // Get contracts
  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);

  const emarkContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.EMARK_TOKEN,
    abi: EMARK_TOKEN_ABI,
  }), []);

  const stakingContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.NFT_STAKING,
    abi: NFT_STAKING_ABI,
  }), []);

  // Get current week from rewards contract
  const { data: currentWeek, isLoading: isLoadingWeek } = useReadContract({
    contract: rewardsContract,
    method: "getCurrentWeek",
    params: [],
  });

  // Get user's wEMARK (staked EMARK) balance
  const { data: wEmarkBalance, isLoading: isLoadingStaked } = useReadContract({
    contract: stakingContract,
    method: "getUserStakedBalance",
    params: [effectiveAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveAddress,
    },
  });

  // Alternative: If the above method doesn't exist, try getting from user staking info
  const { data: userStakingInfo, isLoading: isLoadingNftStaking } = useReadContract({
    contract: stakingContract,
    method: "getUserStakingInfo",
    params: [effectiveAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveAddress,
    },
  });

  // Get user's regular EMARK balance (for display purposes)
  const { data: emarkBalance } = useReadContract({
    contract: emarkContract,
    method: "balanceOf",
    params: [effectiveAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveAddress,
    },
  });

  // Get user's projected rewards for current week
  const { data: projectedWeeklyRewards, isLoading: isLoadingProjected } = useReadContract({
    contract: rewardsContract,
    method: "calculateUserWeeklyRewards",
    params: [
      effectiveAddress || "0x0000000000000000000000000000000000000000",
      BigInt(currentWeek || 0)
    ],
    queryOptions: {
      enabled: !!effectiveAddress && !!currentWeek,
    },
  });

  // Get user's creator rewards from leaderboard
  const { data: creatorRewards, isLoading: isLoadingCreator } = useReadContract({
    contract: rewardsContract,
    method: "getUserCreatorRewards",
    params: [effectiveAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveAddress,
    },
  });

  // Handle wallet connection state
  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="text-center py-8">
          <CalculatorIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Rewards Calculator</h3>
          <p className="text-gray-600">
            Connect your wallet to calculate potential rewards
          </p>
        </div>
      </div>
    );
  }

  // Use the correct staked balance - prioritize direct staked balance, fallback to staking info
  const actualStakedBalance = wEmarkBalance || userStakingInfo?.totalStaked || BigInt(0);

  // Calculate reward components from real contract data
  const rewardComponents = useMemo((): RewardComponent[] => {
    const components: RewardComponent[] = [];

    // 1. wEMARK Staking Rewards (from projected weekly rewards)
    const stakingReward = projectedWeeklyRewards?.[0] || BigInt(0);
    components.push({
      name: 'wEMARK Staking Rewards',
      amount: stakingReward,
      multiplier: 1,
      description: `From ${formatWEmarkWithSymbol(actualStakedBalance, 2)}`,
      icon: <LockIcon className="h-4 w-4 text-purple-600" />,
      isLoading: isLoadingProjected || isLoadingStaked
    });

    // 2. Delegation/Voting Rewards (from projected weekly rewards)
    const delegationReward = projectedWeeklyRewards?.[1] || BigInt(0);
    components.push({
      name: 'Delegation Rewards',
      amount: delegationReward,
      multiplier: delegationStats.rewardMultiplier,
      description: `${delegationStats.delegationPercentage.toFixed(1)}% voting power used`,
      icon: <VoteIcon className="h-4 w-4 text-blue-600" />,
      isLoading: isLoadingProjected
    });

    // 3. NFT Staking Rewards (from projected weekly rewards)
    const nftReward = projectedWeeklyRewards?.[2] || BigInt(0);
    if (nftReward > BigInt(0)) {
      components.push({
        name: 'NFT Staking Rewards',
        amount: nftReward,
        multiplier: 1,
        description: `From ${userStakingInfo?.stakedCount || 0} staked NFTs`,
        icon: <TrendingUpIcon className="h-4 w-4 text-indigo-600" />,
        isLoading: isLoadingProjected || isLoadingNftStaking
      });
    }

    // 4. Creator Rewards (from leaderboard performance)
    const creatorAmount = creatorRewards || BigInt(0);
    if (creatorAmount > BigInt(0)) {
      components.push({
        name: 'Creator Rewards',
        amount: creatorAmount,
        multiplier: 1,
        description: 'From your Evermarks on the leaderboard',
        icon: <TrendingUpIcon className="h-4 w-4 text-amber-600" />,
        isLoading: isLoadingCreator
      });
    }

    // 5. Consistency Bonus (calculated from delegation history)
    const consistencyBonus = getConsistencyBonus();
    if (consistencyBonus > 0) {
      const bonusAmount = BigInt(Math.floor(Number(delegationReward) * consistencyBonus));
      components.push({
        name: 'Consistency Bonus',
        amount: bonusAmount,
        multiplier: 1 + consistencyBonus,
        description: `${(consistencyBonus * 100).toFixed(0)}% bonus for regular participation`,
        icon: <ClockIcon className="h-4 w-4 text-green-600" />
      });
    }

    return components;
  }, [
    projectedWeeklyRewards,
    actualStakedBalance,
    delegationStats,
    userStakingInfo,
    creatorRewards,
    getConsistencyBonus,
    isLoadingProjected,
    isLoadingStaked,
    isLoadingNftStaking,
    isLoadingCreator
  ]);

  // Calculate totals
  const totalWeeklyRewards = rewardComponents.reduce(
    (sum, component) => sum + component.amount,
    BigInt(0)
  );
  const projectedMonthlyRewards = totalWeeklyRewards * BigInt(4);
  const projectedYearlyRewards = totalWeeklyRewards * BigInt(52);

  // Format the amounts with proper decimals
  const weeklyFormatted = formatEmark(totalWeeklyRewards, 2);
  const monthlyFormatted = formatEmark(projectedMonthlyRewards, 2);
  const yearlyFormatted = formatEmark(projectedYearlyRewards, 2);

  // Calculate APY based on total staked value
  const totalStakedValue = actualStakedBalance + (userStakingInfo?.totalValue || BigInt(0));
  const effectiveAPY = totalStakedValue > BigInt(0) && yearlyFormatted
    ? ((parseFloat(yearlyFormatted) / parseFloat(formatEmark(totalStakedValue, 6) || '1')) * 100)
    : 0;

  const isLoading = isLoadingWeek || isLoadingProjected || isLoadingStaked;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <CalculatorIcon className="h-6 w-6 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">$EMARK Rewards Calculator</h3>
          {isLoading && (
            <RefreshCwIcon className="h-4 w-4 text-gray-400 ml-2 animate-spin" />
          )}
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="p-1 text-gray-500 hover:text-gray-700"
        >
          <InfoIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Current Week Info */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Week {currentWeek || 'Loading...'}:</strong> Rewards calculated from live contract data
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <CoinsIcon className="h-5 w-5 text-purple-600 mr-2" />
            <span className="text-sm text-purple-600 font-medium">Weekly</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {isLoading ? (
              <span className="text-lg">Loading...</span>
            ) : (
              weeklyFormatted || '0.00'
            )}
          </p>
          <p className="text-xs text-gray-600 mt-1">$EMARK tokens</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <CoinsIcon className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm text-blue-600 font-medium">Monthly</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {isLoading ? (
              <span className="text-lg">Loading...</span>
            ) : (
              monthlyFormatted || '0.00'
            )}
          </p>
          <p className="text-xs text-gray-600 mt-1">$EMARK tokens</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <CoinsIcon className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm text-green-600 font-medium">Yearly</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {isLoading ? (
              <span className="text-lg">Loading...</span>
            ) : (
              yearlyFormatted || '0.00'
            )}
          </p>
          <p className="text-xs text-gray-600 mt-1">$EMARK tokens</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Live Reward Breakdown</h4>
        {rewardComponents.map((component, index) => {
          const componentFormatted = formatEmark(component.amount, 4);
          return (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                {component.icon}
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{component.name}</p>
                  <p className="text-xs text-gray-600">{component.description}</p>
                </div>
              </div>
              <div className="text-right">
                {component.isLoading ? (
                  <div className="flex items-center">
                    <RefreshCwIcon className="h-3 w-3 text-gray-400 animate-spin mr-1" />
                    <span className="text-xs text-gray-500">Loading...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-bold text-gray-900">
                      {componentFormatted ? `${componentFormatted} $EMARK` : '0.00 $EMARK'}
                    </p>
                    {component.multiplier > 1 && (
                      <p className="text-xs text-purple-600">
                        {component.multiplier.toFixed(2)}x boost
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Contract Data Details */}
      {showDetails && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Live Contract Data</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
              <div>
                <strong>Liquid $EMARK:</strong> {formatEmarkWithSymbol(emarkBalance, 2)}
              </div>
              <div>
                <strong>Staked wEMARK:</strong> {formatWEmarkWithSymbol(actualStakedBalance, 2)}
              </div>
              <div>
                <strong>Staked NFTs:</strong> {userStakingInfo?.stakedCount || 0}
              </div>
              <div>
                <strong>Current Week:</strong> {currentWeek || 'Loading...'}
              </div>
              <div>
                <strong>Delegation %:</strong> {delegationStats.delegationPercentage.toFixed(1)}%
              </div>
              <div>
                <strong>Total Value:</strong> {formatEmarkWithSymbol(totalStakedValue, 2)}
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="text-sm font-medium text-green-900 mb-2">How to Maximize $EMARK Rewards</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• <strong>Stake $EMARK → wEMARK:</strong> Convert liquid tokens to staked wEMARK for rewards</li>
              <li>• <strong>Use all voting power:</strong> Get multipliers on delegation rewards</li>
              <li>• <strong>Vote consistently:</strong> Weekly participation adds consistency bonus</li>
              <li>• <strong>Create quality content:</strong> Earn from leaderboard placement</li>
              <li>• <strong>Stake NFTs:</strong> Earn based on votes your NFTs received</li>
              <li>• <strong>Compound rewards:</strong> Stake earned $EMARK for exponential growth</li>
            </ul>
          </div>

          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h4 className="text-sm font-medium text-amber-900 mb-2">Token Types Explained</h4>
            <div className="text-sm text-amber-800 space-y-2">
              <div><strong>$EMARK:</strong> Liquid token for transactions, minting, and trading</div>
              <div><strong>wEMARK:</strong> Wrapped/staked $EMARK that earns rewards but is locked</div>
              <div><strong>NFTs:</strong> Evermark NFTs that can be staked for additional rewards</div>
            </div>
          </div>
        </div>
      )}

      {/* APY Display */}
      <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-purple-900 font-medium">Effective APY</p>
            <p className="text-xs text-purple-700 mt-1">Based on wEMARK staking & activity</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-purple-900">
              {isLoading ? (
                <RefreshCwIcon className="h-6 w-6 animate-spin" />
              ) : effectiveAPY > 0 ? (
                `${effectiveAPY.toFixed(1)}%`
              ) : (
                'N/A'
              )}
            </p>
            {totalStakedValue > BigInt(0) && (
              <p className="text-xs text-purple-700 mt-1">
                On {formatEmark(totalStakedValue, 2)} total staked value
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Update Notice */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600 text-center">
          💡 <strong>Live Data:</strong> All calculations use real-time data from mainnet contracts.
          wEMARK represents your staked $EMARK position earning rewards.
        </p>
      </div>
    </div>
  );
};
