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
  AlertCircleIcon,
  TrendingUpIcon,
  DollarSignIcon,
  Coins
} from 'lucide-react';
import { useUserRewardsSummary, useCurrentPeriodInfo } from '../../hooks/useRewards';
import { formatEmark, formatEmarkWithSymbol, formatWEmarkWithSymbol } from '../../utils/formatters';
import { useWalletAuth } from '../../providers/WalletProvider';
import { toEther } from "thirdweb/utils";

interface RewardComponent {
  name: string;
  ethAmount: bigint;
  wethAmount: bigint;
  emarkAmount: bigint;
  description: string;
  icon: React.ReactNode;
  isLoading?: boolean;
}

export const RewardsCalculator: React.FC = () => {
  const { address, isConnected } = useWalletAuth();
  const [showDetails, setShowDetails] = useState(false);

  // Get all reward data from one hook (includes stakedAmount)
  const rewardsSummary = useUserRewardsSummary(address);
  const periodInfo = useCurrentPeriodInfo();

  // Extract data from new hook structure
  const {
    pendingRewards,
    pendingEthRewards, // This might be combined ETH+WETH, we'll need to separate
    pendingEmarkRewards,
    stakedAmount,
    periodEthRewards, // This might be combined ETH+WETH, we'll need to separate
    periodEmarkRewards,
    isLoadingRewards,
    authInfo
  } = rewardsSummary;

  const effectiveAddress = address || authInfo?.effectiveUserAddress || undefined;

  // Calculate current "week" from period data
  const currentWeek = useMemo(() => {
    if (!periodInfo.periodStart || periodInfo.periodStart === 0) return 1;
    
    // Calculate week number from period start (rough approximation)
    const weeksSinceStart = Math.floor((periodInfo.periodStart - 1704067200) / (7 * 24 * 60 * 60));
    return Math.max(1, weeksSinceStart + 1);
  }, [periodInfo.periodStart]);

  const displayWeek = periodInfo.isLoading ? 'Loading...' : currentWeek;

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

  // Use stakedAmount from rewards hook instead of duplicate CardCatalog query
  const actualWEmarkBalance = BigInt(stakedAmount || 0);
  const actualDelegatedPower = BigInt(delegatedPower || 0);
  const availablePower = actualWEmarkBalance > actualDelegatedPower ? 
    actualWEmarkBalance - actualDelegatedPower : BigInt(0);

  // ✅ TODO: Separate ETH and WETH rewards when contract supports it
  // For now, assuming pendingEthRewards includes both ETH and WETH
  // You may need to add separate contract calls for ETH vs WETH rewards
  const safePendingEthRewards = pendingEthRewards || BigInt(0);
  const safePendingWethRewards = BigInt(0); // TODO: Get separate WETH rewards
  const safePendingEmarkRewards = pendingEmarkRewards || BigInt(0);
  const safePeriodEthRewards = periodEthRewards || BigInt(0);
  const safePeriodWethRewards = BigInt(0); // TODO: Get separate WETH period rewards
  const safePeriodEmarkRewards = periodEmarkRewards || BigInt(0);

  // ✅ CALCULATE: Separate ETH, WETH, and EMARK totals
  const totalEthRewards = safePendingEthRewards + safePeriodEthRewards;
  const totalWethRewards = safePendingWethRewards + safePeriodWethRewards;
  const totalEmarkRewards = safePendingEmarkRewards + safePeriodEmarkRewards;

  // Check if rewards are funded and if user has staked balance
  const hasEthRewards = totalEthRewards > BigInt(0);
  const hasWethRewards = totalWethRewards > BigInt(0);
  const hasEmarkRewards = totalEmarkRewards > BigInt(0);
  const hasAnyRewards = hasEthRewards || hasWethRewards || hasEmarkRewards;
  const hasStakedBalance = actualWEmarkBalance > BigInt(0);

  // ✅ SEPARATED: Calculate time-based projections for each token
  const secondsInPeriod = periodInfo.periodEnd - periodInfo.periodStart;
  const secondsInWeek = 7 * 24 * 60 * 60;
  const secondsInMonth = 30 * 24 * 60 * 60;
  const secondsInYear = 365 * 24 * 60 * 60;
  
  const weeklyMultiplier = secondsInPeriod > 0 ? secondsInWeek / secondsInPeriod : 1;
  const monthlyMultiplier = secondsInPeriod > 0 ? secondsInMonth / secondsInPeriod : 1;
  const yearlyMultiplier = secondsInPeriod > 0 ? secondsInYear / secondsInPeriod : 1;

  // ✅ ETH Projections
  const weeklyEthRewards = totalEthRewards * BigInt(Math.floor(weeklyMultiplier));
  const monthlyEthRewards = totalEthRewards * BigInt(Math.floor(monthlyMultiplier));
  const yearlyEthRewards = totalEthRewards * BigInt(Math.floor(yearlyMultiplier));

  // ✅ WETH Projections
  const weeklyWethRewards = totalWethRewards * BigInt(Math.floor(weeklyMultiplier));
  const monthlyWethRewards = totalWethRewards * BigInt(Math.floor(monthlyMultiplier));
  const yearlyWethRewards = totalWethRewards * BigInt(Math.floor(yearlyMultiplier));

  // ✅ EMARK Projections  
  const weeklyEmarkRewards = totalEmarkRewards * BigInt(Math.floor(weeklyMultiplier));
  const monthlyEmarkRewards = totalEmarkRewards * BigInt(Math.floor(monthlyMultiplier));
  const yearlyEmarkRewards = totalEmarkRewards * BigInt(Math.floor(yearlyMultiplier));

  // ✅ Format amounts separately
  const ethFormatted = {
    weekly: formatEmark(weeklyEthRewards, 4),
    monthly: formatEmark(monthlyEthRewards, 4),
    yearly: formatEmark(yearlyEthRewards, 4)
  };

  const wethFormatted = {
    weekly: formatEmark(weeklyWethRewards, 4),
    monthly: formatEmark(monthlyWethRewards, 4),
    yearly: formatEmark(yearlyWethRewards, 4)
  };

  const emarkFormatted = {
    weekly: formatEmark(weeklyEmarkRewards, 4),
    monthly: formatEmark(monthlyEmarkRewards, 4),
    yearly: formatEmark(yearlyEmarkRewards, 4)
  };

  // ✅ Calculate separate APRs (Annual Percentage Rate in native tokens)
  const ethAPR = actualWEmarkBalance > BigInt(0) && ethFormatted.yearly
    ? ((parseFloat(ethFormatted.yearly) / parseFloat(formatEmark(actualWEmarkBalance, 6) || '1')) * 100)
    : 0;

  const wethAPR = actualWEmarkBalance > BigInt(0) && wethFormatted.yearly
    ? ((parseFloat(wethFormatted.yearly) / parseFloat(formatEmark(actualWEmarkBalance, 6) || '1')) * 100)
    : 0;

  const emarkAPR = actualWEmarkBalance > BigInt(0) && emarkFormatted.yearly
    ? ((parseFloat(emarkFormatted.yearly) / parseFloat(formatEmark(actualWEmarkBalance, 6) || '1')) * 100)
    : 0;

  // ✅ UPDATED: Reward components showing three separate amounts
  const rewardComponents: RewardComponent[] = [
    {
      name: 'ETH Rewards',
      ethAmount: totalEthRewards,
      wethAmount: BigInt(0),
      emarkAmount: BigInt(0),
      description: `From ${formatWEmarkWithSymbol(actualWEmarkBalance, 2)} staked`,
      icon: <DollarSignIcon className="h-4 w-4 text-gray-800" />,
      isLoading: isLoadingRewards
    },
    {
      name: 'WETH Rewards',
      ethAmount: BigInt(0),
      wethAmount: totalWethRewards,
      emarkAmount: BigInt(0),
      description: `From ${formatWEmarkWithSymbol(actualWEmarkBalance, 2)} staked`,
      icon: <CoinsIcon className="h-4 w-4 text-blue-600" />,
      isLoading: isLoadingRewards
    },
    {
      name: 'EMARK Token Rewards',
      ethAmount: BigInt(0),
      wethAmount: BigInt(0),
      emarkAmount: totalEmarkRewards,
      description: `From ${formatWEmarkWithSymbol(actualWEmarkBalance, 2)} staked`,
      icon: <CoinsIcon className="h-4 w-4 text-purple-600" />,
      isLoading: isLoadingRewards
    },
    {
      name: 'Voting Power Used',
      ethAmount: BigInt(0),
      wethAmount: BigInt(0),
      emarkAmount: BigInt(0),
      description: `${actualWEmarkBalance > BigInt(0) ? 
        ((Number(actualDelegatedPower) / Number(actualWEmarkBalance)) * 100).toFixed(1) : '0.0'}% voting power delegated`,
      icon: <VoteIcon className="h-4 w-4 text-green-600" />,
      isLoading: isLoadingRewards
    }
  ];

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

      {/* ✅ THREE-COLUMN: ETH, WETH, EMARK reward display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* ETH Rewards Column */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center mb-3">
            <DollarSignIcon className="h-5 w-5 text-gray-700 mr-2" />
            <h4 className="font-medium text-gray-900">ETH Rewards</h4>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Weekly:</span>
              <span className="font-bold text-gray-900">
                {isLoading ? "Loading..." : `${ethFormatted.weekly || '0.00'} ETH`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Monthly:</span>
              <span className="font-bold text-gray-900">
                {isLoading ? "Loading..." : `${ethFormatted.monthly || '0.00'} ETH`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-700">Yearly:</span>
              <span className="font-bold text-gray-900">
                {isLoading ? "Loading..." : `${ethFormatted.yearly || '0.00'} ETH`}
              </span>
            </div>
            <div className="pt-2 border-t border-gray-200">
              <div className="flex justify-between">
                <span className="text-sm text-gray-700">APR:</span>
                <span className="font-bold text-gray-900">
                  {isLoading ? "Loading..." : ethAPR > 0 ? `${ethAPR.toFixed(2)}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* WETH Rewards Column */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center mb-3">
            <CoinsIcon className="h-5 w-5 text-blue-600 mr-2" />
            <h4 className="font-medium text-blue-900">WETH Rewards</h4>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-blue-700">Weekly:</span>
              <span className="font-bold text-blue-900">
                {isLoading ? "Loading..." : `${wethFormatted.weekly || '0.00'} WETH`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-blue-700">Monthly:</span>
              <span className="font-bold text-blue-900">
                {isLoading ? "Loading..." : `${wethFormatted.monthly || '0.00'} WETH`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-blue-700">Yearly:</span>
              <span className="font-bold text-blue-900">
                {isLoading ? "Loading..." : `${wethFormatted.yearly || '0.00'} WETH`}
              </span>
            </div>
            <div className="pt-2 border-t border-blue-200">
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">APR:</span>
                <span className="font-bold text-blue-900">
                  {isLoading ? "Loading..." : wethAPR > 0 ? `${wethAPR.toFixed(2)}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* EMARK Rewards Column */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center mb-3">
            <CoinsIcon className="h-5 w-5 text-purple-600 mr-2" />
            <h4 className="font-medium text-purple-900">$EMARK Rewards</h4>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-purple-700">Weekly:</span>
              <span className="font-bold text-purple-900">
                {isLoading ? "Loading..." : `${emarkFormatted.weekly || '0.00'} EMARK`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-purple-700">Monthly:</span>
              <span className="font-bold text-purple-900">
                {isLoading ? "Loading..." : `${emarkFormatted.monthly || '0.00'} EMARK`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-purple-700">Yearly:</span>
              <span className="font-bold text-purple-900">
                {isLoading ? "Loading..." : `${emarkFormatted.yearly || '0.00'} EMARK`}
              </span>
            </div>
            <div className="pt-2 border-t border-purple-200">
              <div className="flex justify-between">
                <span className="text-sm text-purple-700">APR:</span>
                <span className="font-bold text-purple-900">
                  {isLoading ? "Loading..." : emarkAPR > 0 ? `${emarkAPR.toFixed(2)}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ UPDATED: Breakdown showing individual amounts */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">
          {hasAnyRewards ? 'Live Reward Breakdown' : 'Potential Reward Structure'}
        </h4>
        {rewardComponents.map((component, index) => {
          const ethAmount = formatEmark(component.ethAmount, 4);
          const wethAmount = formatEmark(component.wethAmount, 4);
          const emarkAmount = formatEmark(component.emarkAmount, 4);
          
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
                  <div className="space-y-1">
                    {component.ethAmount > BigInt(0) && (
                      <p className="text-sm font-bold text-gray-900">
                        {ethAmount || '0.00'} ETH
                      </p>
                    )}
                    {component.wethAmount > BigInt(0) && (
                      <p className="text-sm font-bold text-blue-900">
                        {wethAmount || '0.00'} WETH
                      </p>
                    )}
                    {component.emarkAmount > BigInt(0) && (
                      <p className="text-sm font-bold text-purple-900">
                        {emarkAmount || '0.00'} EMARK
                      </p>
                    )}
                    {!hasAnyRewards && hasStakedBalance && component.name !== 'Voting Power Used' && (
                      <p className="text-xs text-amber-600">
                        Ready to earn
                      </p>
                    )}
                  </div>
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
                <strong>Pending WETH:</strong> {toEther(safePendingWethRewards)} WETH
              </div>
              <div>
                <strong>Pending EMARK:</strong> {toEther(safePendingEmarkRewards)} $EMARK
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="text-sm font-medium text-green-900 mb-2">How the Triple-Token Rewards Work</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• <strong>Stake $EMARK:</strong> Convert liquid $EMARK to wEMARK to earn from ETH, WETH, and $EMARK pools</li>
              <li>• <strong>Triple rewards:</strong> Earn ETH, WETH, and $EMARK tokens based on your wEMARK stake</li>
              <li>• <strong>Separate pools:</strong> Each token type has its own funding and reward rate</li>
              <li>• <strong>Individual APRs:</strong> Each token type has its own annual percentage rate in native tokens</li>
            </ul>
          </div>

          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h4 className="text-sm font-medium text-amber-900 mb-2">APR Calculations</h4>
            <div className="text-sm text-amber-800 space-y-2">
              <div><strong>ETH APR:</strong> (Yearly ETH rewards / wEMARK balance) × 100</div>
              <div><strong>WETH APR:</strong> (Yearly WETH rewards / wEMARK balance) × 100</div>
              <div><strong>EMARK APR:</strong> (Yearly EMARK rewards / wEMARK balance) × 100</div>
              <div><strong>Note:</strong> All APRs are calculated in native tokens. ETH and WETH are nearly equivalent in value.</div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ UPDATED: Triple-token overview */}
      <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 via-blue-50 via-purple-50 to-indigo-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-900 font-medium">
              {hasAnyRewards ? 'Total Triple-Token Yield' : 'Potential Total Yield'}
            </p>
            <p className="text-xs text-gray-600 mt-1">Combined ETH + WETH + EMARK rewards from your wEMARK stake</p>
          </div>
          <div className="text-right">
            <div className="space-y-1">
              {ethAPR > 0 && (
                <p className="text-sm font-bold text-gray-900">
                  {ethAPR.toFixed(2)}% ETH APR
                </p>
              )}
              {wethAPR > 0 && (
                <p className="text-sm font-bold text-blue-900">
                  {wethAPR.toFixed(2)}% WETH APR
                </p>
              )}
              {emarkAPR > 0 && (
                <p className="text-sm font-bold text-purple-900">
                  {emarkAPR.toFixed(2)}% EMARK APR
                </p>
              )}
              {!hasAnyRewards && hasStakedBalance && (
                <p className="text-sm text-gray-600">Ready to earn</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Update Notice */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600 text-center">
          💡 <strong>Live Data:</strong> {hasAnyRewards ? 
            'All calculations use real-time data from mainnet contracts.' :
            'Ready to calculate rewards when reward pools are funded.'
          } APRs shown in native tokens. {ethAPR === 0 && wethAPR === 0 && emarkAPR === 0 ? 'Fund pools to see live rates.' : 'Each token pool can be funded independently.'}
        </p>
      </div>
    </div>
  );
};