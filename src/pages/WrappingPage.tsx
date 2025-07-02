// src/pages/WrappingPage.tsx - Updated version with RewardsPanel
import React from 'react';
import { WrappingDashboard } from '../components/wrapping/WrappingDashboard';
import { RewardsPanel } from '../components/rewards/RewardsPanel';
import { useProfile } from '../hooks/useProfile';
import PageContainer from '../components/layout/PageContainer';

export default function WrappingPage() {
  const { isAuthenticated, primaryAddress } = useProfile();

  if (!isAuthenticated) {
    return (
      <PageContainer title="wEMARK Management">
        <div className="bg-white rounded-lg border p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">🔗</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600">
            Please connect your wallet to access wrapping and delegation features.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="wEMARK Management" fullWidth>
      <div className="space-y-8">
        {/* Main Wrapping Dashboard */}
        <WrappingDashboard userAddress={primaryAddress!} />
        
        {/* Rewards Panel - includes dev dashboard for admin wallets */}
        <RewardsPanel />
      </div>
    </PageContainer>
  );
}