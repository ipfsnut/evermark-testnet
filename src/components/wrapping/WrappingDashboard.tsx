import React, { useState } from 'react';
import { 
  CoinsIcon, 
  LockIcon, 
  TrendingUpIcon, 
  CalculatorIcon,
  HistoryIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InfoIcon,
  ZapIcon
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
import { cn, useIsMobile } from '../../utils/responsive';

interface WrappingDashboardProps {
  userAddress: string;
  className?: string;
}

// ✅ Helper function to format token amounts consistently
const formatTokenAmount = (amount: bigint, decimals: number = 2): string => {
  try {
    const etherValue = toEther(amount || BigInt(0));
    const numericValue = parseFloat(etherValue);
    return isNaN(numericValue) ? '0.00' : numericValue.toFixed(decimals);
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return '0.00';
  }
};

// ✅ Quick Stats Overview Component using core hooks
const WrappingStatsOverview: React.FC<{ userAddress: string }> = ({ userAddress }) => {
  const { totalWrapped, availableVotingPower } = useWrapping(userAddress);
  const { pendingRewards } = useRewards(userAddress);
  const { delegationStats } = useDelegationHistory(userAddress);

  const stats = [
    {
      label: 'Total Wrapped',
      value: formatTokenAmount(totalWrapped || BigInt(0), 2),
      suffix: 'wEMARK',
      icon: <LockIcon className="h-5 w-5" />,
      gradient: 'from-purple-400 to-purple-600',
      glow: 'shadow-purple-500/20'
    },
    {
      label: 'Voting Power',
      value: formatTokenAmount(availableVotingPower || BigInt(0), 2),
      suffix: 'wEMARK',
      icon: <CoinsIcon className="h-5 w-5" />,
      gradient: 'from-blue-400 to-blue-600',
      glow: 'shadow-blue-500/20'
    },
    {
      label: 'Pending Rewards',
      value: formatTokenAmount(pendingRewards || BigInt(0), 4),
      suffix: 'Tokens',
      icon: <TrendingUpIcon className="h-5 w-5" />,
      gradient: 'from-green-400 to-green-600',
      glow: 'shadow-green-500/20'
    },
    {
      label: 'Delegation Usage',
      value: delegationStats?.delegationPercentage?.toFixed(1) || '0.0',
      suffix: '%',
      icon: <CalculatorIcon className="h-5 w-5" />,
      gradient: 'from-yellow-400 to-yellow-600',
      glow: 'shadow-yellow-500/20'
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <div key={index} className={cn(
          "bg-gray-800/50 border border-gray-700 rounded-lg p-4 shadow-lg",
          stat.glow
        )}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">{stat.label}</span>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r text-black",
              stat.gradient
            )}>
              {stat.icon}
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-white">
              {stat.value}
            </span>
            <span className="text-sm text-gray-400 ml-1">{stat.suffix}</span>
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
  accentColor?: string;
}> = ({ title, icon, children, defaultExpanded = false, description, accentColor = "cyan" }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const colorVariants = {
    cyan: {
      bg: 'bg-cyan-900/30',
      border: 'border-cyan-500/30',
      text: 'text-cyan-400',
      hover: 'hover:bg-cyan-800/30'
    },
    purple: {
      bg: 'bg-purple-900/30',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
      hover: 'hover:bg-purple-800/30'
    },
    green: {
      bg: 'bg-green-900/30',
      border: 'border-green-500/30',
      text: 'text-green-400',
      hover: 'hover:bg-green-800/30'
    }
  };

  const colors = colorVariants[accentColor as keyof typeof colorVariants] || colorVariants.cyan;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden shadow-lg shadow-gray-900/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full px-6 py-4 flex items-center justify-between transition-colors",
          colors.hover
        )}
      >
        <div className="flex items-center">
          <div className={cn(
            "p-2 rounded-lg mr-3 border",
            colors.bg,
            colors.border
          )}>
            <div className={colors.text}>
              {icon}
            </div>
          </div>
          <div className="text-left">
            <h3 className="font-medium text-white">{title}</h3>
            {description && (
              <p className="text-sm text-gray-400">{description}</p>
            )}
          </div>
        </div>
        <div className={colors.text}>
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5" />
          ) : (
            <ChevronDownIcon className="h-5 w-5" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-700">
          <div className="pt-4">
            {children}
          </div>
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
  const isMobile = useIsMobile();

  if (!isConnected || !userAddress) {
    return (
      <div className={cn("bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg p-6", className)}>
        <div className="text-center py-8">
          <LockIcon className="mx-auto h-12 w-12 text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Wrapping Dashboard</h3>
          <p className="text-gray-400">Connect your wallet to access wrapping features</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Dashboard Header */}
      <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-lg p-6 text-white shadow-lg shadow-purple-500/20">
        <div className={cn(
          "flex justify-between",
          isMobile ? "flex-col space-y-4" : "items-center"
        )}>
          <div>
            <h2 className="text-2xl font-bold mb-2 text-purple-300 flex items-center">
              <ZapIcon className="h-6 w-6 mr-3" />
              Wrapping Dashboard
            </h2>
            <p className="text-purple-200">
              Wrap your $EMARK tokens to receive wEMARK for voting and governance
            </p>
          </div>
          <div className={cn("hidden", !isMobile && "md:block")}>
            <LockIcon className="h-12 w-12 text-purple-300/50" />
          </div>
        </div>
        
        {/* Quick Unbonding Info */}
        <div className="mt-4 p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-purple-400/30">
          <div className={cn(
            "flex justify-between",
            isMobile ? "flex-col space-y-2" : "items-center"
          )}>
            <span className="text-sm text-purple-200">Unbonding Period</span>
            <span className="text-lg font-bold text-white">{wrappingStats.formatUnbondingPeriod()}</span>
          </div>
          <div className={cn(
            "flex justify-between mt-2",
            isMobile ? "flex-col space-y-1" : "items-center"
          )}>
            <span className="text-sm text-purple-200">Total Protocol Wrapped</span>
            <span className="text-sm text-white">{formatTokenAmount(wrappingStats.totalProtocolWrapped, 2)} wEMARK</span>
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
          icon={<CoinsIcon className="h-5 w-5" />}
          description="Wrap $EMARK tokens to receive wEMARK for voting and governance"
          defaultExpanded={true}
          accentColor="purple"
        >
          <WrappingWidget userAddress={userAddress} />
        </CollapsibleSection>

        {/* Rewards Calculator */}
        <CollapsibleSection
          title="Rewards Calculator"
          icon={<CalculatorIcon className="h-5 w-5" />}
          description="Calculate potential rewards based on your wrapping and delegation activity"
          accentColor="green"
        >
          <RewardsCalculator />
        </CollapsibleSection>

        {/* Delegation History */}
        <CollapsibleSection
          title="Delegation & Voting"
          icon={<HistoryIcon className="h-5 w-5" />}
          description="Track your voting power usage and delegation history"
          accentColor="cyan"
        >
          <DelegationHistory />
        </CollapsibleSection>
      </div>

      {/* Help Section */}
      <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-6">
        <div className="flex items-start">
          <InfoIcon className="h-6 w-6 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium text-blue-300 mb-3">Wrapping Guide</h3>
            <div className="text-sm text-blue-200 space-y-3">
              <p>
                <strong className="text-blue-300">Token Wrapping:</strong> Wrap $EMARK to receive wEMARK tokens for voting and governance participation.
              </p>
              <p>
                <strong className="text-blue-300">Two-Step Process:</strong> First approve $EMARK spending, then wrap to receive wEMARK.
              </p>
              <p>
                <strong className="text-blue-300">Delegation:</strong> Use your wEMARK to vote on quality content and participate in governance.
              </p>
              <p>
                <strong className="text-blue-300">Unwrapping:</strong> Requires a {wrappingStats.formatUnbondingPeriod()} unbonding period for security.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WrappingDashboard;