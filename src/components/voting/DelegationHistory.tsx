// src/components/voting/DelegationHistory.tsx - Enhanced implementation
import React, { useState } from 'react';
import { toEther } from "thirdweb/utils";
import { useDelegationHistory } from '../../hooks/useDelegationHistory';
import { useProfile } from '../../hooks/useProfile';
import { formatDistanceToNow } from 'date-fns';
import { cn, useIsMobile } from '../../utils/responsive';

interface DelegationHistoryProps {
  className?: string;
}

export function DelegationHistory({ className = '' }: DelegationHistoryProps) {
  const { primaryAddress } = useProfile();
  const isMobile = useIsMobile();
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
      <div className={cn("p-4 sm:p-6 bg-white rounded-lg border", className)}>
        <div className="text-center text-gray-500">
          <p className="text-sm sm:text-base">Connect your wallet to view delegation history</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("p-4 sm:p-6 bg-white rounded-lg border", className)}>
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
      <div className={cn("p-4 sm:p-6 bg-white rounded-lg border border-red-200", className)}>
        <div className="text-center">
          <div className="text-red-600 mb-2 text-sm sm:text-base">⚠️ Error Loading Delegation History</div>
          <p className="text-xs sm:text-sm text-gray-600 mb-4">{error}</p>
          <button 
            onClick={refresh}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded text-sm touch-manipulation"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-white rounded-lg border", className)}>
      {/* Header - Mobile optimized */}
      <div className="p-4 sm:p-6 border-b">
        <div className={cn(
          "flex justify-between",
          isMobile ? "flex-col space-y-3" : "items-center"
        )}>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Delegation History</h2>
          <div className="flex gap-2">
            <button
              onClick={refresh}
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors touch-manipulation"
            >
              🔄 Refresh
            </button>
            <button
              onClick={() => setShowDebugInfo(!showDebugInfo)}
              className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-50 transition-colors touch-manipulation"
            >
              🔧 Debug
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid - Mobile responsive */}
      <div className="p-4 sm:p-6 bg-gray-50 border-b">
        <div className={cn(
          "grid gap-3 sm:gap-4",
          isMobile ? "grid-cols-2" : "grid-cols-2 md:grid-cols-4"
        )}>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-lg sm:text-2xl font-bold text-blue-600">
              {delegationStats.delegationPercentage.toFixed(1)}%
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Delegation %</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-lg sm:text-2xl font-bold text-green-600">
              {delegationStats.rewardMultiplier.toFixed(2)}x
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Reward Multiplier</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-lg sm:text-2xl font-bold text-purple-600">
              {supportedEvermarks.length}
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Evermarks Supported</div>
          </div>
          <div className="text-center p-3 bg-white rounded-lg border">
            <div className="text-lg sm:text-2xl font-bold text-orange-600">
              {delegationStats.consistencyWeeks}/4
            </div>
            <div className="text-xs sm:text-sm text-gray-600">Consistency Weeks</div>
          </div>
        </div>

        {/* Consistency Bonus - Mobile optimized */}
        {delegationStats.consistencyBonus > 0 && (
          <div className="mt-4 p-3 bg-green-100 border border-green-200 rounded">
            <div className="text-center">
              <span className="text-green-800 font-semibold text-sm sm:text-base">
                🎉 Consistency Bonus: +{(delegationStats.consistencyBonus * 100).toFixed(0)}%
              </span>
              <div className="text-xs sm:text-sm text-green-600 mt-1">
                Keep delegating weekly to maintain your bonus!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Current Delegations - Mobile cards */}
      {netDelegations.size > 0 && (
        <div className="p-4 sm:p-6 border-b">
          <h3 className="text-base sm:text-lg font-semibold mb-4">Active Delegations</h3>
          <div className="space-y-3">
            {Array.from(netDelegations.entries()).map(([evermarkId, amount]) => (
              <div key={evermarkId} className="flex items-center justify-between p-3 bg-blue-50 rounded border">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm sm:text-base truncate">Evermark #{evermarkId}</div>
                  <div className="text-xs sm:text-sm text-gray-600">
                    {parseFloat(toEther(amount)).toFixed(4)} wEMARK delegated
                  </div>
                </div>
                <div className="text-blue-600 font-semibold text-sm ml-3 flex-shrink-0">
                  Active
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cycle Selector - Mobile optimized */}
      <div className="p-4 sm:p-6 border-b">
        <div className={cn(
          "flex gap-4 mb-4",
          isMobile ? "flex-col" : "items-center"
        )}>
          <label htmlFor="cycle-select" className="text-sm font-medium text-gray-700 flex-shrink-0">
            View Cycle:
          </label>
          <select
            id="cycle-select"
            value={selectedCycle}
            onChange={(e) => setSelectedCycle(Number(e.target.value))}
            className={cn(
              "border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              isMobile ? "w-full" : ""
            )}
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

        {/* Delegation History for Selected Cycle - Mobile cards */}
        {selectedCycleDelegations.length > 0 ? (
          <div className="space-y-3">
            {selectedCycleDelegations
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
              .map((delegation, index) => (
                <div key={index} className="p-3 border rounded">
                  <div className={cn(
                    "flex justify-between",
                    isMobile ? "flex-col space-y-2" : "items-center"
                  )}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "text-xs px-2 py-1 rounded font-medium",
                          delegation.type === 'delegate' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        )}>
                          {delegation.type === 'delegate' ? '➕ Delegated' : '➖ Undelegated'}
                        </span>
                        <span className="font-medium text-sm truncate">Evermark #{delegation.evermarkId}</span>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600">
                        {parseFloat(toEther(delegation.amount)).toFixed(4)} wEMARK
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(delegation.timestamp, { addSuffix: true })}
                      </div>
                    </div>
                    {delegation.transactionHash && (
                      <div className="text-xs text-blue-600 flex-shrink-0">
                        <a 
                          href={`https://basescan.org/tx/${delegation.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline px-2 py-1 bg-blue-50 rounded touch-manipulation"
                        >
                          View Tx
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-6 sm:py-8">
            <p className="text-sm sm:text-base text-gray-500">No delegation activity in cycle {selectedCycle}</p>
            {selectedCycle === currentCycle && (
              <p className="text-xs sm:text-sm text-gray-400 mt-2">Delegate votes to start building your history!</p>
            )}
          </div>
        )}
      </div>

      {/* Debug Information - Mobile optimized */}
      {showDebugInfo && (
        <div className="p-4 sm:p-6 bg-gray-100">
          <h3 className="text-base sm:text-lg font-semibold mb-4">Debug Information</h3>
          <div className="space-y-2 sm:space-y-4 text-xs sm:text-sm">
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
            <div className="break-all">
              <strong>Wallet Address:</strong> 
              <code className="ml-2 text-xs bg-white px-2 py-1 rounded block sm:inline mt-1 sm:mt-0">
                {primaryAddress}
              </code>
            </div>
            
            <div className={cn(
              "flex gap-2 mt-4",
              isMobile ? "flex-col" : "flex-row"
            )}>
              <button
                onClick={clearHistory}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-xs sm:text-sm touch-manipulation"
              >
                Clear History (Testing)
              </button>
              <button
                onClick={() => console.log('Delegation History:', delegationHistory)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-xs sm:text-sm touch-manipulation"
              >
                Log to Console
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State - Mobile optimized */}
      {delegationHistory.length === 0 && !isLoading && (
        <div className="p-4 sm:p-6 text-center">
          <div className="text-gray-500 mb-4">
            <div className="text-3xl sm:text-4xl mb-2">📊</div>
            <p className="text-base sm:text-lg mb-2">No delegation history yet</p>
            <p className="text-xs sm:text-sm leading-relaxed max-w-sm mx-auto">
              Start delegating your voting power to Evermarks to build your history and earn rewards!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}