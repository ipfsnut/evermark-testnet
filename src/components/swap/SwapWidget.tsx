// src/components/swap/SwapWidget.tsx - Simple Farcaster SDK swap widget
import React, { useState } from 'react';
import { 
  ArrowUpDownIcon, 
  ArrowDownIcon,
  ExternalLinkIcon,
  InfoIcon,
  WalletIcon,
  AlertCircleIcon
} from 'lucide-react';
import { useFarcasterUser } from '../../lib/farcaster';
import { useWalletAuth } from '../../providers/WalletProvider';
import { CONTRACTS } from '../../lib/contracts';
import sdk from '@farcaster/frame-sdk';

interface Token {
  symbol: string;
  name: string;
  caipId: string; // CAIP-19 format for Farcaster SDK
  decimals: number;
  logoURI?: string;
}

// Base chain tokens in CAIP-19 format
const SUPPORTED_TOKENS: Token[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    caipId: 'eip155:8453/native', // Base native ETH
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png'
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    caipId: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    logoURI: 'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png'
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ethereum',
    caipId: 'eip155:8453/erc20:0x4200000000000000000000000000000000000006',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/2518/thumb/weth.png'
  },
  {
    symbol: 'EMARK',
    name: 'Evermark Token',
    caipId: `eip155:8453/erc20:${CONTRACTS.EMARK_TOKEN}`,
    decimals: 18,
    logoURI: '/EvermarkLogo.png'
  }
];

