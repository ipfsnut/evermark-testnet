import React, { useState, useMemo } from 'react';
import { useReadContract, useSendTransaction } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { client } from "../../lib/thirdweb";
import { CHAIN, CONTRACTS, REWARDS_ABI, EMARK_TOKEN_ABI, FEE_COLLECTOR_ABI } from "../../lib/contracts";
import { useWalletAuth } from "../../providers/WalletProvider";
import { toWei, toEther } from "thirdweb/utils";
import {
  ShieldCheckIcon,
  CoinsIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  TrendingUpIcon,
  DatabaseIcon,
  ArrowRightIcon
} from 'lucide-react';

// Dev wallet address (replace with your actual dev wallet)
const DEV_WALLET_ADDRESS = "0x2B27EA7DaA8Bf1dE98407447b269Dfe280753fe3";

export const DevRewardsDashboard: React.FC = () => {
  const { address } = useWalletAuth();
  const [emarkAmount, setEmarkAmount] = useState("");
  const [wethAmount, setWethAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Only show for dev wallet
  const isDevWallet = address && address.toLowerCase() === DEV_WALLET_ADDRESS.toLowerCase();

  const rewardsContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.REWARDS,
    abi: REWARDS_ABI,
  }), []);

  const emarkContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.EMARK_TOKEN,
    abi: EMARK_TOKEN_ABI,
  }), []);

  const feeCollectorContract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.FEE_COLLECTOR,
    abi: FEE_COLLECTOR_ABI,
  }), []);

  // Get current period status
  const { data: periodStatus, refetch: refetchPeriodStatus } = useReadContract({
    contract: rewardsContract,
    method: "getPeriodStatus",
    params: [],
  });

  // Get dev's EMARK balance
  const { data: devEmarkBalance } = useReadContract({
    contract: emarkContract,
    method: "balanceOf",
    params: [address || "0x0000000000000000000000000000000000000000"],
    queryOptions: {
      enabled: !!address,
    },
  });

  // Get FeeCollector status
  const { data: feeCollectorEvermarkRewards } = useReadContract({
    contract: feeCollectorContract,
    method: "evermarkRewards",
    params: [],
  });

  const { data: totalEthCollected } = useReadContract({
    contract: feeCollectorContract,
    method: "totalEthCollected",
    params: [],
  });

  const { mutate: sendTransaction } = useSendTransaction();

  const clearMessage = () => {
    setTimeout(() => setMessage(null), 5000);
  };

  const fundEmarkRewards = async () => {
    if (!emarkAmount || parseFloat(emarkAmount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid EMARK amount' });
      clearMessage();
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      // Step 1: Approve
      const approveTransaction = prepareContractCall({
        contract: emarkContract,
        method: "approve",
        params: [CONTRACTS.REWARDS, toWei(emarkAmount)],
      });

      await new Promise<void>((resolve, reject) => {
        sendTransaction(approveTransaction, {
          onSuccess: () => {
            console.log("✅ EMARK approval successful");
            resolve();
          },
          onError: (error) => {
            console.error("❌ EMARK approval failed:", error);
            reject(error);
          }
        });
      });

      // Wait a moment for approval
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Fund
      const fundTransaction = prepareContractCall({
        contract: rewardsContract,
        method: "fundEmarkRewards",
        params: [toWei(emarkAmount)],
      });

      await new Promise<void>((resolve, reject) => {
        sendTransaction(fundTransaction, {
          onSuccess: () => {
            console.log("✅ EMARK funding successful");
            setMessage({ 
              type: 'success', 
              text: `Successfully funded ${emarkAmount} EMARK to rewards pool!` 
            });
            setEmarkAmount("");
            setTimeout(() => refetchPeriodStatus(), 3000);
            resolve();
          },
          onError: (error) => {
            console.error("❌ EMARK funding failed:", error);
            reject(error);
          }
        });
      });

    } catch (error: any) {
      console.error("Error funding EMARK rewards:", error);
      setMessage({ 
        type: 'error', 
        text: `Failed to fund EMARK rewards: ${error.message || 'Unknown error'}` 
      });
    } finally {
      setIsProcessing(false);
      clearMessage();
    }
  };

  const fundWethRewards = async () => {
    if (!wethAmount || parseFloat(wethAmount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid WETH amount' });
      clearMessage();
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      // For WETH funding, you'd need to:
      // 1. Have WETH tokens
      // 2. Approve EvermarkRewards to spend WETH
      // 3. Call fundWethRewards
      
      // This is a simplified version - you might need to wrap ETH to WETH first
      setMessage({ 
        type: 'error', 
        text: 'WETH funding not implemented yet. Use FeeCollector for ETH routing.' 
      });
      
    } catch (error: any) {
      console.error("Error funding WETH rewards:", error);
      setMessage({ 
        type: 'error', 
        text: `Failed to fund WETH rewards: ${error.message || 'Unknown error'}` 
      });
    } finally {
      setIsProcessing(false);
      clearMessage();
    }
  };

  const manualRebalance = async () => {
    setIsProcessing(true);
    setMessage(null);

    try {
      const transaction = prepareContractCall({
        contract: rewardsContract,
        method: "manualRebalance",
        params: [],
      });

      await new Promise<void>((resolve, reject) => {
        sendTransaction(transaction, {
          onSuccess: () => {
            setMessage({ 
              type: 'success', 
              text: 'Successfully triggered manual rebalance!' 
            });
            setTimeout(() => refetchPeriodStatus(), 3000);
            resolve();
          },
          onError: (error) => {
            console.error("❌ Manual rebalance failed:", error);
            reject(error);
          }
        });
      });

    } catch (error: any) {
      console.error("Error triggering rebalance:", error);
      setMessage({ 
        type: 'error', 
        text: `Failed to trigger rebalance: ${error.message || 'Unknown error'}` 
      });
    } finally {
      setIsProcessing(false);
      clearMessage();
    }
  };

  if (!isDevWallet) {
    return null; // Don't show anything for non-dev wallets
  }

  // Parse period status
  const currentEthPool = periodStatus?.[3] ? toEther(periodStatus[3]) : "0";
  const currentEmarkPool = periodStatus?.[4] ? toEther(periodStatus[4]) : "0";
  const currentEthRate = periodStatus?.[5]?.toString() || "0";
  const currentEmarkRate = periodStatus?.[6]?.toString() || "0";
  const nextEthRate = periodStatus?.[7]?.toString() || "0";
  const nextEmarkRate = periodStatus?.[8]?.toString() || "0";

  const feeCollectorConfigured = feeCollectorEvermarkRewards === CONTRACTS.REWARDS;
  const hasEthPool = parseFloat(currentEthPool) > 0;
  const hasEmarkPool = parseFloat(currentEmarkPool) > 0;

  return (
    <div className="mt-8 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg shadow-sm p-6 border-2 border-red-200">
      <div className="flex items-center mb-4">
        <ShieldCheckIcon className="h-6 w-6 text-red-600 mr-2" />
        <h3 className="text-lg font-semibold text-red-900">🔧 Dev Rewards Dashboard</h3>
        <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
          DEV ONLY
        </span>
      </div>

      {/* Status Messages */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg border flex items-center ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircleIcon className="h-4 w-4 mr-2" />
          ) : (
            <AlertTriangleIcon className="h-4 w-4 mr-2" />
          )}
          <span className="text-sm">{message.text}</span>
        </div>
      )}

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">WETH Pool</span>
            <DatabaseIcon className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">{currentEthPool} WETH</p>
          <p className="text-xs text-gray-600">Rate: {currentEthRate} per second</p>
          {!hasEthPool && (
            <p className="text-xs text-amber-600 mt-1">⚠️ Pool empty</p>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">EMARK Pool</span>
            <CoinsIcon className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">{currentEmarkPool} EMARK</p>
          <p className="text-xs text-gray-600">Rate: {currentEmarkRate} per second</p>
          {!hasEmarkPool && (
            <p className="text-xs text-amber-600 mt-1">⚠️ Pool empty</p>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">FeeCollector</span>
            <TrendingUpIcon className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-sm font-bold text-gray-900">
            {feeCollectorConfigured ? "✅ Configured" : "❌ Not configured"}
          </p>
          <p className="text-xs text-gray-600">
            Total Collected: {totalEthCollected ? toEther(totalEthCollected) : "0"} ETH
          </p>
        </div>
      </div>

      {/* Funding Interface */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Fund EMARK */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">💜 Fund EMARK Pool</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Your Balance: {devEmarkBalance ? toEther(devEmarkBalance) : "0"} EMARK
              </label>
              <input
                type="number"
                placeholder="Amount in EMARK"
                value={emarkAmount}
                onChange={(e) => setEmarkAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                disabled={isProcessing}
              />
            </div>
            <button
              onClick={fundEmarkRewards}
              disabled={isProcessing || !emarkAmount}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isProcessing ? (
                <>
                  <RefreshCwIcon className="h-3 w-3 mr-1 inline-block animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CoinsIcon className="h-3 w-3 mr-1 inline-block" />
                  Fund EMARK Pool
                </>
              )}
            </button>
          </div>
        </div>

        {/* Fund WETH */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">💙 Fund WETH Pool</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Amount to fund (WETH)
              </label>
              <input
                type="number"
                placeholder="Amount in WETH"
                value={wethAmount}
                onChange={(e) => setWethAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                disabled={true} // Disabled for now
              />
            </div>
            <button
              onClick={fundWethRewards}
              disabled={true} // Disabled for now
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <CoinsIcon className="h-3 w-3 mr-1 inline-block" />
              Fund WETH Pool (Coming Soon)
            </button>
          </div>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-3">⚡ Admin Actions</h4>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={manualRebalance}
            disabled={isProcessing}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors disabled:opacity-50 text-sm"
          >
            <RefreshCwIcon className="h-3 w-3 mr-1 inline-block" />
            Trigger Manual Rebalance
          </button>
          
          <button
            onClick={() => refetchPeriodStatus()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
          >
            <RefreshCwIcon className="h-3 w-3 mr-1 inline-block" />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Debug Info */}
      <div className="mt-4 p-3 bg-gray-50 rounded border border-gray-200">
        <details className="text-xs text-gray-600">
          <summary className="cursor-pointer font-medium text-gray-700 mb-2">
            🔍 Debug Information
          </summary>
          <div className="space-y-1 font-mono">
            <div>Rewards Contract: {CONTRACTS.REWARDS}</div>
            <div>FeeCollector Points To: {feeCollectorEvermarkRewards || "Not set"}</div>
            <div>Current ETH Rate: {currentEthRate} wei/second</div>
            <div>Current EMARK Rate: {currentEmarkRate} wei/second</div>
            <div>Next ETH Rate: {nextEthRate} wei/second</div>
            <div>Next EMARK Rate: {nextEmarkRate} wei/second</div>
            <div>Period Status Available: {periodStatus ? "Yes" : "No"}</div>
          </div>
        </details>
      </div>

      <div className="mt-4 p-3 bg-amber-50 rounded border border-amber-200">
        <p className="text-xs text-amber-800">
          💡 <strong>Debug Notes:</strong> Based on your transaction logs, 100 ETH was processed through FeeCollector. 
          If pools are still empty, check the fee destination configuration or try manual rebalance.
        </p>
      </div>
    </div>
  );
};