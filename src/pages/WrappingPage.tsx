// src/pages/WrappingPage.tsx - Updated with Swap Widget at the top
import React from 'react';
import { WrappingDashboard } from '../components/wrapping/WrappingDashboard';
import { SwapWidget } from '../components/swap/SwapWidget';
import { RewardsPanel } from '../components/rewards/RewardsPanel';
import { useProfile } from '../hooks/useProfile';
import { useFarcasterUser } from '../lib/farcaster';
import PageContainer from '../components/layout/PageContainer';
import { ArrowRightIcon, CoinsIcon } from 'lucide-react';

export default function WrappingPage() {
  const { isAuthenticated, primaryAddress } = useProfile();
  const { isInFarcaster } = useFarcasterUser();

  if (!isAuthenticated) {
    return (
      <PageContainer title="Token Tools">
        <div className="bg-white rounded-lg border p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">🔗</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600">
            Please connect your wallet to access token tools and swapping features.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Token Tools" fullWidth>
      <div className="space-y-8">
        {/* Header with description */}
        <div className="text-center">
          <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2 flex items-center justify-center">
            <CoinsIcon className="h-8 w-8 mr-3 text-purple-600" />
            Token Tools
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Swap tokens, wrap EMARK for voting power, and manage your token positions. 
            {isInFarcaster && " Enjoy native Farcaster wallet integration for seamless swapping."}
          </p>
        </div>

        {/* Top Section: Swap Widget */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Token Swap</h2>
              <p className="text-gray-600 text-sm">
                {isInFarcaster 
                  ? "Swap tokens directly through your Farcaster wallet"
                  : "Get EMARK tokens to participate in the protocol"
                }
              </p>
            </div>
            {isInFarcaster && (
              <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                🚀 Farcaster Native
              </div>
            )}
          </div>
          
          <SwapWidget />
        </div>

        {/* Arrow indicating flow */}
        <div className="flex justify-center">
          <div className="flex items-center space-x-4 text-gray-500">
            <div className="h-px bg-gray-300 w-8"></div>
            <ArrowRightIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Then wrap for voting power</span>
            <ArrowRightIcon className="h-5 w-5" />
            <div className="h-px bg-gray-300 w-8"></div>
          </div>
        </div>

        {/* Main Wrapping Dashboard */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">EMARK ↔ wEMARK</h2>
            <p className="text-gray-600 text-sm mt-1">
              Wrap EMARK tokens to get wEMARK voting power for delegation and governance
            </p>
          </div>
          
          <div className="p-6">
            <WrappingDashboard userAddress={primaryAddress!} />
          </div>
        </div>
        
        {/* Rewards Panel */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Rewards & Analytics</h2>
            <p className="text-gray-600 text-sm mt-1">
              Track your rewards and manage protocol features
            </p>
          </div>
          
          <div className="p-6">
            <RewardsPanel />
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-900 font-bold text-xs flex-shrink-0 mt-0.5">
                1
              </div>
              <div>
                <p className="font-medium">Get EMARK Tokens</p>
                <p className="text-blue-700">Swap ETH or other tokens for EMARK using the swap widget above</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-900 font-bold text-xs flex-shrink-0 mt-0.5">
                2
              </div>
              <div>
                <p className="font-medium">Wrap to wEMARK</p>
                <p className="text-blue-700">Convert EMARK to wEMARK to gain voting power for delegation</p>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-blue-900 font-bold text-xs flex-shrink-0 mt-0.5">
                3
              </div>
              <div>
                <p className="font-medium">Earn Rewards</p>
                <p className="text-blue-700">Delegate voting power to earn dual-token rewards with multipliers</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}