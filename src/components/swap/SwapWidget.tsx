import React, { useState } from 'react';
import { WalletIcon, ExternalLinkIcon } from 'lucide-react';
import { useFarcasterUser } from '../../lib/farcaster';
import { useWalletAuth } from '../../providers/WalletProvider';
import { CONTRACTS } from '../../lib/contracts';
import sdk from '@farcaster/frame-sdk';

export const SwapWidget: React.FC = () => {
  const [isSwapping, setIsSwapping] = useState(false);
  const { isInFarcaster } = useFarcasterUser();
  const { isConnected, requireConnection } = useWalletAuth();

  const handleGetEmark = async () => {
    if (isInFarcaster) {
      // Farcaster native swap
      if (!sdk) return;
      
      setIsSwapping(true);
      try {
        const result = await sdk.actions.swapToken({
          sellToken: 'eip155:8453/native', // ETH
          buyToken: `eip155:8453/erc20:${CONTRACTS.EMARK_TOKEN}`, // EMARK
          sellAmount: (0.01 * Math.pow(10, 18)).toString() // 0.01 ETH
        });
        
        if (!result.success && result.reason !== 'rejected_by_user') {
          console.warn('Swap error:', result.error?.message);
        }
      } catch (error) {
        console.error('Swap error:', error);
      } finally {
        setIsSwapping(false);
      }
    } else {
      // External swap
      if (!isConnected) {
        const connectionResult = await requireConnection();
        if (!connectionResult.success) return;
      }
      
      const uniswapUrl = `https://app.uniswap.org/#/swap?inputCurrency=ETH&outputCurrency=${CONTRACTS.EMARK_TOKEN}&chain=base`;
      window.open(uniswapUrl, '_blank');
    }
  };

  return (
    <button
      onClick={handleGetEmark}
      disabled={isSwapping}
      className={`
        inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold text-white 
        transition-all duration-300 transform relative overflow-hidden group
        ${isSwapping 
          ? 'bg-gray-400 cursor-not-allowed' 
          : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
        }
      `}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
      
      {/* Button content */}
      <div className="relative flex items-center">
        {isSwapping ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
            {isInFarcaster ? 'Opening...' : 'Redirecting...'}
          </>
        ) : (
          <>
            {isInFarcaster ? (
              <WalletIcon className="h-5 w-5 mr-3" />
            ) : (
              <ExternalLinkIcon className="h-5 w-5 mr-3" />
            )}
            GET $EMARK
          </>
        )}
      </div>
    </button>
  );
};

export default SwapWidget;