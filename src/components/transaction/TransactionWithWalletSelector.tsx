// src/components/transaction/TransactionWithWalletSelector.tsx
// Example of how to integrate wallet selector with transactions

import React, { useState } from 'react';
import { useSendTransaction, useActiveAccount } from "thirdweb/react";
import { getContract, prepareContractCall } from "thirdweb";
import { WalletSelector } from '../wallet/WalletSelector';
import { useWalletLinking } from '../../hooks/useWalletLinking';
import { client } from "../../lib/thirdweb";
import { CHAIN, CONTRACTS, EVERMARK_NFT_ABI } from "../../lib/contracts";
import { 
  AlertCircleIcon, 
  CheckCircleIcon, 
  SendIcon, 
  InfoIcon 
} from 'lucide-react';

interface TransactionExampleProps {
  onSuccess?: (txHash: string) => void;
  onError?: (error: string) => void;
}

export const TransactionWithWalletSelector: React.FC<TransactionExampleProps> = ({
  onSuccess,
  onError
}) => {
  const account = useActiveAccount();
  const { mutate: sendTransaction } = useSendTransaction();
  const { getWalletDisplayInfo, primaryWallet } = useWalletLinking();

  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [isTransacting, setIsTransacting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Example transaction data
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');

  const effectiveWallet = selectedWallet || primaryWallet || account?.address;
  const walletInfo = effectiveWallet ? getWalletDisplayInfo(effectiveWallet) : null;

  const handleTransaction = async () => {
    if (!effectiveWallet) {
      setError('Please select a wallet for the transaction');
      return;
    }

    if (!walletInfo?.isConnected && walletInfo?.type !== 'farcaster-verified') {
      setError('Selected wallet is not connected. Please connect it first.');
      return;
    }

    if (!title.trim() || !author.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setIsTransacting(true);
    setError(null);
    setSuccess(null);
    setTxHash(null);

    try {
      // Prepare the contract call
      const contract = getContract({
        client,
        chain: CHAIN,
        address: CONTRACTS.EVERMARK_NFT,
        abi: EVERMARK_NFT_ABI,
      });

      const transaction = prepareContractCall({
        contract,
        method: "mintEvermark",
        params: [
          "", // metadataURI - empty for this example
          title.trim(),
          author.trim(),
        ],
        value: BigInt("70000000000000"), // MINTING_FEE (0.001 ETH)
      });

      // Execute transaction using the selected wallet
      // Note: In a full implementation, you'd need to ensure the correct wallet is connected
      // This might involve switching accounts or using specific wallet connections
      await sendTransaction(transaction as any, {
        onSuccess: (result: any) => {
          const hash = result.transactionHash;
          setTxHash(hash);
          setSuccess('Transaction completed successfully!');
          onSuccess?.(hash);
        },
        onError: (error: any) => {
          const errorMsg = error.message || 'Transaction failed';
          setError(errorMsg);
          onError?.(errorMsg);
        }
      });

    } catch (err: any) {
      const errorMsg = err.message || 'Failed to execute transaction';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsTransacting(false);
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
    setTxHash(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Evermark with Wallet Selection</h3>
      
      <div className="space-y-6">
        {/* Wallet Selection */}
        <div>
          <WalletSelector
            selectedWallet={selectedWallet}
            onWalletSelected={setSelectedWallet}
            requireConnection={true}
            showLabel={true}
          />
          
          {/* Wallet Status Info */}
          {walletInfo && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <span className="text-gray-600">Status:</span>
                  <div className="ml-2 flex items-center">
                    {walletInfo.isConnected ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-1" />
                        <span className="text-green-700">Connected & Ready</span>
                      </>
                    ) : walletInfo.type === 'farcaster-verified' ? (
                      <>
                        <div className="w-2 h-2 bg-purple-500 rounded-full mr-1" />
                        <span className="text-purple-700">Farcaster Verified</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-orange-500 rounded-full mr-1" />
                        <span className="text-orange-700">Not Connected</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="text-gray-500">
                  Type: {walletInfo.type.replace('-', ' ')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Transaction Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter evermark title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Author *
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Enter author name"
            />
          </div>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircleIcon className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-700 font-medium">Transaction Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={clearMessages}
              className="text-red-600 hover:text-red-800 ml-2"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-green-700 font-medium">Transaction Successful!</p>
              <p className="text-green-600 text-sm mt-1">{success}</p>
              {txHash && (
                <p className="text-green-600 text-xs mt-2 font-mono break-all">
                  TX: {txHash}
                </p>
              )}
            </div>
            <button
              onClick={clearMessages}
              className="text-green-600 hover:text-green-800 ml-2"
            >
              ×
            </button>
          </div>
        )}

        {/* Transaction Info */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <InfoIcon className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Transaction Details:</p>
              <ul className="space-y-1 text-xs">
                <li>• Network: Base</li>
                <li>• Contract: Evermark NFT</li>
                <li>• Fee: 0.001 ETH</li>
                <li>• Selected Wallet: {walletInfo?.label || 'None'}</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={handleTransaction}
          disabled={
            isTransacting || 
            !effectiveWallet || 
            !title.trim() || 
            !author.trim() ||
            (walletInfo?.type === 'manually-added')
          }
          className="w-full flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isTransacting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Executing Transaction...
            </>
          ) : (
            <>
              <SendIcon className="h-5 w-5 mr-2" />
              Create Evermark
            </>
          )}
        </button>

        {/* Disabled State Messages */}
        {walletInfo?.type === 'manually-added' && (
          <p className="text-sm text-orange-600 text-center">
            Watch-only addresses cannot execute transactions
          </p>
        )}
      </div>
    </div>
  );
};