import React from 'react';
import { CoinsIcon, LockIcon } from 'lucide-react';
import { formatEmarkWithSymbol, formatWEmarkWithSymbol } from '../../utils/formatters';

interface TokenBalanceDisplayProps {
  emarkBalance: bigint;
  wEmarkBalance: bigint;
  isLoading?: boolean;
}

export const TokenBalanceDisplay: React.FC<TokenBalanceDisplayProps> = ({
  emarkBalance,
  wEmarkBalance,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Your Token Balances</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CoinsIcon className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-sm text-gray-900">Liquid</span>
          </div>
          <span className="text-sm font-medium text-gray-900">
            {formatEmarkWithSymbol(emarkBalance, 2)}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <LockIcon className="h-4 w-4 text-purple-600 mr-2" />
            <span className="text-sm text-gray-900">Staked</span>
          </div>
          <span className="text-sm font-medium text-gray-900">
            {formatWEmarkWithSymbol(wEmarkBalance, 2)}
          </span>
        </div>
        
        <div className="pt-2 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">Total Value</span>
            <span className="text-sm font-bold text-gray-900">
              {formatEmarkWithSymbol(emarkBalance + wEmarkBalance, 2)}
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
        <strong>Note:</strong> wEMARK is your staked $EMARK earning rewards. 
        It can be unstaked back to liquid $EMARK at any time.
      </div>
    </div>
  );
};