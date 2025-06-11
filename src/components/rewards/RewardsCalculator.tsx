import React, { useState } from 'react';
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
} from 'lucide-react';
import { useRewardsDisplay } from '../../hooks/useRewardsDisplay';
import { formatEmarkWithSymbol, formatWEmarkWithSymbol } from '../../utils/formatters';
import { useWalletAuth } from '../../providers/WalletProvider';
import { toEther } from "thirdweb/utils";

export const RewardsCalculator: React.FC = () => {
  const { address, isConnected } = useWalletAuth();
  const [showDetails, setShowDetails] = useState(false);

  // 🔧 SIMPLIFIED: Use shared rewards calculation hook for dual-token system
  const {
    current,
    projections,
    apr,
    period,
    user,
    format,
    isLoading,
    error,
  } = useRewardsDisplay(address);

  // Get additional user data
  const emarkContract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.EMARK_TOKEN,
    abi: EMARK_TOKEN_ABI,
  });

  const cardCatalogContract = getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.CARD_CATALOG,
    abi: CARD_CATALOG_ABI,
  });

  const { data: emarkBalance } = useReadContract({
    contract: emarkContract,
    method: "balanceOf",
    params: [address || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!address,
    },
  });

  const { data: delegatedPower } = useReadContract({
    contract: cardCatalogContract,
    method: "getDelegatedVotingPower",
    params: [address || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!address,
    },
  });

  // 🔧 FIXED: Calculate current period starting from 0 (resets on Sundays)
  const calculateCurrentPeriod = () => {
    if (period.timeUntilRebalance <= 0) return 'Loading...';
    
    // Get current time
    const now = new Date();
    
    // Find the most recent Sunday (start of current week) at 00:00:00 UTC
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const mostRecentSunday = new Date(now);
    mostRecentSunday.setUTCDate(now.getUTCDate() - dayOfWeek);
    mostRecentSunday.setUTCHours(0, 0, 0, 0);
    
    // Calculate weeks since the reference Sunday
    const referenceTimestamp = Math.floor(mostRecentSunday.getTime() / 1000);
    const currentTimestamp = Math.floor(now.getTime() / 1000);
    const weeksSinceReference = Math.floor((currentTimestamp - referenceTimestamp) / (7 * 24 * 60 * 60));
    
    return weeksSinceReference;
  };

  const currentWeek = calculateCurrentPeriod();

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

  const actualDelegatedPower = BigInt(delegatedPower || 0);
  const availablePower = user.stakedAmount > 0 && actualDelegatedPower > 0 ? 
    Math.max(0, user.stakedAmount - parseFloat(toEther(actualDelegatedPower))) : user.stakedAmount;

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
      {!current.hasClaimableRewards && user.stakedAmount > 0 && (
        <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
          <div className="flex items-center">
            <AlertCircleIcon className="h-4 w-4 text-amber-600 mr-2" />
            <p className="text-sm text-amber-800">
              <strong>Rewards accumulating.</strong> You have wEMARK staked and earning rewards each period!
            </p>
          </div>
        </div>
      )}

      {user.stakedAmount === 0 && (
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
          <strong>Period {currentWeek}:</strong> {current.hasClaimableRewards ? 
            'Rewards calculated from live contract data' : 
            'Ready for rewards when pools are funded'
          }
          {period.timeUntilRebalance > 0 && (
            <span className="ml-2">
              ({Math.floor(period.timeUntilRebalance / 3600)}h until next rebalance)
            </span>
          )}
        </p>
      </div>

      {/* 🔧 SIMPLIFIED: Two-column reward display (WETH + EMARK only) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
                {isLoading ? "Loading..." : `${projections.eth.weekly.toFixed(6)} WETH`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-blue-700">Monthly:</span>
              <span className="font-bold text-blue-900">
                {isLoading ? "Loading..." : `${projections.eth.monthly.toFixed(6)} WETH`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-blue-700">Yearly:</span>
              <span className="font-bold text-blue-900">
                {isLoading ? "Loading..." : `${projections.eth.yearly.toFixed(6)} WETH`}
              </span>
            </div>
            <div className="pt-2 border-t border-blue-200">
              <div className="flex justify-between">
                <span className="text-sm text-blue-700">APR:</span>
                <span className="font-bold text-blue-900">
                  {isLoading ? "Loading..." : apr.eth > 0 ? `${format.ethAPR()}%` : 'N/A'}
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
                {isLoading ? "Loading..." : `${projections.emark.weekly.toFixed(4)} EMARK`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-purple-700">Monthly:</span>
              <span className="font-bold text-purple-900">
                {isLoading ? "Loading..." : `${projections.emark.monthly.toFixed(4)} EMARK`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-purple-700">Yearly:</span>
              <span className="font-bold text-purple-900">
                {isLoading ? "Loading..." : `${projections.emark.yearly.toFixed(4)} EMARK`}
              </span>
            </div>
            <div className="pt-2 border-t border-purple-200">
              <div className="flex justify-between">
                <span className="text-sm text-purple-700">APR:</span>
                <span className="font-bold text-purple-900">
                  {isLoading ? "Loading..." : apr.emark > 0 ? `${format.emarkAPR()}%` : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔧 SIMPLIFIED: Breakdown using dual-token calculations */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">
          {current.hasClaimableRewards ? 'Live Reward Breakdown' : 'Potential Reward Structure'}
        </h4>
        
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <CoinsIcon className="h-4 w-4 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">WETH Rewards</p>
              <p className="text-xs text-gray-600">From {format.stakedAmount()} wEMARK staked</p>
            </div>
          </div>
          <div className="text-right">
            {isLoading ? (
              <div className="flex items-center">
                <RefreshCwIcon className="h-3 w-3 text-gray-400 animate-spin mr-1" />
                <span className="text-xs text-gray-500">Loading...</span>
              </div>
            ) : (
              <p className="text-sm font-bold text-blue-900">
                {format.ethRewards(6)} WETH
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <CoinsIcon className="h-4 w-4 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">EMARK Token Rewards</p>
              <p className="text-xs text-gray-600">From {format.stakedAmount()} wEMARK staked</p>
            </div>
          </div>
          <div className="text-right">
            {isLoading ? (
              <div className="flex items-center">
                <RefreshCwIcon className="h-3 w-3 text-gray-400 animate-spin mr-1" />
                <span className="text-xs text-gray-500">Loading...</span>
              </div>
            ) : (
              <p className="text-sm font-bold text-purple-900">
                {format.emarkRewards(4)} EMARK
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <VoteIcon className="h-4 w-4 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">Voting Power Used</p>
              <p className="text-xs text-gray-600">
                {user.stakedAmount > 0 ? 
                  ((parseFloat(toEther(actualDelegatedPower)) / user.stakedAmount) * 100).toFixed(1) : '0.0'}% voting power delegated
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">
              {((parseFloat(toEther(actualDelegatedPower)) / Math.max(user.stakedAmount, 1)) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
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
                <strong>Staked (wEMARK):</strong> {format.stakedAmount()} wEMARK
              </div>
              <div>
                <strong>Delegated Power:</strong> {formatWEmarkWithSymbol(actualDelegatedPower, 2)}
              </div>
              <div>
                <strong>Available Power:</strong> {availablePower.toFixed(2)} wEMARK
              </div>
              <div>
                <strong>Current Period:</strong> {currentWeek}
              </div>
              <div>
                <strong>Period Progress:</strong> {period.periodProgress.toFixed(1)}%
              </div>
              <div>
                <strong>Pending WETH:</strong> {format.ethRewards()} WETH
              </div>
              <div>
                <strong>Pending EMARK:</strong> {format.emarkRewards()} $EMARK
              </div>
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h4 className="text-sm font-medium text-green-900 mb-2">How the Dual-Token Rewards Work</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• <strong>Stake $EMARK:</strong> Convert liquid $EMARK to wEMARK to earn from both WETH and $EMARK pools</li>
              <li>• <strong>Dual rewards:</strong> Earn WETH and $EMARK tokens based on your wEMARK stake</li>
              <li>• <strong>Separate pools:</strong> Each token type has its own funding and reward rate</li>
              <li>• <strong>Individual APRs:</strong> Each token type has its own annual percentage rate</li>
            </ul>
          </div>
        </div>
      )}

      {/* Dual-token overview */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-900 font-medium">
              {current.hasClaimableRewards ? 'Total Dual-Token Yield' : 'Potential Total Yield'}
            </p>
            <p className="text-xs text-gray-600 mt-1">Combined WETH + EMARK rewards from your wEMARK stake</p>
          </div>
          <div className="text-right">
            <div className="space-y-1">
              {apr.eth > 0 && (
                <p className="text-sm font-bold text-blue-900">
                  {format.ethAPR()}% WETH APR
                </p>
              )}
              {apr.emark > 0 && (
                <p className="text-sm font-bold text-purple-900">
                  {format.emarkAPR()}% EMARK APR
                </p>
              )}
              {!current.hasClaimableRewards && user.stakedAmount > 0 && (
                <p className="text-sm text-gray-600">Ready to earn</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Update Notice */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-600 text-center">
          💡 <strong>Live Data:</strong> {current.hasClaimableRewards ? 
            'All calculations use real-time data from mainnet contracts.' :
            'Ready to calculate rewards when reward pools are funded.'
          } APRs shown in native tokens. {apr.eth === 0 && apr.emark === 0 ? 'Fund pools to see live rates.' : 'Dual-token pools funded independently.'}
        </p>
      </div>
    </div>
  );
};