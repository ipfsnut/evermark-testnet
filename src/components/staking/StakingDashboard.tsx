// src/components/staking/StakingDashboard.tsx
import React, { useState } from 'react';
import { useActiveAccount } from "thirdweb/react";
import { 
  CoinsIcon, 
  LockIcon, 
  TrendingUpIcon, 
  BookOpenIcon,
  CalculatorIcon,
  HistoryIcon,
  TabletIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InfoIcon
} from 'lucide-react';
import { StakingWidget } from './StakingWidget';
import { NFTStakingPanel } from './NFTStakingPanel';
import { RewardsCalculator } from '../rewards/RewardsCalculator';
import { DelegationHistory } from '../voting/DelegationHistory';
import { useStaking, useStakingStats } from '../../hooks/useStaking';
import { useRewards } from '../../hooks/useRewards';
import { useDelegationHistory } from '../../hooks/useDelegationHistory';
import { toEther } from 'thirdweb/utils';

interface StakingDashboardProps {
  userAddress: string;
  className?: string;
}

// Quick Stats Overview Component
const StakingStatsOverview: React.FC<{ userAddress: string }> = ({ userAddress }) => {
  const { totalStaked, availableVotingPower } = useStaking(userAddress);
  const { pendingRewards } = useRewards(userAddress);
  const { delegationStats } = useDelegationHistory(userAddress);
  const stakingStats = useStakingStats();

  const stats = [
    {
      label: 'Total Staked',
      value: toEther(totalStaked || BigInt(0)),
      suffix: 'WEMARK',
      icon: <LockIcon className="h-5 w-5 text-purple-600" />,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      label: 'Voting Power',
      value: toEther(availableVotingPower || BigInt(0)),
      suffix: 'WEMARK',
      icon: <CoinsIcon className="h-5 w-5 text-blue-600" />,
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
    },
    {
      label: 'Pending Rewards',
      value: toEther(pendingRewards || BigInt(0)),
      suffix: '$EMARK',
      icon: <TrendingUpIcon className="h-5 w-5 text-green-600" />,
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
    },
    {
      label: 'Delegation Usage',
      value: delegationStats.delegationPercentage.toFixed(1),
      suffix: '%',
      icon: <CalculatorIcon className="h-5 w-5 text-amber-600" />,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div key={index} className={`${stat.bgColor} p-4 rounded-lg border border-gray-200`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">{stat.label}</span>
            {stat.icon}
          </div>
          <div className="flex items-baseline">
            <span className={`text-2xl font-bold ${stat.textColor}`}>
              {stat.value}
            </span>
            <span className="text-sm text-gray-500 ml-1">{stat.suffix}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// Collapsible Section Component
const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  description?: string;
}> = ({ title, icon, children, defaultExpanded = false, description }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center">
          <div className="p-2 bg-gray-100 rounded-lg mr-3">
            {icon}
          </div>
          <div className="text-left">
            <h3 className="font-medium text-gray-900">{title}</h3>
            {description && (
              <p className="text-sm text-gray-600">{description}</p>
            )}
          </div>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};

// Main Staking Dashboard Component
export const StakingDashboard: React.FC<StakingDashboardProps> = ({ 
  userAddress, 
  className = '' 
}) => {
  const account = useActiveAccount();
  const stakingStats = useStakingStats();

  if (!account || !userAddress) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 border border-gray-200 ${className}`}>
        <div className="text-center py-8">
          <LockIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Staking Dashboard</h3>
          <p className="text-gray-600">Connect your wallet to access staking features</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Dashboard Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Staking Dashboard</h2>
            <p className="text-purple-100">
              Manage your $EMARK tokens, earn rewards, and participate in governance
            </p>
          </div>
          <div className="hidden md:block">
            <LockIcon className="h-12 w-12 text-purple-200" />
          </div>
        </div>
        
        {/* Quick APY Info */}
        <div className="mt-4 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-purple-100">Current Staking APY</span>
            <span className="text-lg font-bold">~12.5%</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-purple-100">Unbonding Period</span>
            <span className="text-sm">{stakingStats.formatUnbondingPeriod()}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <StakingStatsOverview userAddress={userAddress} />

      {/* Staking Sections */}
      <div className="space-y-4">
        {/* Token Staking */}
        <CollapsibleSection
          title="Token Staking"
          icon={<CoinsIcon className="h-5 w-5 text-purple-600" />}
          description="Stake $EMARK tokens to earn WEMARK and participate in governance"
          defaultExpanded={true}
        >
          <div className="mt-4">
            <StakingWidget userAddress={userAddress} />
          </div>
        </CollapsibleSection>

        {/* Rewards Calculator */}
        <CollapsibleSection
          title="Rewards Calculator"
          icon={<CalculatorIcon className="h-5 w-5 text-green-600" />}
          description="Calculate potential rewards based on your staking and delegation activity"
        >
          <div className="mt-4">
            <RewardsCalculator />
          </div>
        </CollapsibleSection>

        {/* Delegation History */}
        <CollapsibleSection
          title="Delegation & Voting"
          icon={<HistoryIcon className="h-5 w-5 text-blue-600" />}
          description="Track your voting power usage and delegation history"
        >
          <div className="mt-4">
            <DelegationHistory />
          </div>
        </CollapsibleSection>

        {/* NFT Staking */}
        <CollapsibleSection
          title="NFT Staking"
          icon={<TabletIcon className="h-5 w-5 text-amber-600" />}
          description="Stake your Evermark NFTs for additional rewards"
        >
          <div className="mt-4">
            <NFTStakingPanel />
          </div>
        </CollapsibleSection>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-start">
          <InfoIcon className="h-6 w-6 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-blue-900 mb-2">Staking Guide</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                <strong>Token Staking:</strong> Stake $EMARK to receive WEMARK tokens for voting and earning rewards.
              </p>
              <p>
                <strong>Two-Step Process:</strong> First approve $EMARK spending, then stake to receive WEMARK.
              </p>
              <p>
                <strong>Delegation:</strong> Use your WEMARK to vote on quality content and maximize reward multipliers.
              </p>
              <p>
                <strong>NFT Staking:</strong> Stake your Evermark NFTs for additional reward streams.
              </p>
              <p>
                <strong>Unstaking:</strong> Requires a {stakingStats.formatUnbondingPeriod()} unbonding period for security.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StakingDashboard;