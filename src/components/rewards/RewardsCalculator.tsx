import React, { useState, useMemo } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useDelegationHistory } from '../../hooks/useDelegationHistory';
import { useStaking } from '../../hooks/useStaking';
import { 
  CalculatorIcon, 
  CoinsIcon,
  TrendingUpIcon,
  InfoIcon,
  LockIcon,
  VoteIcon,
  ClockIcon
} from 'lucide-react';
import { toEther, toWei } from 'thirdweb/utils';

interface RewardComponent {
  name: string;
  amount: bigint;
  multiplier: number;
  description: string;
  icon: React.ReactNode;
}

export const RewardsCalculator: React.FC = () => {
  const { address, isConnected } = useWallet();
  const { delegationStats, getConsistencyBonus } = useDelegationHistory(address);
  const { totalStaked } = useStaking(address);
  const [showDetails, setShowDetails] = useState(false);
  
  // Base reward rates (mock values - in production from contract)
  const baseStakingRate = 0.05; // 5% APY
  const baseDelegationRate = 0.02; // 2% per week for full delegation
  const baseCreatorRate = 0.01; // 1% of trading fees
  
  // Calculate reward components
  const rewardComponents = useMemo((): RewardComponent[] => {
    const components: RewardComponent[] = [];
    
    // 1. Staking Rewards
    const stakingAmount = totalStaked || BigInt(0);
    const stakingReward = stakingAmount > BigInt(0) 
      ? BigInt(Math.floor(Number(stakingAmount) * baseStakingRate / 52)) // Weekly
      : BigInt(0);
    
    components.push({
      name: 'Staking Rewards',
      amount: stakingReward,
      multiplier: 1,
      description: 'Base rewards for staking NSI tokens',
      icon: <LockIcon className="h-4 w-4 text-purple-600" />
    });
    
    // 2. Delegation Rewards with Multiplier
    const delegationBase = delegationStats.totalDelegated > BigInt(0)
      ? BigInt(Math.floor(Number(delegationStats.totalDelegated) * baseDelegationRate))
      : BigInt(0);
    const delegationWithMultiplier = BigInt(
      Math.floor(Number(delegationBase) * delegationStats.rewardMultiplier)
    );
    
    components.push({
      name: 'Delegation Rewards',
      amount: delegationWithMultiplier,
      multiplier: delegationStats.rewardMultiplier,
      description: `${delegationStats.delegationPercentage}% voting power used`,
      icon: <VoteIcon className="h-4 w-4 text-blue-600" />
    });
    
    // 3. Consistency Bonus
    const consistencyBonus = getConsistencyBonus();
    const consistencyAmount = BigInt(
      Math.floor(Number(delegationBase) * consistencyBonus)
    );
    
    if (consistencyBonus > 0) {
      components.push({
        name: 'Consistency Bonus',
        amount: consistencyAmount,
        multiplier: 1 + consistencyBonus,
        description: 'Bonus for regular participation',
        icon: <ClockIcon className="h-4 w-4 text-green-600" />
      });
    }
    
    // 4. Creator Rewards (mock)
    const creatorRewards = BigInt(50e18); // Mock 50 NSI
    components.push({
      name: 'Creator Rewards',
      amount: creatorRewards,
      multiplier: 1,
      description: 'From your Evermarks on the leaderboard',
      icon: <TrendingUpIcon className="h-4 w-4 text-amber-600" />
    });
    
    return components;
  }, [totalStaked, delegationStats, getConsistencyBonus]);
  
  // Calculate totals
  const totalWeeklyRewards = rewardComponents.reduce(
    (sum, component) => sum + component.amount,
    BigInt(0)
  );
  
  const projectedMonthlyRewards = totalWeeklyRewards * BigInt(4);
  const projectedYearlyRewards = totalWeeklyRewards * BigInt(52);
  
  if (!isConnected) {
    return null;
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <CalculatorIcon className="h-6 w-6 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Rewards Calculator</h3>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="p-1 text-gray-500 hover:text-gray-700"
        >
          <InfoIcon className="h-5 w-5" />
        </button>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <CoinsIcon className="h-5 w-5 text-purple-600 mr-2" />
            <span className="text-sm text-purple-600 font-medium">Weekly</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {toEther(totalWeeklyRewards)}
          </p>
          <p className="text-xs text-gray-600 mt-1">NSI tokens</p>
        </div>
        
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <CoinsIcon className="h-5 w-5 text-blue-600 mr-2" />
            <span className="text-sm text-blue-600 font-medium">Monthly</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {toEther(projectedMonthlyRewards)}
          </p>
          <p className="text-xs text-gray-600 mt-1">NSI tokens</p>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg">
          <div className="flex items-center mb-2">
            <CoinsIcon className="h-5 w-5 text-green-600 mr-2" />
            <span className="text-sm text-green-600 font-medium">Yearly</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {toEther(projectedYearlyRewards)}
          </p>
          <p className="text-xs text-gray-600 mt-1">NSI tokens</p>
        </div>
      </div>
      
      {/* Breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">Reward Breakdown</h4>
        
        {rewardComponents.map((component, index) => (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              {component.icon}
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{component.name}</p>
                <p className="text-xs text-gray-600">{component.description}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">
                {toEther(component.amount)} NSI
              </p>
              {component.multiplier > 1 && (
                <p className="text-xs text-purple-600">
                  {component.multiplier}x boost
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Details/Tips */}
      {showDetails && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">How to Maximize Rewards</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Stake more NSI:</strong> Base staking rewards at 5% APY</li>
            <li>• <strong>Use all voting power:</strong> Get up to 2x multiplier on delegation rewards</li>
            <li>• <strong>Vote consistently:</strong> Weekly participation adds up to 20% bonus</li>
            <li>• <strong>Create quality content:</strong> Earn from leaderboard placement</li>
            <li>• <strong>Stake NFTs:</strong> Earn based on votes your NFTs received</li>
            <li>• <strong>Compound rewards:</strong> Stake earned NSI for exponential growth</li>
          </ul>
        </div>
      )}
      
      {/* APY Display */}
      <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-purple-900 font-medium">Effective APY</p>
            <p className="text-xs text-purple-700 mt-1">Based on current activity</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-purple-900">
              {totalStaked && totalStaked > BigInt(0) 
                ? `${((Number(projectedYearlyRewards) / Number(totalStaked)) * 100).toFixed(1)}%`
                : 'N/A'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};