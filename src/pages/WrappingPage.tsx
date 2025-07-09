import React from 'react';
import { WrappingDashboard } from '../components/wrapping/WrappingDashboard';
import SwapWidget from '../components/swap/SwapWidget';
import { RewardsPanel } from '../components/rewards/RewardsPanel';
import { useProfile } from '../hooks/useProfile';
import { useFarcasterUser } from '../lib/farcaster';
import { ArrowRightIcon, CoinsIcon, ZapIcon } from 'lucide-react';
import { cn, useIsMobile } from '../utils/responsive';

export default function WrappingPage() {
  const { isAuthenticated, primaryAddress } = useProfile();
  const { isInFarcaster } = useFarcasterUser();
  const isMobile = useIsMobile();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Cyber Header */}
        <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 border-b border-purple-400/30">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center space-y-6">
              <div className="flex justify-center items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-cyan-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/50">
                  <CoinsIcon className="h-7 w-7 text-black" />
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-400 via-cyan-400 to-green-500 bg-clip-text text-transparent">
                  TOKEN TOOLS
                </h1>
              </div>
              
              <p className="text-gray-300 max-w-3xl mx-auto text-lg">
                Swap tokens, wrap EMARK for voting power, and manage your positions on <span className="text-green-400 font-bold">Base blockchain</span>.
              </p>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-16">
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-12 text-center max-w-md mx-auto">
            <div className="text-gray-400 text-6xl mb-6">🔗</div>
            <h2 className="text-2xl font-semibold text-white mb-4">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-6">
              Please connect your wallet to access token tools and swapping features.
            </p>
            <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-500/30 rounded-lg p-6 backdrop-blur-sm">
              <p className="text-sm text-blue-300 mb-4">
                {isInFarcaster 
                  ? "🚀 Native Farcaster wallet integration ready"
                  : "🖥️ Desktop wallet connection available"
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Cyber Header */}
      <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 border-b border-purple-400/30">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-cyan-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/50">
                <CoinsIcon className="h-7 w-7 text-black" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-purple-400 via-cyan-400 to-green-500 bg-clip-text text-transparent">
                TOKEN TOOLS
              </h1>
            </div>
            
            <p className="text-gray-300 max-w-3xl mx-auto text-lg">
              Swap tokens, wrap EMARK for voting power, and manage your token positions. 
              {isInFarcaster && " Enjoy native Farcaster wallet integration for seamless swapping."}
            </p>
            
            {isInFarcaster && (
              <div className="bg-purple-900/30 border border-purple-500/30 rounded-full px-6 py-2 inline-block">
                <span className="text-purple-300 font-medium">🚀 Farcaster Native Experience</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Top Section: Swap Widget */}
        <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-xl p-6 shadow-lg shadow-purple-500/20">
          <div className={cn(
            "flex justify-between mb-6",
            isMobile ? "flex-col space-y-4" : "items-center"
          )}>
            <div>
              <h2 className="text-2xl font-bold text-purple-300 mb-2 flex items-center">
                <ZapIcon className="h-6 w-6 mr-3" />
                Token Swap
              </h2>
              <p className="text-gray-400 text-sm">
                {isInFarcaster 
                  ? "Swap tokens directly through your Farcaster wallet"
                  : "Get EMARK tokens to participate in the protocol"
                }
              </p>
            </div>
            {isInFarcaster && (
              <div className="bg-purple-800/50 text-purple-200 px-4 py-2 rounded-full text-sm font-medium border border-purple-500/30">
                🚀 Farcaster Native
              </div>
            )}
          </div>
          
          <SwapWidget />
        </div>

        {/* Arrow indicating flow */}
        <div className="flex justify-center">
          <div className="flex items-center space-x-4 text-gray-500">
            <div className="h-px bg-gradient-to-r from-transparent to-cyan-400 w-8"></div>
            <ArrowRightIcon className="h-5 w-5 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">Then wrap for voting power</span>
            <ArrowRightIcon className="h-5 w-5 text-cyan-400" />
            <div className="h-px bg-gradient-to-r from-cyan-400 to-transparent w-8"></div>
          </div>
        </div>

        {/* Main Wrapping Dashboard */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden shadow-lg shadow-gray-900/50">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-cyan-400 flex items-center">
              <CoinsIcon className="h-6 w-6 mr-3" />
              EMARK ↔ wEMARK
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Wrap EMARK tokens to get wEMARK voting power for delegation and governance
            </p>
          </div>
          
          <div className="p-6">
            <WrappingDashboard userAddress={primaryAddress!} />
          </div>
        </div>
        
        {/* Rewards Panel */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden shadow-lg shadow-gray-900/50">
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-yellow-400 flex items-center">
              <ZapIcon className="h-6 w-6 mr-3" />
              Rewards & Analytics
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Track your rewards and manage protocol features
            </p>
          </div>
          
          <div className="p-6">
            <RewardsPanel />
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-300 mb-4 flex items-center">
            <CoinsIcon className="h-5 w-5 mr-2" />
            How It Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-blue-200">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <p className="font-medium text-blue-300 mb-1">Get EMARK Tokens</p>
                <p className="text-blue-400">Swap ETH or other tokens for EMARK using the swap widget above</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0 mt-0.5">
                2
              </div>
              <div>
                <p className="font-medium text-purple-300 mb-1">Wrap to wEMARK</p>
                <p className="text-purple-400">Convert EMARK to wEMARK to gain voting power for delegation</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center text-black font-bold text-sm flex-shrink-0 mt-0.5">
                3
              </div>
              <div>
                <p className="font-medium text-green-300 mb-1">Earn Rewards</p>
                <p className="text-green-400">Delegate voting power to earn dual-token rewards with multipliers</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}