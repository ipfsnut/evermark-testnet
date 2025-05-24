import React, { useState } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useDelegationHistory } from '../../hooks/useDelegationHistory';
import { useEvermarks } from '../../hooks/useEvermarks';
import { 
  TrendingUpIcon, 
  HistoryIcon, 
  AwardIcon,
  InfoIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  VoteIcon,
  CalendarIcon,
  PercentIcon
} from 'lucide-react';
import { toEther } from 'thirdweb/utils';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

export const DelegationHistory: React.FC = () => {
  const { address, isConnected } = useWallet();
  const { evermarks } = useEvermarks();
  const {
    delegationHistory,
    currentCycleDelegations,
    delegationStats,
    isLoading,
    getSupportedEvermarks,
    getConsistencyBonus,
    currentCycle
  } = useDelegationHistory(address);
  
  const [showHistory, setShowHistory] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<number | null>(null);
  
  if (!isConnected) {
    return null;
  }
  
  const consistencyBonus = getConsistencyBonus();
  const totalMultiplier = delegationStats.rewardMultiplier + consistencyBonus;
  const supportedEvermarkIds = getSupportedEvermarks();
  
  // Get evermark details for delegations
  const getDelegationDetails = (evermarkId: string) => {
    return evermarks.find(e => e.id === evermarkId);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <HistoryIcon className="h-6 w-6 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">Delegation Power</h3>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center text-sm text-purple-600 hover:text-purple-700"
        >
          History
          {showHistory ? (
            <ChevronUpIcon className="h-4 w-4 ml-1" />
          ) : (
            <ChevronDownIcon className="h-4 w-4 ml-1" />
          )}
        </button>
      </div>
      
      {/* Delegation Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <PercentIcon className="h-5 w-5 text-purple-600" />
            <span className="text-xs text-purple-600 font-medium">This Week</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {delegationStats.delegationPercentage}%
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {toEther(delegationStats.totalDelegated)} / {toEther(delegationStats.totalAvailable)} NSI
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUpIcon className="h-5 w-5 text-green-600" />
            <span className="text-xs text-green-600 font-medium">Reward Boost</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {totalMultiplier.toFixed(2)}x
          </p>
          <div className="text-xs text-gray-600 mt-1">
            <div>Base: {delegationStats.rewardMultiplier}x</div>
            {consistencyBonus > 0 && (
              <div>Consistency: +{(consistencyBonus * 100).toFixed(0)}%</div>
            )}
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <AwardIcon className="h-5 w-5 text-amber-600" />
            <span className="text-xs text-amber-600 font-medium">Supported</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {supportedEvermarkIds.length}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Evermarks this cycle
          </p>
        </div>
      </div>
      
      {/* Reward Multiplier Info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <InfoIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-blue-900 font-medium mb-1">Maximize Your Rewards</p>
            <ul className="text-blue-800 space-y-1">
              <li>• Use 100% of voting power = 2x rewards</li>
              <li>• Use 75%+ = 1.5x rewards</li>
              <li>• Use 50%+ = 1.25x rewards</li>
              <li>• Consistent weekly participation = up to +20% bonus</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Current Week Delegations */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          <CalendarIcon className="h-4 w-4 mr-1" />
          Week {currentCycle} Delegations
        </h4>
        
        {currentCycleDelegations.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            No delegations yet this week. Vote on Evermarks to earn rewards!
          </p>
        ) : (
          <div className="space-y-2">
            {currentCycleDelegations.map((delegation, index) => {
              const evermark = getDelegationDetails(delegation.evermarkId);
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <VoteIcon className="h-4 w-4 text-purple-500 mr-2" />
                    <div>
                      <Link 
                        to={`/evermark/${delegation.evermarkId}`}
                        className="text-sm font-medium text-gray-900 hover:text-purple-600"
                      >
                        {evermark?.title || `Evermark #${delegation.evermarkId}`}
                      </Link>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(delegation.timestamp, { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {toEther(delegation.amount)} NSI
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Historical Delegations */}
      {showHistory && (
        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Delegation History</h4>
          
          {/* Cycle Selector */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {[...Array(Math.min(4, currentCycle))].map((_, i) => {
              const cycle = currentCycle - i;
              return (
                <button
                  key={cycle}
                  onClick={() => setSelectedCycle(cycle === selectedCycle ? null : cycle)}
                  className={`px-3 py-1 text-sm rounded-full whitespace-nowrap ${
                    selectedCycle === cycle
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Week {cycle}
                </button>
              );
            })}
          </div>
          
          {/* Selected Cycle Delegations */}
          {selectedCycle && (
            <div className="space-y-2">
              {delegationHistory
                .filter(d => d.cycle === selectedCycle)
                .map((delegation, index) => {
                  const evermark = getDelegationDetails(delegation.evermarkId);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <VoteIcon className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <Link 
                            to={`/evermark/${delegation.evermarkId}`}
                            className="text-sm font-medium text-gray-900 hover:text-purple-600"
                          >
                            {evermark?.title || `Evermark #${delegation.evermarkId}`}
                          </Link>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(delegation.timestamp, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {toEther(delegation.amount)} NSI
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
      
      {/* Call to Action */}
      {delegationStats.delegationPercentage < 100 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-900 font-medium mb-2">
            💡 You have unused voting power!
          </p>
          <p className="text-sm text-purple-800 mb-3">
            Use {100 - delegationStats.delegationPercentage}% more to maximize your rewards.
          </p>
          <Link 
            to="/"
            className="inline-flex items-center px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
          >
            <VoteIcon className="h-4 w-4 mr-2" />
            Vote on Evermarks
          </Link>
        </div>
      )}
    </div>
  );
};