// src/components/voting/DelegationHistory.tsx - Enhanced implementation
import React, { useState } from 'react';
import { toEther } from "thirdweb/utils";
import { useDelegationHistory } from '../../hooks/useDelegationHistory';
import { useProfile } from '../../hooks/useProfile';
import { formatDistanceToNow } from 'date-fns';

interface DelegationHistoryProps {
  className?: string;
}

export function DelegationHistory({ className = '' }: DelegationHistoryProps) {
  const { primaryAddress } = useProfile();
  const {
    delegationHistory,
    currentCycleDelegations,
    delegationStats,
    isLoading,
    error,
    getSupportedEvermarks,
    getNetDelegations,
    getCycleDelegations,
    refresh,
    clearHistory,
    currentCycle
  } = useDelegationHistory(primaryAddress);

  const [selectedCycle, setSelectedCycle] = useState<number>(currentCycle);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const netDelegations = getNetDelegations();
  const supportedEvermarks = getSupportedEvermarks();
  const selectedCycleDelegations = selectedCycle === currentCycle 
    ? currentCycleDelegations 
    : getCycleDelegations(selectedCycle);

  if (!primaryAddress) {
    return (
      <div className={`p-6 bg-white rounded-lg border ${className}`}>
        <div className="text-center text-gray-500">
          <p>Connect your wallet to view delegation history</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`p-6 bg-white rounded-lg border ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 bg-white rounded-lg border border-red-200 ${className}`}>
        <div className="text-center">
          <div className="text-red-600 mb-2">⚠️ Error Loading Delegation History</div>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button 
            onClick={refresh}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border ${className}`}>
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Delegation History</h2>
          <div className="flex gap-2">
            <button
              onClick={refresh}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              🔧 Debug
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-6 bg-gray-50 border-b">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {delegationStats.delegationPercentage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Delegation %</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {delegationStats.rewardMultiplier.toFixed(2)}x
            </div>
            <div className="text-sm text-gray-600">Reward Multiplier</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {supportedEvermarks.length}
            </div>
            <div className="text-sm text-gray-600">Evermarks Supported</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {delegationStats.consistencyWeeks}/4
            </div>
            <div className="text-sm text-gray-600">Consistency Weeks</div>
          </div>
        </div>

        {/* Consistency Bonus */}
        {delegationStats.consistencyBonus > 0 && (
          <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded">
            <div className="text-center">
              <span className="text-green-800 font-semibold">
                🎉 Consistency Bonus: +{(delegationStats.consistencyBonus * 100).toFixed(0)}%
              </span>
              <div className="text-sm text-green-600 mt-1">
                Keep delegating weekly to maintain your bonus!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Current Delegations */}
      {netDelegations.size > 0 && (
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold mb-4">Active Delegations</h3>
          <div className="space-y-3">
            {Array.from(netDelegations.entries()).map(([evermarkId, amount]) => (
              <div key={evermarkId} className="flex items-center justify-between p-3 bg-blue-50 rounded">
                <div>
                  <div className="font-medium">Evermark #{evermarkId}</div>
                  <div className="text-sm text-gray-600">
                    {parseFloat(toEther(amount)).toFixed(4)} wEMARK delegated
                  </div>
                </div>
                <div className="text-blue-600 font-semibold">
                  Active
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cycle Selector */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-4 mb-4">
          <label htmlFor="cycle-select" className="text-sm font-medium text-gray-700">
            View Cycle:
          </label>
          <select
            id="cycle-select"
            value={selectedCycle}
            onChange={(e) => setSelectedCycle(Number(e.target.value))}
            className="border border-gray-300 rounded px-3 py-1 text-sm"
          >
            {Array.from(new Set(delegationHistory.map(d => d.cycle)))
              .sort((a, b) => b - a)
              .map(cycle => (
                <option key={cycle} value={cycle}>
                  Cycle {cycle} {cycle === currentCycle ? '(Current)' : ''}
                </option>
              ))}
            {delegationHistory.length === 0 && (
              <option value={currentCycle}>Cycle {currentCycle} (Current)</option>
            )}
          </select>
        </div>

        {/* Delegation History for Selected Cycle */}
        {selectedCycleDelegations.length > 0 ? (
          <div className="space-y-3">
            {selectedCycleDelegations
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
              .map((delegation, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm px-2 py-1 rounded ${
                        delegation.type === 'delegate' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {delegation.type === 'delegate' ? '➕ Delegated' : '➖ Undelegated'}
                      </span>
                      <span className="font-medium">Evermark #{delegation.evermarkId}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {parseFloat(toEther(delegation.amount)).toFixed(4)} wEMARK
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDistanceToNow(delegation.timestamp, { addSuffix: true })}
                    </div>
                  </div>
                  {delegation.transactionHash && (
                    <div className="text-xs text-blue-600">
                      <a 
                        href={`https://basescan.org/tx/${delegation.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        View Tx
                      </a>
                    </div>
                  )}
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            <p>No delegation activity in cycle {selectedCycle}</p>
            {selectedCycle === currentCycle && (
              <p className="text-sm mt-2">Delegate votes to start building your history!</p>
            )}
          </div>
        )}
      </div>

      {/* Debug Information */}
      {showDebugInfo && (
        <div className="p-6 bg-gray-100">
          <h3 className="text-lg font-semibold mb-4">Debug Information</h3>
          <div className="space-y-4 text-sm">
            <div>
              <strong>Total History Records:</strong> {delegationHistory.length}
            </div>
            <div>
              <strong>Current Cycle:</strong> {currentCycle}
            </div>
            <div>
              <strong>Total Voting Power:</strong> {toEther(delegationStats.totalAvailable)} wEMARK
            </div>
            <div>
              <strong>Currently Delegated:</strong> {toEther(delegationStats.totalDelegated)} wEMARK
            </div>
            <div>
              <strong>Wallet Address:</strong> 
              <code className="ml-2 text-xs bg-white px-2 py-1 rounded">
                {primaryAddress}
              </code>
            </div>
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={clearHistory}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
              >
                Clear History (Testing)
              </button>
              <button
                onClick={() => console.log('Delegation History:', delegationHistory)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
              >
                Log to Console
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {delegationHistory.length === 0 && !isLoading && (
        <div className="p-6 text-center">
          <div className="text-gray-500 mb-4">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-lg mb-2">No delegation history yet</p>
            <p className="text-sm">
              Start delegating your voting power to Evermarks to build your history and earn rewards!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}