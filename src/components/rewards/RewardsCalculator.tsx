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
import { useRewards, useCurrentWeek, useUserWeeklyRewards } from '../../hooks/useRewards';
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
  const [showDetails, setShowDetails] = useState(false);

  const effectiveAddress = address || authInfo?.effectiveUserAddress || undefined;

  // ✅ FIXED: Get current week properly typed
  const { currentWeek, isLoading: isLoadingWeek } = useCurrentWeek();
  
  // ✅ FIXED: Ensure currentWeek is always number or undefined for hook
  const validCurrentWeek = useMemo(() => {
    if (!currentWeek || typeof currentWeek !== 'number') return undefined;
    
    // If currentWeek is a huge timestamp, convert it to a reasonable week number
    if (currentWeek > 1000000) {
      const weeksSinceStart = Math.floor((Date.now() / 1000 - 1640995200) / (7 * 24 * 60 * 60));
      return Math.max(1, weeksSinceStart);
    }
    
    return currentWeek;
  }, [currentWeek]);

  // ✅ FIXED: Display week for UI (can be string)
  const displayWeek = validCurrentWeek || 'Loading...';

  // Get contracts
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

  // Get user's wEMARK (staked $EMARK) from CardCatalog
  const { data: wEmarkBalance } = useReadContract({
    contract: cardCatalogContract,
    method: "balanceOf",
    params: [effectiveAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveAddress,
    },
  });

  // Get delegation info from CardCatalog
  const { data: delegatedPower } = useReadContract({
    contract: cardCatalogContract,
    method: "getDelegatedVotingPower",
    params: [effectiveAddress || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!effectiveAddress,
    },
  });

  // ✅ FIXED: Use validCurrentWeek (number | undefined) for the hook
  const { 
    baseRewards, 
    variableRewards,
    totalWeeklyRewards,
    isLoading: isLoadingProjected 
  } = useUserWeeklyRewards(effectiveAddress, validCurrentWeek);

  // ✅ FIXED: Ensure BigInt types with safe fallbacks
  const safeBaseRewards = baseRewards || BigInt(0);
  const safeVariableRewards = variableRewards || BigInt(0);
  const safeTotalWeeklyRewards = totalWeeklyRewards || BigInt(0);

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

  // ✅ FIXED: Ensure all values are proper bigint types
  const actualWEmarkBalance = BigInt(wEmarkBalance || 0);
  const actualDelegatedPower = BigInt(delegatedPower || 0);
  const availablePower = actualWEmarkBalance > actualDelegatedPower ? 
    actualWEmarkBalance - actualDelegatedPower : BigInt(0);

  // ✅ FIXED: Check if rewards are funded and if user has staked balance
  const hasAnyRewards = safeBaseRewards > BigInt(0) || safeVariableRewards > BigInt(0);
  const hasStakedBalance = actualWEmarkBalance > BigInt(0);

  // ✅ FIXED: Use safe BigInt values in reward components
  const rewardComponents: RewardComponent[] = [
    {
      name: 'Base Staking Rewards',
      amount: safeBaseRewards,
      multiplier: 1,
      description: `From ${formatWEmarkWithSymbol(actualWEmarkBalance, 2)} staked`,
      icon: <LockIcon className="h-4 w-4 text-purple-600" />,
      isLoading: isLoadingProjected
    },
    {
      name: 'Variable Delegation Rewards',
      amount: safeVariableRewards,
      multiplier: 1,
      description: `${actualWEmarkBalance > BigInt(0) ? 
        ((Number(actualDelegatedPower) / Number(actualWEmarkBalance)) * 100).toFixed(1) : '0.0'}% voting power delegated`,
      icon: <VoteIcon className="h-4 w-4 text-blue-600" />,
      isLoading: isLoadingProjected
    }
  ];

  // ✅ FIXED: Calculate totals with safe BigInt values
  const finalTotalWeeklyRewards = safeTotalWeeklyRewards > BigInt(0) ? 
    safeTotalWeeklyRewards : 
    rewardComponents.reduce((sum, component) => sum + component.amount, BigInt(0));
  
  const projectedMonthlyRewards = finalTotalWeeklyRewards * BigInt(4);
  const projectedYearlyRewards = finalTotalWeeklyRewards * BigInt(52);

  // Format amounts
  const weeklyFormatted = formatEmark(finalTotalWeeklyRewards, 2);
  const monthlyFormatted = formatEmark(projectedMonthlyRewards, 2);
  const yearlyFormatted = formatEmark(projectedYearlyRewards, 2);

  // Calculate APY
  const effectiveAPY = actualWEmarkBalance > BigInt(0) && yearlyFormatted
    ? ((parseFloat(yearlyFormatted) / parseFloat(formatEmark(actualWEmarkBalance, 6) || '1')) * 100)
    : 0;

  const isLoading = isLoadingWeek || isLoadingProjected;

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
              <strong>No rewards funded yet.</strong> You have wEMARK staked and ready to earn rewards once the reward pools are funded!
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

      {/* Current Week Info */}
      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800">
          <strong>Week {displayWeek}:</strong> {hasAnyRewards ? 
            'Rewards calculated from live contract data' : 
            'Ready for rewards when pools are funded'
          }
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
                ) : (
                  <>
                    <p className="text-sm font-bold text-gray-900">
                      {componentFormatted ? `${componentFormatted} $EMARK` : '0.00 $EMARK'}
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
            <h4 className="text-sm font-medium text-blue-900 mb-2">Your Token Balances</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
              <div>
                <strong>Liquid $EMARK:</strong> {formatEmarkWithSymbol(emarkBalance, 2)}
              </div>
              <div>
                <strong>Staked (wEMARK):</strong> {formatWEmarkWithSymbol(actualWEmarkBalance, 2)}
              </div>
              <div>
                <strong>Delegated Power:</strong> {formatWEmarkWithSymbol(actualDelegatedPower, 2)}
              </div>
              <div>
                <strong>Available Power:</strong> {formatWEmarkWithSymbol(availablePower, 2)}
              </div>
              <div>
                <strong>Current Week:</strong> {displayWeek}
              </div>
              <div>
                <strong>Delegation %:</strong> {actualWEmarkBalance > BigInt(0) ? 
                  ((Number(actualDelegatedPower) / Number(actualWEmarkBalance)) * 100).toFixed(1) : '0.0'}%
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="text-sm font-medium text-green-900 mb-2">How to Maximize $EMARK Rewards</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• <strong>Stake $EMARK:</strong> Convert liquid $EMARK to wEMARK to start earning rewards</li>
              <li>• <strong>Use voting power:</strong> Delegate your wEMARK to vote on Evermarks for variable rewards</li>
              <li>• <strong>Vote consistently:</strong> Regular participation can unlock bonus multipliers</li>
              <li>• <strong>Create quality content:</strong> Earn from leaderboard placement when you create popular Evermarks</li>
            </ul>
          </div>

          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h4 className="text-sm font-medium text-amber-900 mb-2">Token Types Explained</h4>
            <div className="text-sm text-amber-800 space-y-2">
              <div><strong>$EMARK:</strong> Liquid token for transactions, minting, and trading</div>
              <div><strong>wEMARK:</strong> Staked $EMARK that earns rewards (result of staking $EMARK)</div>
              <div><strong>Process:</strong> Stake $EMARK → Get wEMARK → Earn rewards on wEMARK balance</div>
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
            <p className="text-xs text-purple-700 mt-1">Based on wEMARK balance & delegation activity</p>
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
          } Stake $EMARK to get wEMARK and start earning.
        </p>
      </div>
    </div>
  );
};