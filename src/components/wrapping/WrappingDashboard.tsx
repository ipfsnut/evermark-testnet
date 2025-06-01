// src/components/wrapping/WrappingDashboard.tsx
import React, { useState } from 'react';
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
import { WrappingWidget } from './WrappingWidget';
import { RewardsCalculator } from '../rewards/RewardsCalculator';
import { DelegationHistory } from '../voting/DelegationHistory';
import { useWrapping } from '../../hooks/useWrapping';
import { useWrappingStats } from '../../hooks/useWrappingStats';
import { useRewards } from '../../hooks/useRewards';
import { useDelegationHistory } from '../../hooks/useDelegationHistory';
import { toEther } from 'thirdweb/utils';
import { useWalletAuth } from '../../providers/WalletProvider';

interface WrappingDashboardProps {
  userAddress: string;
  className?: string;
}

// Quick Stats Overview Component
const WrappingStatsOverview: React.FC<{ userAddress: string }> = ({ userAddress }) => {
  const { totalWrapped, availableVotingPower } = useWrapping(userAddress);
  const { pendingRewards } = useRewards(userAddress);
  const { delegationStats } = useDelegationHistory(userAddress);

  const stats = [
    {
      label: 'Total Wrapped',
      value: toEther(totalWrapped || BigInt(0)),
      suffix: 'wEMARK',
      icon: <LockIcon className="h-5 w-5 text-purple-600" />,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
    },
    {
      label: 'Voting Power',
      value: toEther(availableVotingPower || BigInt(0)),
      suffix: 'wEMARK',
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
      value: delegationStats?.delegationPercentage?.toFixed(1) || '0.0',
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

// Main Wrapping Dashboard Component
export const WrappingDashboard: React.FC<WrappingDashboardProps> = ({ 
  userAddress, 
  className = '' 
}) => {
  const { isConnected } = useWalletAuth();
  const wrappingStats = useWrappingStats();

  if (!isConnected || !userAddress) {
    return (
      <div className={`bg-white rounded-lg shadow-sm p-6 border border-gray-200 ${className}`}>
        <div className="text-center py-8">
          <LockIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Wrapping Dashboard</h3>
          <p className="text-gray-600">Connect your wallet to access wrapping features</p>
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
            <h2 className="text-2xl font-bold mb-2">Wrapping Dashboard</h2>
            <p className="text-purple-100">
              Wrap your $EMARK tokens to receive wEMARK for voting and governance
            </p>
          </div>
          <div className="hidden md:block">
            <LockIcon className="h-12 w-12 text-purple-200" />
          </div>
        </div>
        
        {/* Quick Unbonding Info */}
        <div className="mt-4 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm text-purple-100">Unbonding Period</span>
            <span className="text-lg font-bold">{wrappingStats.formatUnbondingPeriod()}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-purple-100">Total Protocol Wrapped</span>
            <span className="text-sm">{toEther(wrappingStats.totalProtocolWrapped)} wEMARK</span>
          </div>
        </div>
      </div>

      {/* Quick Stats Overview */}
      <WrappingStatsOverview userAddress={userAddress} />

      {/* Wrapping Sections */}
      <div className="space-y-4">
        {/* Token Wrapping */}
        <CollapsibleSection
          title="Token Wrapping"
          icon={<CoinsIcon className="h-5 w-5 text-purple-600" />}
          description="Wrap $EMARK tokens to receive wEMARK for voting and governance"
          defaultExpanded={true}
        >
          <div className="mt-4">
            <WrappingWidget userAddress={userAddress} />
          </div>
        </CollapsibleSection>

        {/* Rewards Calculator */}
        <CollapsibleSection
          title="Rewards Calculator"
          icon={<CalculatorIcon className="h-5 w-5 text-green-600" />}
          description="Calculate potential rewards based on your wrapping and delegation activity"
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
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <div className="flex items-start">
          <InfoIcon className="h-6 w-6 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-blue-900 mb-2">Wrapping Guide</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>
                <strong>Token Wrapping:</strong> Wrap $EMARK to receive wEMARK tokens for voting and governance participation.
              </p>
              <p>
                <strong>Two-Step Process:</strong> First approve $EMARK spending, then wrap to receive wEMARK.
              </p>
              <p>
                <strong>Delegation:</strong> Use your wEMARK to vote on quality content and participate in governance.
              </p>
              <p>
                <strong>Unwrapping:</strong> Requires a {wrappingStats.formatUnbondingPeriod()} unbonding period for security.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WrappingDashboard;
