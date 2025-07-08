// src/components/swap/SwapWidget.tsx - Redesigned with beautiful buttons
import React, { useState } from 'react';
import { 
  ArrowUpDownIcon, 
  ArrowDownIcon,
  ExternalLinkIcon,
  InfoIcon,
  WalletIcon,
  AlertCircleIcon,
  TrendingUpIcon,
  CoinsIcon,
  StarIcon,
  SparklesIcon
} from 'lucide-react';
import { useFarcasterUser } from '../../lib/farcaster';
import { useWalletAuth } from '../../providers/WalletProvider';
import { CONTRACTS } from '../../lib/contracts';
import sdk from '@farcaster/frame-sdk';

interface Token {
  symbol: string;
  name: string;
  caipId: string;
  decimals: number;
  logoURI?: string;
  color: string; // Add color for theming
}

// Enhanced tokens with colors and better styling
const SUPPORTED_TOKENS: Token[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    caipId: 'eip155:8453/native',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png',
    color: 'from-blue-500 to-purple-600'
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    caipId: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    logoURI: 'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png',
    color: 'from-blue-400 to-blue-600'
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ethereum',
    caipId: 'eip155:8453/erc20:0x4200000000000000000000000000000000000006',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/2518/thumb/weth.png',
    color: 'from-indigo-500 to-purple-600'
  },
  {
    symbol: 'EMARK',
    name: 'Evermark Token',
    caipId: `eip155:8453/erc20:${CONTRACTS.EMARK_TOKEN}`,
    decimals: 18,
    logoURI: '/EvermarkLogo.png',
    color: 'from-purple-500 to-pink-600'
  }
];

// Beautiful swap action card component
const SwapActionCard: React.FC<{
  fromToken: Token;
  toToken: Token;
  amount: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  isPopular?: boolean;
  onSwap: () => void;
  isLoading: boolean;
}> = ({ fromToken, toToken, amount, title, description, icon, isPopular, onSwap, isLoading }) => {
  return (
    <div className={`
      relative group overflow-hidden rounded-xl border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl
      ${isPopular ? 'border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50' : 'border-gray-200 bg-white hover:border-purple-200'}
    `}>
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute top-3 right-3 z-10">
          <div className="flex items-center px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
            <StarIcon className="h-3 w-3 mr-1" />
            POPULAR
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="p-6">
        {/* Header with icon */}
        <div className="flex items-center mb-4">
          <div className={`
            p-3 rounded-xl bg-gradient-to-r ${fromToken.color} text-white mr-3 shadow-lg
            group-hover:shadow-xl transition-shadow duration-300
          `}>
            {icon}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>

        {/* Token flow visualization */}
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
          {/* From token */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img 
                src={fromToken.logoURI} 
                alt={fromToken.symbol}
                className="w-10 h-10 rounded-full border-2 border-white shadow-md"
                onError={(e) => {
                  e.currentTarget.src = '/EvermarkLogo.png';
                }}
              />
            </div>
            <div>
              <div className="font-bold text-gray-900">{amount} {fromToken.symbol}</div>
              <div className="text-xs text-gray-500">{fromToken.name}</div>
            </div>
          </div>

          {/* Arrow with gradient */}
          <div className="flex-1 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-sm"></div>
              <div className="relative bg-white p-2 rounded-full border-2 border-purple-200">
                <ArrowUpDownIcon className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </div>

          {/* To token */}
          <div className="flex items-center space-x-3">
            <div>
              <div className="font-bold text-gray-900 text-right">~ {toToken.symbol}</div>
              <div className="text-xs text-gray-500 text-right">{toToken.name}</div>
            </div>
            <div className="relative">
              <img 
                src={toToken.logoURI} 
                alt={toToken.symbol}
                className="w-10 h-10 rounded-full border-2 border-white shadow-md"
                onError={(e) => {
                  e.currentTarget.src = '/EvermarkLogo.png';
                }}
              />
            </div>
          </div>
        </div>

        {/* Beautiful swap button */}
        <button
          onClick={onSwap}
          disabled={isLoading}
          className={`
            w-full py-4 px-6 rounded-xl font-bold text-white transition-all duration-300 transform
            ${isLoading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : `bg-gradient-to-r ${fromToken.color} hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98]`
            }
            relative overflow-hidden group
          `}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          
          {/* Button content */}
          <div className="relative flex items-center justify-center">
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                Opening Farcaster...
              </>
            ) : (
              <>
                <WalletIcon className="h-5 w-5 mr-3" />
                Swap {fromToken.symbol} → {toToken.symbol}
              </>
            )}
          </div>
        </button>

        {/* Additional info */}
        <div className="mt-3 text-center">
          <p className="text-xs text-gray-500">
            Opens in your Farcaster wallet • Powered by Base
          </p>
        </div>
      </div>
    </div>
  );
};

