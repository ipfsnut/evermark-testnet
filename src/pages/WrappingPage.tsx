// src/pages/WrappingPage.tsx - Corrected version without WrappingInterface
import React, { useState } from 'react';
import { DelegationHistory } from '../components/voting/DelegationHistory';
import { useProfile } from '../hooks/useProfile';
import { useWrapping } from '../hooks/useWrapping';
import { useWrappingStats } from '../hooks/useWrappingStats';
import { toEther, toWei } from 'thirdweb/utils';

type WrappingTab = 'wrap' | 'delegation' | 'overview';

export default function WrappingPage() {
  const [activeTab, setActiveTab] = useState<WrappingTab>('overview');
  const [wrapAmount, setWrapAmount] = useState('');
  const [unwrapAmount, setUnwrapAmount] = useState('');
  const { isAuthenticated, primaryAddress } = useProfile();
  
  const { 
    emarkBalance, 
    wEmarkBalance, 
    availableVotingPower,
    unbondingAmount,
    unbondingReleaseTime,
    canClaimUnbonding,
    isWrapping,
    isUnwrapping,
    wrapTokens,
    requestUnwrap,
    completeUnwrap,
    cancelUnbonding,
    error,
    success,
    clearMessages,
    isLoadingBalance
  } = useWrapping(primaryAddress);
  
  const { formatUnbondingPeriod } = useWrappingStats();

  const handleWrap = async () => {
    if (!wrapAmount || parseFloat(wrapAmount) <= 0) return;
    
    try {
      const amountWei = toWei(wrapAmount);
      await wrapTokens(amountWei);
      setWrapAmount('');
    } catch (err) {
      console.error('Wrap failed:', err);
    }
  };

  const handleRequestUnwrap = async () => {
    if (!unwrapAmount || parseFloat(unwrapAmount) <= 0) return;
    
    try {
      const amountWei = toWei(unwrapAmount);
      await requestUnwrap(amountWei);
      setUnwrapAmount('');
    } catch (err) {
      console.error('Unwrap request failed:', err);
    }
  };

  const handleCompleteUnwrap = async () => {
    try {
      await completeUnwrap();
    } catch (err) {
      console.error('Complete unwrap failed:', err);
    }
  };

  const handleCancelUnbonding = async () => {
    try {
      await cancelUnbonding();
    } catch (err) {
      console.error('Cancel unbonding failed:', err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border p-8 text-center">
          <div className="text-gray-400 text-6xl mb-4">🔗</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600">
            Please connect your wallet to access wrapping and delegation features.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">wEMARK Management</h1>
        <p className="text-gray-600">
          Wrap your EMARK tokens to unlock voting power and delegate to your favorite Evermarks
        </p>
      </div>

      {/* Messages */}
      {(error || success) && (
        <div className="mb-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-red-500">❌</div>
                  <span className="text-red-800">{error}</span>
                </div>
                <button
                  onClick={clearMessages}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="text-green-500">✅</div>
                  <span className="text-green-800">{success}</span>
                </div>
                <button
                  onClick={clearMessages}
                  className="text-green-500 hover:text-green-700"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Liquid EMARK</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoadingBalance ? '...' : parseFloat(toEther(emarkBalance)).toFixed(2)}
              </p>
            </div>
            <div className="text-blue-500 text-2xl">💰</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Wrapped wEMARK</p>
              <p className="text-2xl font-bold text-purple-600">
                {isLoadingBalance ? '...' : parseFloat(toEther(wEmarkBalance)).toFixed(2)}
              </p>
            </div>
            <div className="text-purple-500 text-2xl">🎁</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Voting Power</p>
              <p className="text-2xl font-bold text-green-600">
                {isLoadingBalance ? '...' : parseFloat(toEther(availableVotingPower)).toFixed(2)}
              </p>
            </div>
            <div className="text-green-500 text-2xl">🗳️</div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unbonding Period</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatUnbondingPeriod()}
              </p>
            </div>
            <div className="text-orange-500 text-2xl">⏰</div>
          </div>
        </div>
      </div>

      {/* Information Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="text-purple-500 text-2xl">💡</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-purple-900 mb-2">
              How wEMARK Works
            </h3>
            <div className="text-purple-800 text-sm space-y-2">
              <p>
                <strong>1. Wrap:</strong> Convert your EMARK tokens to wEMARK to unlock voting power
              </p>
              <p>
                <strong>2. Delegate:</strong> Use your voting power to support your favorite Evermarks
              </p>
              <p>
                <strong>3. Earn:</strong> Get rewards based on delegation amount and consistency
              </p>
              <p>
                <strong>4. Unwrap:</strong> Convert back to EMARK anytime (with {formatUnbondingPeriod()} unbonding period)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Interface */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-4 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('wrap')}
            className={`px-6 py-4 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'wrap'
                ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            🔄 Wrapping
          </button>
          <button
            onClick={() => setActiveTab('delegation')}
            className={`px-6 py-4 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'delegation'
                ? 'border-b-2 border-purple-600 text-purple-600 bg-purple-50'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            🗳️ Delegation
          </button>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Quick Actions */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                  <div className="space-y-4">
                    {parseFloat(toEther(emarkBalance)) > 0 && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-blue-900">Wrap EMARK</h4>
                            <p className="text-sm text-blue-700">
                              Convert {parseFloat(toEther(emarkBalance)).toFixed(2)} EMARK to wEMARK
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveTab('wrap')}
                            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
                          >
                            Wrap Now
                          </button>
                        </div>
                      </div>
                    )}

                    {parseFloat(toEther(availableVotingPower)) > 0 && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-green-900">Delegate Votes</h4>
                            <p className="text-sm text-green-700">
                              Use {parseFloat(toEther(availableVotingPower)).toFixed(2)} voting power
                            </p>
                          </div>
                          <button
                            onClick={() => setActiveTab('delegation')}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                          >
                            Delegate
                          </button>
                        </div>
                      </div>
                    )}

                    {parseFloat(toEther(emarkBalance)) === 0 && parseFloat(toEther(wEmarkBalance)) === 0 && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                        <div className="text-gray-400 text-4xl mb-2">🪙</div>
                        <h4 className="font-medium text-gray-900 mb-1">No EMARK Tokens</h4>
                        <p className="text-sm text-gray-600 mb-4">
                          You need EMARK tokens to participate in delegation
                        </p>
                        <a
                          href="/leaderboard"
                          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 text-sm"
                        >
                          Explore Evermarks
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Current Status */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Token Value</span>
                        <span className="font-semibold">
                          {(parseFloat(toEther(emarkBalance)) + parseFloat(toEther(wEmarkBalance))).toFixed(2)} EMARK
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Wrapped Percentage</span>
                        <span className="font-semibold">
                          {parseFloat(toEther(emarkBalance)) + parseFloat(toEther(wEmarkBalance)) > 0
                            ? ((parseFloat(toEther(wEmarkBalance)) / (parseFloat(toEther(emarkBalance)) + parseFloat(toEther(wEmarkBalance)))) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Available for Delegation</span>
                        <span className="font-semibold text-green-600">
                          {parseFloat(toEther(availableVotingPower)).toFixed(2)} wEMARK
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick links */}
                  <div className="mt-6 flex flex-wrap gap-2">
                    <a
                      href="/leaderboard"
                      className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-50"
                    >
                      View Leaderboard
                    </a>
                    <a
                      href="/profile"
                      className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-50"
                    >
                      My Profile
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'wrap' && (
            <div className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Wrap & Unwrap Tokens</h3>
                <p className="text-gray-600 text-sm">
                  Convert between EMARK and wEMARK to manage your voting power. 
                  Remember: unwrapping has a {formatUnbondingPeriod()} unbonding period.
                </p>
              </div>
              
              {/* Delegation tip */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="text-purple-500 text-xl">💡</div>
                  <div>
                    <h4 className="font-medium text-purple-900 mb-1">Pro Tip</h4>
                    <p className="text-sm text-purple-800">
                      After wrapping, visit the <button 
                        onClick={() => setActiveTab('delegation')}
                        className="underline hover:no-underline font-medium"
                      >
                        Delegation tab
                      </button> to use your new voting power and start earning rewards!
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Wrap Section */}
                <div className="bg-blue-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-blue-900 mb-4">Wrap EMARK → wEMARK</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-blue-800 mb-2">
                        Amount to Wrap
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={wrapAmount}
                          onChange={(e) => setWrapAmount(e.target.value)}
                          placeholder="0.0"
                          className="flex-1 px-3 py-2 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => setWrapAmount(toEther(emarkBalance))}
                          className="px-3 py-2 text-sm bg-blue-200 text-blue-800 rounded hover:bg-blue-300"
                        >
                          Max
                        </button>
                      </div>
                      <p className="text-xs text-blue-700 mt-1">
                        Available: {parseFloat(toEther(emarkBalance)).toFixed(4)} EMARK
                      </p>
                    </div>
                    <button
                      onClick={handleWrap}
                      disabled={isWrapping || !wrapAmount || parseFloat(wrapAmount) <= 0}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isWrapping ? 'Wrapping...' : 'Wrap Tokens'}
                    </button>
                  </div>
                </div>

                {/* Unwrap Section */}
                <div className="bg-orange-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-orange-900 mb-4">Unwrap wEMARK → EMARK</h4>
                  
                  {/* Unbonding status */}
                  {unbondingAmount > BigInt(0) && (
                    <div className="bg-orange-100 border border-orange-200 rounded-lg p-4 mb-4">
                      <h5 className="font-medium text-orange-900 mb-2">Unbonding in Progress</h5>
                      <div className="text-sm text-orange-800 space-y-1">
                        <p>Amount: {parseFloat(toEther(unbondingAmount)).toFixed(4)} wEMARK</p>
                        <p>
                          Status: {canClaimUnbonding ? 'Ready to claim!' : `Unbonding until ${new Date(Number(unbondingReleaseTime) * 1000).toLocaleString()}`}
                        </p>
                      </div>
                      <div className="flex gap-2 mt-3">
                        {canClaimUnbonding ? (
                          <button
                            onClick={handleCompleteUnwrap}
                            disabled={isUnwrapping}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            {isUnwrapping ? 'Claiming...' : 'Claim EMARK'}
                          </button>
                        ) : (
                          <button
                            onClick={handleCancelUnbonding}
                            disabled={isUnwrapping}
                            className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700 disabled:opacity-50"
                          >
                            {isUnwrapping ? 'Canceling...' : 'Cancel Unbonding'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-orange-800 mb-2">
                        Amount to Unwrap
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={unwrapAmount}
                          onChange={(e) => setUnwrapAmount(e.target.value)}
                          placeholder="0.0"
                          className="flex-1 px-3 py-2 border border-orange-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <button
                          onClick={() => setUnwrapAmount(toEther(wEmarkBalance))}
                          className="px-3 py-2 text-sm bg-orange-200 text-orange-800 rounded hover:bg-orange-300"
                        >
                          Max
                        </button>
                      </div>
                      <p className="text-xs text-orange-700 mt-1">
                        Available: {parseFloat(toEther(wEmarkBalance)).toFixed(4)} wEMARK
                      </p>
                    </div>
                    <button
                      onClick={handleRequestUnwrap}
                      disabled={isUnwrapping || !unwrapAmount || parseFloat(unwrapAmount) <= 0}
                      className="w-full bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUnwrapping ? 'Starting Unwrap...' : `Start Unwrap (${formatUnbondingPeriod()} wait)`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'delegation' && (
            <div className="p-0">
              <DelegationHistory className="border-0 shadow-none bg-transparent" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}