export const SwapWidget: React.FC = () => {
  const [fromToken, setFromToken] = useState<Token>(SUPPORTED_TOKENS[0]); // ETH
  const [toToken, setToToken] = useState<Token>(SUPPORTED_TOKENS[3]); // EMARK
  const [amount, setAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [showFromSelector, setShowFromSelector] = useState(false);
  const [showToSelector, setShowToSelector] = useState(false);
  
  const { isInFarcaster, isAuthenticated: isFarcasterAuth } = useFarcasterUser();
  const { isConnected, requireConnection } = useWalletAuth();

  // Handle Farcaster native swap
  const handleFarcasterSwap = async () => {
    if (!isInFarcaster || !sdk) {
      console.error('Farcaster SDK not available');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsSwapping(true);

    try {
      console.log('🔄 Initiating Farcaster swap...', {
        sellToken: fromToken.caipId,
        buyToken: toToken.caipId,
        sellAmount: (parseFloat(amount) * Math.pow(10, fromToken.decimals)).toString()
      });

      // Convert amount to wei/token units
      const sellAmountUnits = (parseFloat(amount) * Math.pow(10, fromToken.decimals)).toString();

      const result = await sdk.actions.swapToken({
        sellToken: fromToken.caipId,
        buyToken: toToken.caipId,
        sellAmount: sellAmountUnits
      });

      if (result.success) {
        console.log('✅ Swap successful:', result.swap);
        alert(`Swap successful! Transactions: ${result.swap.transactions.join(', ')}`);
        setAmount(''); // Clear form on success
      } else {
        console.error('❌ Swap failed:', result.error);
        if (result.reason === 'rejected_by_user') {
          alert('Swap cancelled by user');
        } else {
          alert(`Swap failed: ${result.error?.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('❌ Swap error:', error);
      alert('Swap failed. Please try again.');
    } finally {
      setIsSwapping(false);
    }
  };

  // Handle external swap for non-Farcaster users
  const handleExternalSwap = async () => {
    if (!isConnected) {
      const connectionResult = await requireConnection();
      if (!connectionResult.success) {
        return;
      }
    }

    // Extract contract addresses from CAIP-19 format
    const fromAddress = fromToken.caipId.includes('/native') ? 'ETH' : fromToken.caipId.split(':')[2];
    const toAddress = toToken.caipId.includes('/native') ? 'ETH' : toToken.caipId.split(':')[2];

    const uniswapUrl = `https://app.uniswap.org/#/swap?inputCurrency=${fromAddress}&outputCurrency=${toAddress}&chain=base`;
    window.open(uniswapUrl, '_blank');
  };

  // Swap token positions
  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  const TokenSelector = ({ 
    isOpen,
    onClose,
    selectedToken, 
    onSelect, 
    otherToken 
  }: { 
    isOpen: boolean;
    onClose: () => void;
    selectedToken: Token; 
    onSelect: (token: Token) => void;
    otherToken: Token;
  }) => {
    if (!isOpen) return null;

    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
        {SUPPORTED_TOKENS.filter(token => token.symbol !== otherToken.symbol).map(token => (
          <button
            key={token.symbol}
            onClick={() => {
              onSelect(token);
              onClose();
            }}
            className="w-full p-3 flex items-center hover:bg-gray-50 transition-colors"
          >
            <img 
              src={token.logoURI} 
              alt={token.symbol}
              className="w-8 h-8 rounded-full mr-3"
              onError={(e) => {
                e.currentTarget.src = '/EvermarkLogo.png'; // Fallback
              }}
            />
            <div className="text-left">
              <div className="font-medium">{token.symbol}</div>
              <div className="text-sm text-gray-500">{token.name}</div>
            </div>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <ArrowUpDownIcon className="h-5 w-5 mr-2 text-purple-600" />
          Token Swap
        </h3>
        
        {/* Farcaster indicator */}
        {isInFarcaster && (
          <div className="flex items-center text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
            <WalletIcon className="h-4 w-4 mr-2" />
            Native Swap
          </div>
        )}
      </div>

      {/* From Token Section */}
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">From</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <button
                onClick={() => setShowFromSelector(!showFromSelector)}
                className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <img 
                  src={fromToken.logoURI} 
                  alt={fromToken.symbol}
                  className="w-6 h-6 rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = '/EvermarkLogo.png';
                  }}
                />
                <span className="font-medium">{fromToken.symbol}</span>
                <ArrowDownIcon className="h-4 w-4 text-gray-400" />
              </button>
              
              <TokenSelector 
                isOpen={showFromSelector}
                onClose={() => setShowFromSelector(false)}
                selectedToken={fromToken}
                onSelect={setFromToken}
                otherToken={toToken}
              />
            </div>
            
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="flex-1 text-right text-xl font-medium bg-transparent border-none outline-none"
            />
          </div>
        </div>

        {/* Swap Direction Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSwapTokens}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            <ArrowUpDownIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* To Token Section */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">To</span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="relative">
              <button
                onClick={() => setShowToSelector(!showToSelector)}
                className="flex items-center space-x-2 bg-white rounded-lg px-3 py-2 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <img 
                  src={toToken.logoURI} 
                  alt={toToken.symbol}
                  className="w-6 h-6 rounded-full"
                  onError={(e) => {
                    e.currentTarget.src = '/EvermarkLogo.png';
                  }}
                />
                <span className="font-medium">{toToken.symbol}</span>
                <ArrowDownIcon className="h-4 w-4 text-gray-400" />
              </button>
              
              <TokenSelector 
                isOpen={showToSelector}
                onClose={() => setShowToSelector(false)}
                selectedToken={toToken}
                onSelect={setToToken}
                otherToken={fromToken}
              />
            </div>
            
            <div className="flex-1 text-right text-xl font-medium text-gray-400">
              {amount ? '~' : '0.0'}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <InfoIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              {isInFarcaster ? (
                <div>
                  <p className="font-medium mb-1">Native Farcaster Swap</p>
                  <p>This will open your connected wallet within Farcaster to complete the swap transaction.</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium mb-1">External Swap</p>
                  <p>This will redirect you to Uniswap to complete the swap on Base network.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Swap Button */}
        <button
          onClick={isInFarcaster ? handleFarcasterSwap : handleExternalSwap}
          disabled={isSwapping || (!amount || parseFloat(amount) <= 0)}
          className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center"
        >
          {isSwapping ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Swapping...
            </>
          ) : isInFarcaster ? (
            <>
              <WalletIcon className="h-5 w-5 mr-2" />
              Swap with Farcaster
            </>
          ) : (
            <>
              <ExternalLinkIcon className="h-5 w-5 mr-2" />
              Swap on Uniswap
            </>
          )}
        </button>

        {/* Disclaimer */}
        <div className="text-xs text-gray-500 text-center">
          {isInFarcaster ? (
            "Powered by Farcaster native wallet integration"
          ) : (
            "Redirects to Uniswap DEX on Base network"
          )}
        </div>
      </div>
    </div>
  );
};