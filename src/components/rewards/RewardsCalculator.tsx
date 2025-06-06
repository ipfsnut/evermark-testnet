import React, { useState, useMemo } from 'react';
import { useReadContract } from "thirdweb/react";
import { getContract } from "thirdweb";
import { client } from "../../lib/thirdweb";
import { CHAIN, CONTRACTS, EMARK_TOKEN_ABI, CARD_CATALOG_ABI } from "../../lib/contracts";
import {
  CalculatorIcon,
  CoinsIcon,
  InfoIcon,
  LockIcon,
  VoteIcon,
  RefreshCwIcon,
  AlertCircleIcon
} from 'lucide-react';
import { useUserRewardsSummary, useCurrentPeriodInfo } from '../../hooks/useRewards';
import { formatEmark, formatEmarkWithSymbol, formatWEmarkWithSymbol } from '../../utils/formatters';
import { useWalletAuth } from '../../providers/WalletProvider';
import { toEther } from "thirdweb/utils";

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
  const [showDetails, setShowDetails] = useState(false);

  // ✅ SIMPLIFIED: Get all reward data from one hook (includes stakedAmount)
  const rewardsSummary = useUserRewardsSummary(address);
  const periodInfo = useCurrentPeriodInfo();

  // ✅ FIXED: Extract data from new hook structure
  const {
    pendingRewards,
    pendingEthRewards,
    pendingEmarkRewards,
    stakedAmount,
    periodEthRewards,
    periodEmarkRewards,
    isLoadingRewards,
    authInfo
  } = rewardsSummary;

  const effectiveAddress = address || authInfo?.effectiveUserAddress || undefined;

  // ✅ FIXED: Calculate current "week" from period data
  const currentWeek = useMemo(() => {
    if (!periodInfo.periodStart || periodInfo.periodStart === 0) return 1;
    
    // Calculate week number from period start (rough approximation)
    const weeksSinceStart = Math.floor((periodInfo.periodStart - 1704067200) / (7 * 24 * 60 * 60));
    return Math.max(1, weeksSinceStart + 1);
  }, [periodInfo.periodStart]);

  const displayWeek = periodInfo.isLoading ? 'Loading...' : currentWeek;

  // Get contracts (only need CardCatalog for delegation info now)
  const emarkContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.EMARK_TOKEN,
    abi: EMARK_TOKEN_ABI,
  }), []);

  const cardCatalogContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.CARD_CATALOG,
    abi: CARD_CATALOG_ABI,
  }), []);

  // Get user's liquid $EMARK balance
  const { data: emarkBalance } = useReadContract({
    contract: emarkContract,
    method: "balanceOf",
    params: [effectiveAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveAddress,
    },
  });

  // ✅ REMOVED: We get stakedAmount from rewards hook, no need for duplicate query

  // Get delegation info from CardCatalog (stakedAmount comes from rewards hook)
  const { data: delegatedPower } = useReadContract({
    contract: cardCatalogContract,
    method: "getDelegatedVotingPower",
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

  // ✅ FIXED: Use stakedAmount from rewards hook instead of duplicate CardCatalog query
  const actualWEmarkBalance = BigInt(stakedAmount || 0);
  const actualDelegatedPower = BigInt(delegatedPower || 0);
  const availablePower = actualWEmarkBalance > actualDelegatedPower ? 
    actualWEmarkBalance - actualDelegatedPower : BigInt(0);

  // ✅ FIXED: Use new reward structure - current pending + period estimates
  const safePendingEthRewards = pendingEthRewards || BigInt(0);
  const safePendingEmarkRewards = pendingEmarkRewards || BigInt(0);
  const safePeriodEthRewards = periodEthRewards || BigInt(0);
  const safePeriodEmarkRewards = periodEmarkRewards || BigInt(0);

  // Check if rewards are funded and if user has staked balance
  const hasAnyRewards = safePendingEthRewards > BigInt(0) || safePendingEmarkRewards > BigInt(0) || 
                       safePeriodEthRewards > BigInt(0) || safePeriodEmarkRewards > BigInt(0);
  const hasStakedBalance = actualWEmarkBalance > BigInt(0);

  // ✅ FIXED: Use new reward structure with ETH + EMARK breakdown
  const rewardComponents: RewardComponent[] = [
    {
      name: 'WETH/ETH Rewards',
      amount: safePendingEthRewards + safePeriodEthRewards,
      multiplier: 1,
      description: `From ${formatWEmarkWithSymbol(actualWEmarkBalance, 2)} staked (WETH pool)`,
      icon: <LockIcon className="h-4 w-4 text-blue-600" />,
      isLoading: isLoadingRewards
    },
    {
      name: 'EMARK Token Rewards',
      amount: safePendingEmarkRewards + safePeriodEmarkRewards,
      multiplier: 1,
      description: `From ${formatWEmarkWithSymbol(actualWEmarkBalance, 2)} staked (EMARK pool)`,
      icon: <CoinsIcon className="h-4 w-4 text-purple-600" />,
      isLoading: isLoadingRewards
    },
    {
      name: 'Voting Power Used',
      amount: BigInt(0), // This is informational, not a reward
      multiplier: 1,
      description: `${actualWEmarkBalance > BigInt(0) ? 
        ((Number(actualDelegatedPower) / Number(actualWEmarkBalance)) * 100).toFixed(1) : '0.0'}% voting power delegated`,
      icon: <VoteIcon className="h-4 w-4 text-green-600" />,
      isLoading: isLoadingRewards
    }
  ];

  // ✅ FIXED: Calculate totals from both ETH and EMARK rewards
  const totalCurrentRewards = safePendingEthRewards + safePendingEmarkRewards;
  const totalPeriodRewards = safePeriodEthRewards + safePeriodEmarkRewards;
  const totalWeeklyEstimate = totalCurrentRewards + totalPeriodRewards;
  
  // ✅ FIXED: Convert to per-week basis since periods might be different lengths
  const secondsInPeriod = periodInfo.periodEnd - periodInfo.periodStart;
  const secondsInWeek = 7 * 24 * 60 * 60;
  const weeklyMultiplier = secondsInPeriod > 0 ? secondsInWeek / secondsInPeriod : 1;
  
  const finalWeeklyRewards = totalWeeklyEstimate * BigInt(Math.floor(weeklyMultiplier));
  const projectedMonthlyRewards = finalWeeklyRewards * BigInt(4);
  const projectedYearlyRewards = finalWeeklyRewards * BigInt(52);

  // Format amounts
  const weeklyFormatted = formatEmark(finalWeeklyRewards, 2);
  const monthlyFormatted = formatEmark(projectedMonthlyRewards, 2);
  const yearlyFormatted = formatEmark(projectedYearlyRewards, 2);

  // Calculate APY
  const effectiveAPY = actualWEmarkBalance > BigInt(0) && yearlyFormatted
    ? ((parseFloat(yearlyFormatted) / parseFloat(formatEmark(actualWEmarkBalance, 6) || '1')) * 100)
    : 0;

  const isLoading = periodInfo.isLoading || isLoadingRewards;

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

      {/* Status messages based on user state */}
      {!hasAnyRewards && hasStakedBalance && (
        <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-center">
            <AlertCircleIcon className="h-4 w-4 text-amber-600 mr-2" />
            <p className="text-sm text-amber-800">
              <strong>Rewards accumulating.</strong> You have wEMARK staked and earning rewards each period!
            </p>
          </div>
        </div>
      )}

      {!hasStakedBalance && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center">
            <InfoIcon className="h-4 w-4 text-blue-600 mr-2" />
            <p className="text-sm text-blue-800">
              <strong>Stake $EMARK to earn rewards.</strong> Convert your liquid $EMARK to wEMARK (wrapped $EMARK) to start earning.
            </p>
          </div>
        </div>
      )}

      {/* Current Period Info */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Period {displayWeek}:</strong> {hasAnyRewards ? 
            'Rewards calculated from live contract data' : 
            'Ready for rewards when pools are funded'
          }
          {periodInfo.timeUntilRebalance > 0 && (
            <span className="ml-2">
              ({Math.floor(periodInfo.timeUntilRebalance / 3600)}h until next rebalance)
            </span>
          )}
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
          <p className="text-xs text-gray-600 mt-1">Mixed tokens (ETH + $EMARK)</p>
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
          <p className="text-xs text-gray-600 mt-1">Mixed tokens (ETH + $EMARK)</p>
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
          <p className="text-xs text-gray-600 mt-1">Mixed tokens (ETH + $EMARK)</p>
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">
          {hasAnyRewards ? 'Live Reward Breakdown' : 'Potential Reward Structure'}
        </h4>
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
                ) : component.name === 'Voting Power Used' ? (
                  <p className="text-sm font-bold text-gray-900">
                    {((Number(actualDelegatedPower) / Math.max(Number(actualWEmarkBalance), 1)) * 100).toFixed(1)}%
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-bold text-gray-900">
                      {componentFormatted ? `${componentFormatted}` : '0.00'} 
                      {component.name.includes('WETH') ? ' ETH' : ' tokens'}
                    </p>
                    {!hasAnyRewards && hasStakedBalance && (
                      <p className="text-xs text-amber-600">
                        Ready to earn
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
            <h4 className="text-sm font-medium text-blue-900 mb-2">Your Token Balances & Period Info</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
              <div>
                <strong>Liquid $EMARK:</strong> {formatEmarkWithSymbol(emarkBalance, 2)}
              </div>
              <div>
                <strong>Staked (wEMARK):</strong> {formatWEmarkWithSymbol(actualWEmarkBalance, 2)}
                <span className="text-xs text-blue-600 ml-1">(from rewards contract)</span>
              </div>
              <div>
                <strong>Delegated Power:</strong> {formatWEmarkWithSymbol(actualDelegatedPower, 2)}
              </div>
              <div>
                <strong>Available Power:</strong> {formatWEmarkWithSymbol(availablePower, 2)}
              </div>
              <div>
                <strong>Current Period:</strong> {displayWeek}
              </div>
              <div>
                <strong>Period Progress:</strong> {rewardsSummary.periodProgress?.toFixed(1) || '0'}%
              </div>
              <div>
                <strong>Pending ETH:</strong> {toEther(safePendingEthRewards)} ETH
              </div>
              <div>
                <strong>Pending EMARK:</strong> {toEther(safePendingEmarkRewards)} $EMARK
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="text-sm font-medium text-green-900 mb-2">How the New Dual-Token Rewards Work</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• <strong>Stake $EMARK:</strong> Convert liquid $EMARK to wEMARK to earn from both ETH and $EMARK pools</li>
              <li>• <strong>Dual rewards:</strong> Earn both WETH/ETH and $EMARK tokens based on your wEMARK stake</li>
              <li>• <strong>Periodic rebalancing:</strong> Reward rates adjust automatically based on pool sizes</li>
              <li>• <strong>Simplified tracking:</strong> Rewards contract tracks your staked balance automatically</li>
            </ul>
          </div>

          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h4 className="text-sm font-medium text-amber-900 mb-2">Token Types Explained</h4>
            <div className="text-sm text-amber-800 space-y-2">
              <div><strong>$EMARK:</strong> Liquid token for transactions, minting, and trading</div>
              <div><strong>wEMARK:</strong> Staked $EMARK that earns dual rewards (ETH + $EMARK)</div>
              <div><strong>Process:</strong> Stake $EMARK → Get wEMARK → Earn ETH + $EMARK rewards</div>
            </div>
          </div>
        </div>
      )}

      {/* APY Display */}
      <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-purple-900 font-medium">
              {hasAnyRewards ? 'Current APY' : 'Potential APY'}
            </p>
            <p className="text-xs text-purple-700 mt-1">Based on wEMARK balance & dual-token rewards</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-purple-900">
              {isLoading ? (
                <RefreshCwIcon className="h-6 w-6 animate-spin" />
              ) : effectiveAPY > 0 ? (
                `${effectiveAPY.toFixed(1)}%`
              ) : hasStakedBalance ? (
                <span className="text-lg text-purple-600">Ready</span>
              ) : (
                'N/A'
              )}
            </p>
            {actualWEmarkBalance > BigInt(0) && (
              <p className="text-xs text-purple-700 mt-1">
                On {formatEmark(actualWEmarkBalance, 2)} wEMARK
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Real-time Update Notice */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600 text-center">
          💡 <strong>Live Data:</strong> {hasAnyRewards ? 
            'All calculations use real-time data from mainnet contracts.' :
            'Ready to calculate rewards when reward pools are funded.'
          } Stake $EMARK to get wEMARK and start earning dual-token rewards (ETH + $EMARK).
        </p>
      </div>
    </div>
  );
};