import React, { useState, useMemo } from 'react';
import { useReadContract } from "thirdweb/react";
import { getContract } from "thirdweb";
import { client } from "../../lib/thirdweb";
import { CHAIN, CONTRACTS, REWARDS_ABI, EMARK_TOKEN_ABI, FEE_COLLECTOR_ABI } from "../../lib/contracts";
import {
  ShieldCheckIcon,
  CoinsIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  DollarSignIcon,
  DatabaseIcon,
} from 'lucide-react';
import { useTransactionUtils } from '../../hooks/core/useTransactionUtils';
import { useUserData } from '../../hooks/core/useUserData';
import { useWalletAuth } from "../../providers/WalletProvider";
import { toWei } from "thirdweb/utils";

// Dev wallet address
const DEV_WALLET_ADDRESS = "0x2B27EA7DaA8Bf1dE98407447b269Dfe280753fe3";

export const DevRewardsDashboard: React.FC = () => {
  const { address } = useWalletAuth();
  const [ethAmount, setEthAmount] = useState("");
  const [wethAmount, setWethAmount] = useState("");
  const [emarkAmount, setEmarkAmount] = useState("");
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ✅ Create contracts manually since rewards might not be in useContracts()
  const { executeTransaction, isProcessing } = useTransactionUtils();
  const { balances, refetch } = useUserData(address);

  // Only show for dev wallet
  const isDevWallet = address && address.toLowerCase() === DEV_WALLET_ADDRESS.toLowerCase();

  // ✅ Create contracts using proper ThirdWeb v5 pattern
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

  // ✅ Use proper ThirdWeb v5 syntax
  const { data: periodStatus, refetch: refetchPeriodStatus } = useReadContract({
    contract: rewardsContract,
    method: "function getPeriodStatus() view returns (uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)",
    params: [],
  });

  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    contract: emarkContract,
    method: "function allowance(address,address) view returns (uint256)",
    params: [address || "0x0000000000000000000000000000000000000000", CONTRACTS.REWARDS],
    queryOptions: {
      enabled: !!address,
    },
  });

  const { data: feeCollectorEvermarkRewards } = useReadContract({
    contract: feeCollectorContract,
    method: "function evermarkRewards() view returns (address)",
    params: [],
  });

  const { data: totalEthCollected } = useReadContract({
    contract: feeCollectorContract,
    method: "function totalEthCollected() view returns (uint256)",
    params: [],
  });

  const clearMessage = () => {
    setTimeout(() => setMessage(null), 5000);
  };

  // ✅ Simplified using core transaction utilities
  const fundEthRewards = async () => {
    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid ETH amount' });
      clearMessage();
      return;
    }

    try {
      const amountWei = toWei(ethAmount);
      setMessage({ type: 'success', text: 'Funding ETH rewards pool...' });

      const result = await executeTransaction(
        CONTRACTS.REWARDS,
        REWARDS_ABI,
        "fundEthRewards",
        [],
        {
          value: amountWei,
          successMessage: `✅ Successfully funded ${ethAmount} ETH to rewards pool!`,
          errorContext: {
            operation: 'fundEthRewards',
            contract: 'REWARDS',
            amount: ethAmount,
            methodName: 'fundEthRewards',
            userAddress: address
          }
        }
      );

      if (result.success) {
        setEthAmount("");
        setTimeout(() => {
          refetchPeriodStatus();
          refetch();
        }, 2000);
      }

      setMessage({ 
        type: result.success ? 'success' : 'error', 
        text: result.message || result.error || 'Transaction completed'
      });
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: `Failed to fund ETH rewards: ${error.message || 'Unknown error'}` 
      });
    } finally {
      if (message?.type === 'error') {
        clearMessage();
      }
    }
  };

  // ✅ Simplified using core transaction utilities
  const fundWethRewards = async () => {
    if (!wethAmount || parseFloat(wethAmount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid WETH amount' });
      clearMessage();
      return;
    }

    try {
      const amountWei = toWei(wethAmount);
      setMessage({ type: 'success', text: 'Funding WETH rewards pool...' });

      const result = await executeTransaction(
        CONTRACTS.REWARDS,
        REWARDS_ABI,
        "fundWethRewards",
        [amountWei],
        {
          successMessage: `✅ Successfully funded ${wethAmount} WETH to rewards pool!`,
          errorContext: {
            operation: 'fundWethRewards',
            contract: 'REWARDS',
            amount: wethAmount,
            methodName: 'fundWethRewards',
            userAddress: address
          }
        }
      );

      if (result.success) {
        setWethAmount("");
        setTimeout(() => {
          refetchPeriodStatus();
          refetch();
        }, 2000);
      }

      setMessage({ 
        type: result.success ? 'success' : 'error', 
        text: result.message || result.error || 'Transaction completed'
      });
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: `Failed to fund WETH rewards: ${error.message || 'Unknown error'}` 
      });
    } finally {
      if (message?.type === 'error') {
        clearMessage();
      }
    }
  };

  // ✅ Simplified using core transaction utilities with approval logic
  const fundEmarkRewards = async () => {
    if (!emarkAmount || parseFloat(emarkAmount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid EMARK amount' });
      clearMessage();
      return;
    }

    try {
      const amountWei = toWei(emarkAmount);
      const currentAllowanceBigInt = currentAllowance || BigInt(0);

      // Check if approval is needed
      if (currentAllowanceBigInt < amountWei) {
        setMessage({ type: 'success', text: 'Step 1/2: Requesting EMARK approval...' });

        const approveResult = await executeTransaction(
          CONTRACTS.EMARK_TOKEN,
          EMARK_TOKEN_ABI,
          "approve",
          [CONTRACTS.REWARDS, amountWei],
          {
            errorContext: { operation: 'approve-for-rewards', amount: emarkAmount }
          }
        );

        if (!approveResult.success) {
          throw new Error(approveResult.error || 'Approval failed');
        }

        // Wait for approval confirmation
        await new Promise(resolve => setTimeout(resolve, 3000));
        await refetchAllowance();
      }

      // Step 2: Fund the rewards
      setMessage({ type: 'success', text: 'Step 2/2: Funding rewards pool...' });

      const result = await executeTransaction(
        CONTRACTS.REWARDS,
        REWARDS_ABI,
        "fundEmarkRewards",
        [amountWei],
        {
          successMessage: `✅ Successfully funded ${emarkAmount} EMARK to rewards pool!`,
          errorContext: {
            operation: 'fundEmarkRewards',
            contract: 'REWARDS',
            amount: emarkAmount,
            methodName: 'fundEmarkRewards',
            userAddress: address
          }
        }
      );

      if (result.success) {
        setEmarkAmount("");
        setTimeout(() => {
          refetchPeriodStatus();
          refetchAllowance();
          refetch();
        }, 2000);
      }

      setMessage({ 
        type: result.success ? 'success' : 'error', 
        text: result.message || result.error || 'Transaction completed'
      });
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: `Failed to fund EMARK rewards: ${error.message || 'Unknown error'}` 
      });
    } finally {
      if (message?.type === 'error') {
        clearMessage();
      }
    }
  };

  const manualRebalance = async () => {
    try {
      const result = await executeTransaction(
        CONTRACTS.REWARDS,
        REWARDS_ABI,
        "manualRebalance",
        [],
        {
          successMessage: 'Successfully triggered manual rebalance!',
          errorContext: {
            operation: 'manualRebalance',
            contract: 'REWARDS',
            methodName: 'manualRebalance',
            userAddress: address
          }
        }
      );

      if (result.success) {
        setTimeout(() => refetchPeriodStatus(), 3000);
      }

      setMessage({ 
        type: result.success ? 'success' : 'error', 
        text: result.message || result.error || 'Transaction completed'
      });
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: `Failed to trigger rebalance: ${error.message || 'Unknown error'}` 
      });
    } finally {
      clearMessage();
    }
  };

  if (!isDevWallet) {
    return null;
  }

  // Parse period status using your core data
  const currentEthPool = periodStatus?.[3] ? (Number(periodStatus[3]) / 1e18).toFixed(4) : "0";
  const currentEmarkPool = periodStatus?.[4] ? (Number(periodStatus[4]) / 1e18).toFixed(2) : "0";
  const currentEthRate = periodStatus?.[5]?.toString() || "0";
  const currentEmarkRate = periodStatus?.[6]?.toString() || "0";
  const nextEthRate = periodStatus?.[7]?.toString() || "0";
  const nextEmarkRate = periodStatus?.[8]?.toString() || "0";

  const feeCollectorConfigured = feeCollectorEvermarkRewards === CONTRACTS.REWARDS;
  const hasEthPool = parseFloat(currentEthPool) > 0;
  const hasEmarkPool = parseFloat(currentEmarkPool) > 0;

  // Show allowance info using core balance data
  const currentAllowanceFormatted = currentAllowance ? (Number(currentAllowance) / 1e18).toFixed(2) : "0";
  const needsApproval = emarkAmount && currentAllowance ? 
    currentAllowance < toWei(emarkAmount) : true;

  const ethBalanceFormatted = "Check wallet"; // Could use balances.ethBalance if available

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

      {/* Current Status - Three pools */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">ETH Pool</span>
            <DollarSignIcon className="h-4 w-4 text-gray-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">{currentEthPool} ETH</p>
          <p className="text-xs text-gray-600">Rate: {currentEthRate} per second</p>
          {!hasEthPool && (
            <p className="text-xs text-amber-600 mt-1">⚠️ Pool empty</p>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">WETH Pool</span>
            <DatabaseIcon className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-gray-900">0.00 WETH</p>
          <p className="text-xs text-gray-600">Rate: 0 per second</p>
          <p className="text-xs text-amber-600 mt-1">⚠️ Pool empty</p>
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
      </div>

      {/* Triple funding interface */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Fund ETH */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">⚫ Fund ETH Pool</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Your Balance: {ethBalanceFormatted} ETH
              </label>
              <input
                type="number"
                placeholder="Amount in ETH"
                value={ethAmount}
                onChange={(e) => setEthAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                disabled={isProcessing}
              />
            </div>
            <button
              onClick={fundEthRewards}
              disabled={isProcessing || !ethAmount}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isProcessing ? (
                <>
                  <RefreshCwIcon className="h-3 w-3 mr-1 inline-block animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <DollarSignIcon className="h-3 w-3 mr-1 inline-block" />
                  Fund ETH Pool
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
                WETH Balance: 0.00 WETH
              </label>
              <input
                type="number"
                placeholder="Amount in WETH"
                value={wethAmount}
                onChange={(e) => setWethAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                disabled={isProcessing}
              />
            </div>
            <button
              onClick={fundWethRewards}
              disabled={isProcessing || !wethAmount}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isProcessing ? (
                <>
                  <RefreshCwIcon className="h-3 w-3 mr-1 inline-block animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CoinsIcon className="h-3 w-3 mr-1 inline-block" />
                  Fund WETH Pool
                </>
              )}
            </button>
          </div>
        </div>

        {/* Fund EMARK */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">💜 Fund EMARK Pool</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Your Balance: {balances.emarkBalance ? (Number(balances.emarkBalance) / 1e18).toFixed(2) : "0"} EMARK
              </label>
              <label className="block text-xs text-gray-500 mb-1">
                Current Allowance: {currentAllowanceFormatted} EMARK
              </label>
              <input
                type="number"
                placeholder="Amount in EMARK"
                value={emarkAmount}
                onChange={(e) => setEmarkAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                disabled={isProcessing}
              />
              {emarkAmount && (
                <p className="text-xs mt-1">
                  {needsApproval ? (
                    <span className="text-amber-600">⚠️ Requires approval + funding</span>
                  ) : (
                    <span className="text-green-600">✅ Ready to fund (sufficient allowance)</span>
                  )}
                </p>
              )}
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
                  {needsApproval && emarkAmount ? 'Approve & Fund EMARK' : 'Fund EMARK Pool'}
                </>
              )}
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
            onClick={() => {
              refetchPeriodStatus();
              refetchAllowance();
              refetch();
            }}
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
            <div>Current Allowance: {currentAllowanceFormatted} EMARK</div>
            <div>Needs Approval: {needsApproval ? "Yes" : "No"}</div>
          </div>
        </details>
      </div>

      <div className="mt-4 p-3 bg-amber-50 rounded border border-amber-200">
        <p className="text-xs text-amber-800">
          💡 <strong>Triple-Token Funding:</strong> You can now fund ETH, WETH, and EMARK pools independently. 
          ETH funding sends native ETH directly. WETH funding requires WETH tokens. EMARK funding requires approval first.
          Each pool creates separate reward streams for stakers.
        </p>
      </div>
    </div>
  );
};