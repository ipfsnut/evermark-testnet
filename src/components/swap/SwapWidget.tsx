// src/components/swap/SwapWidget.tsx - Fixed Farcaster native swap integration
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

// Farcaster Native Swap Component
const FarcasterNativeSwap: React.FC = () => {
  const [isSwapping, setIsSwapping] = useState(false);

  // Predefined swap actions for common use cases
  const swapActions = [
    {
      label: 'Buy EMARK with ETH',
      description: 'Get EMARK tokens to participate in governance',
      sellToken: SUPPORTED_TOKENS[0], // ETH
      buyToken: SUPPORTED_TOKENS[3],  // EMARK
      suggestedAmount: '0.01' // 0.01 ETH
    },
    {
      label: 'Buy EMARK with USDC',
      description: 'Use stablecoins to get EMARK tokens',
      sellToken: SUPPORTED_TOKENS[1], // USDC
      buyToken: SUPPORTED_TOKENS[3],  // EMARK
      suggestedAmount: '10' // 10 USDC
    },
    {
      label: 'Buy ETH with USDC',
      description: 'Get ETH for transaction fees',
      sellToken: SUPPORTED_TOKENS[1], // USDC
      buyToken: SUPPORTED_TOKENS[0],  // ETH
      suggestedAmount: '50' // 50 USDC
    }
  ];

  const handleFarcasterSwap = async (sellToken: Token, buyToken: Token, amount: string) => {
    if (!sdk) {
      console.error('Farcaster SDK not available');
      return;
    }

    setIsSwapping(true);

    try {
      console.log('🔄 Initiating Farcaster swap...', {
        sellToken: sellToken.caipId,
        buyToken: buyToken.caipId,
        sellAmount: (parseFloat(amount) * Math.pow(10, sellToken.decimals)).toString()
      });

      // Convert amount to token units
      const sellAmountUnits = (parseFloat(amount) * Math.pow(10, sellToken.decimals)).toString();

      const result = await sdk.actions.swapToken({
        sellToken: sellToken.caipId,
        buyToken: buyToken.caipId,
        sellAmount: sellAmountUnits
      });

      if (result.success) {
        console.log('✅ Swap successful:', result.swap);
        // Don't show alert in Farcaster - the native UI handles feedback
      } else {
        console.error('❌ Swap failed:', result.error);
        if (result.reason !== 'rejected_by_user') {
          // Only show error alerts, not user cancellations
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
    <div className="space-y-4">
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <WalletIcon className="h-5 w-5 text-purple-600" />
          <span className="font-medium text-purple-900">Farcaster Native Swap</span>
        </div>
        <p className="text-sm text-purple-800">
          These buttons will open your connected wallet within Farcaster to complete the swap.
        </p>
      </div>

      <div className="space-y-3">
        {swapActions.map((action, index) => (
          <button
            key={index}
            onClick={() => handleFarcasterSwap(action.sellToken, action.buyToken, action.suggestedAmount)}
            disabled={isSwapping}
            className="w-full p-4 bg-white border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <img 
                    src={action.sellToken.logoURI} 
                    alt={action.sellToken.symbol}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = '/EvermarkLogo.png';
                    }}
                  />
                  <span className="text-sm font-medium">{action.sellToken.symbol}</span>
                </div>
                <ArrowUpDownIcon className="h-4 w-4 text-gray-400" />
                <div className="flex items-center space-x-2">
                  <img 
                    src={action.buyToken.logoURI} 
                    alt={action.buyToken.symbol}
                    className="w-6 h-6 rounded-full"
                    onError={(e) => {
                      e.currentTarget.src = '/EvermarkLogo.png';
                    }}
                  />
                  <span className="text-sm font-medium">{action.buyToken.symbol}</span>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-medium text-gray-900">{action.label}</div>
                <div className="text-xs text-gray-500">{action.description}</div>
              </div>
            </div>
            
            {isSwapping && (
              <div className="mt-2 flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                <span className="ml-2 text-sm text-purple-600">Opening swap...</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

// Traditional Swap Widget for External Users
const ExternalSwapWidget: React.FC = () => {
  const [fromToken, setFromToken] = useState<Token>(SUPPORTED_TOKENS[0]); // ETH
  const [toToken, setToToken] = useState<Token>(SUPPORTED_TOKENS[3]); // EMARK
  const [amount, setAmount] = useState('');
  const [showFromSelector, setShowFromSelector] = useState(false);
  const [showToSelector, setShowToSelector] = useState(false);
  
  const { isConnected, requireConnection } = useWalletAuth();

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
    <div className="space-y-4">
      {/* From Token Section */}
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
            <p className="font-medium mb-1">External Swap</p>
            <p>This will redirect you to Uniswap to complete the swap on Base network.</p>
          </div>
        </div>
      </div>

      {/* Swap Button */}
      <button
        onClick={handleExternalSwap}
        disabled={!amount || parseFloat(amount) <= 0}
        className="w-full py-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center"
      >
        <ExternalLinkIcon className="h-5 w-5 mr-2" />
        Swap on Uniswap
      </button>

      {/* Disclaimer */}
      <div className="text-xs text-gray-500 text-center">
        Redirects to Uniswap DEX on Base network
      </div>
    </div>
  );
};

// Main SwapWidget Component
export const SwapWidget: React.FC = () => {
  const { isInFarcaster, isAuthenticated: isFarcasterAuth } = useFarcasterUser();

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <ArrowUpDownIcon className="h-5 w-5 mr-2 text-purple-600" />
          Token Swap
        </h3>
        
        {/* Context indicator */}
        {isInFarcaster && (
          <div className="flex items-center text-sm text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
            <WalletIcon className="h-4 w-4 mr-2" />
            Farcaster Native
          </div>
        )}
      </div>

      {/* Render appropriate swap interface */}
      {isInFarcaster ? <FarcasterNativeSwap /> : <ExternalSwapWidget />}
    </div>
  );
};