// Farcaster Native Swap Component with beautiful design
const FarcasterNativeSwap: React.FC = () => {
  const [isSwapping, setIsSwapping] = useState(false);

  // Enhanced swap actions with better UX
  const swapActions = [
    {
      fromToken: SUPPORTED_TOKENS[0], // ETH
      toToken: SUPPORTED_TOKENS[3],   // EMARK
      amount: '0.01',
      title: 'Get EMARK with ETH',
      description: 'Start participating in governance',
      icon: <CoinsIcon className="h-5 w-5" />,
      isPopular: true
    },
    {
      fromToken: SUPPORTED_TOKENS[1], // USDC
      toToken: SUPPORTED_TOKENS[3],   // EMARK
      amount: '10',
      title: 'Get EMARK with USDC',
      description: 'Use stablecoins for predictable swaps',
      icon: <TrendingUpIcon className="h-5 w-5" />,
      isPopular: false
    },
    {
      fromToken: SUPPORTED_TOKENS[1], // USDC
      toToken: SUPPORTED_TOKENS[0],   // ETH
      amount: '50',
      title: 'Get ETH for Gas',
      description: 'Ensure you have ETH for transactions',
      icon: <SparklesIcon className="h-5 w-5" />,
      isPopular: false
    }
  ];

  const handleFarcasterSwap = async (fromToken: Token, toToken: Token, amount: string) => {
    if (!sdk) {
      console.error('Farcaster SDK not available');
      return;
    }

    setIsSwapping(true);

    try {
      console.log('🔄 Initiating Farcaster swap...', {
        sellToken: fromToken.caipId,
        buyToken: toToken.caipId,
        sellAmount: (parseFloat(amount) * Math.pow(10, fromToken.decimals)).toString()
      });

      const sellAmountUnits = (parseFloat(amount) * Math.pow(10, fromToken.decimals)).toString();

      const result = await sdk.actions.swapToken({
        sellToken: fromToken.caipId,
        buyToken: toToken.caipId,
        sellAmount: sellAmountUnits
      });

      if (result.success) {
        console.log('✅ Swap successful:', result.swap);
      } else {
        console.error('❌ Swap failed:', result.error);
        if (result.reason !== 'rejected_by_user') {
          console.warn('Swap error:', result.error?.message || 'Unknown error');
        }
      }
    } catch (error) {
      console.error('❌ Swap error:', error);
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
          <WalletIcon className="h-4 w-4 mr-2" />
          Farcaster Native Swapping
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Choose Your Swap</h3>
        <p className="text-gray-600">
          These buttons will open your connected wallet within Farcaster to complete the swap safely.
        </p>
      </div>

      {/* Swap action cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {swapActions.map((action, index) => (
          <SwapActionCard
            key={index}
            fromToken={action.fromToken}
            toToken={action.toToken}
            amount={action.amount}
            title={action.title}
            description={action.description}
            icon={action.icon}
            isPopular={action.isPopular}
            onSwap={() => handleFarcasterSwap(action.fromToken, action.toToken, action.amount)}
            isLoading={isSwapping}
          />
        ))}
      </div>

      {/* Help section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <InfoIcon className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">How Farcaster Swapping Works</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Click any swap button to open your Farcaster wallet</li>
              <li>• Review the transaction details in your wallet</li>
              <li>• Confirm the swap to complete the transaction</li>
              <li>• Tokens will appear in your wallet on Base network</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

// Traditional Swap Widget for External Users (also improved)
const ExternalSwapWidget: React.FC = () => {
  const [fromToken, setFromToken] = useState<Token>(SUPPORTED_TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(SUPPORTED_TOKENS[3]);
  const [amount, setAmount] = useState('');
  const [showFromSelector, setShowFromSelector] = useState(false);
  const [showToSelector, setShowToSelector] = useState(false);
  
  const { isConnected, requireConnection } = useWalletAuth();

  const handleExternalSwap = async () => {
    if (!isConnected) {
      const connectionResult = await requireConnection();
      if (!connectionResult.success) {
        return;
      }
    }

    const fromAddress = fromToken.caipId.includes('/native') ? 'ETH' : fromToken.caipId.split(':')[2];
    const toAddress = toToken.caipId.includes('/native') ? 'ETH' : toToken.caipId.split(':')[2];

    const uniswapUrl = `https://app.uniswap.org/#/swap?inputCurrency=${fromAddress}&outputCurrency=${toAddress}&chain=base`;
    window.open(uniswapUrl, '_blank');
  };

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
      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-10 max-h-60 overflow-y-auto">
        {SUPPORTED_TOKENS.filter(token => token.symbol !== otherToken.symbol).map(token => (
          <button
            key={token.symbol}
            onClick={() => {
              onSelect(token);
              onClose();
            }}
            className="w-full p-4 flex items-center hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
          >
            <img 
              src={token.logoURI} 
              alt={token.symbol}
              className="w-8 h-8 rounded-full mr-3"
              onError={(e) => {
                e.currentTarget.src = '/EvermarkLogo.png';
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
    <div className="space-y-6">
      {/* From Token Section */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-700">From</span>
          <span className="text-xs text-gray-500">Balance: 0.00</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              onClick={() => setShowFromSelector(!showFromSelector)}
              className="flex items-center space-x-3 bg-white rounded-xl px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors shadow-sm"
            >
              <img 
                src={fromToken.logoURI} 
                alt={fromToken.symbol}
                className="w-8 h-8 rounded-full"
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
            className="flex-1 text-right text-2xl font-medium bg-transparent border-none outline-none"
          />
        </div>
      </div>

      {/* Swap Direction Button */}
      <div className="flex justify-center">
        <button
          onClick={handleSwapTokens}
          className="p-3 bg-white hover:bg-gray-50 rounded-full transition-colors border border-gray-200 shadow-sm hover:shadow-md"
        >
          <ArrowUpDownIcon className="h-6 w-6 text-gray-600" />
        </button>
      </div>

      {/* To Token Section */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-700">To</span>
          <span className="text-xs text-gray-500">Balance: 0.00</span>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <button
              onClick={() => setShowToSelector(!showToSelector)}
              className="flex items-center space-x-3 bg-white rounded-xl px-4 py-3 border border-gray-200 hover:border-gray-300 transition-colors shadow-sm"
            >
              <img 
                src={toToken.logoURI} 
                alt={toToken.symbol}
                className="w-8 h-8 rounded-full"
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
          
          <div className="flex-1 text-right text-2xl font-medium text-gray-400">
            {amount ? '~' : '0.0'}
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <InfoIcon className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-blue-900 mb-1">External Swap</p>
            <p className="text-sm text-blue-800">This will redirect you to Uniswap to complete the swap on Base network.</p>
          </div>
        </div>
      </div>

      {/* Swap Button */}
      <button
        onClick={handleExternalSwap}
        disabled={!amount || parseFloat(amount) <= 0}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all duration-300 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
      >
        <ExternalLinkIcon className="h-5 w-5 mr-2" />
        Swap on Uniswap
      </button>
    </div>
  );
};

// Main SwapWidget Component
export const SwapWidget: React.FC = () => {
  const { isInFarcaster } = useFarcasterUser();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold flex items-center">
              <ArrowUpDownIcon className="h-6 w-6 mr-3" />
              Token Swap
            </h3>
            <p className="text-purple-100 mt-1">
              {isInFarcaster ? 'Native Farcaster wallet integration' : 'Connect to external exchanges'}
            </p>
          </div>
          
          {isInFarcaster && (
            <div className="flex items-center bg-white/20 px-3 py-1 rounded-full text-sm font-medium">
              <WalletIcon className="h-4 w-4 mr-2" />
              Farcaster
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {isInFarcaster ? <FarcasterNativeSwap /> : <ExternalSwapWidget />}
      </div>
    </div>
  );
};