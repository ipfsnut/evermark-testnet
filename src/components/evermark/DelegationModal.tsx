import React, { useState, useEffect } from 'react';
import { 
  X as XIcon, 
  ZapIcon, 
  InfoIcon, 
  CheckCircleIcon, 
  AlertCircleIcon,
  LoaderIcon,
  TrendingUpIcon,
  CoinsIcon,
  VoteIcon
} from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';
import { useWalletConnection } from '../../providers/WalletProvider';
import { WalletConnect } from '../ConnectButton';
import { cn } from '../../utils/responsive';

interface DelegationModalProps {
  isOpen: boolean;
  onClose: () => void;
  evermarkId: string;
  evermarkTitle: string;
  currentVotes?: bigint;
}

export const DelegationModal: React.FC<DelegationModalProps> = ({
  isOpen,
  onClose,
  evermarkId,
  evermarkTitle,
  currentVotes
}) => {
  const { canInteract, isConnected, walletType, isInFarcaster } = useWalletConnection();
  
  const [delegationAmount, setDelegationAmount] = useState('');
  const [isDelegating, setIsDelegating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userBalance, setUserBalance] = useState<string>('0');
  const [currentDelegation, setCurrentDelegation] = useState<string>('0');

  // Mock functions - replace with actual contract calls
  const fetchUserBalance = async () => {
    // TODO: Replace with actual $WEMARK balance query
    setUserBalance('1000');
  };

  const fetchCurrentDelegation = async () => {
    // TODO: Replace with actual delegation query for this Evermark
    setCurrentDelegation('50');
  };

  const handleDelegate = async () => {
    if (!canInteract) {
      setError('Please connect your wallet to delegate $WEMARK');
      return;
    }

    const amount = parseFloat(delegationAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amount > parseFloat(userBalance)) {
      setError('Insufficient $WEMARK balance');
      return;
    }

    setIsDelegating(true);
    setError(null);

    try {
      // TODO: Replace with actual delegation contract call
      await new Promise(resolve => setTimeout(resolve, 2000)); // Mock delay
      
      setSuccess(`Successfully delegated ${amount} $WEMARK to this Evermark!`);
      setDelegationAmount('');
      
      // Update current delegation
      setCurrentDelegation((parseFloat(currentDelegation) + amount).toString());
      
      // Close modal after success
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
      
    } catch (error) {
      console.error('Delegation failed:', error);
      setError('Delegation failed. Please try again.');
    } finally {
      setIsDelegating(false);
    }
  };

  const handleUndelegate = async () => {
    if (!canInteract) {
      setError('Please connect your wallet to undelegate $WEMARK');
      return;
    }

    const currentAmount = parseFloat(currentDelegation);
    if (currentAmount <= 0) {
      setError('No $WEMARK currently delegated to this Evermark');
      return;
    }

    setIsDelegating(true);
    setError(null);

    try {
      // TODO: Replace with actual undelegation contract call
      await new Promise(resolve => setTimeout(resolve, 2000)); // Mock delay
      
      setSuccess(`Successfully undelegated ${currentAmount} $WEMARK from this Evermark!`);
      setCurrentDelegation('0');
      
      // Close modal after success
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);
      
    } catch (error) {
      console.error('Undelegation failed:', error);
      setError('Undelegation failed. Please try again.');
    } finally {
      setIsDelegating(false);
    }
  };

  // Format votes for display
  const formatVotes = (votes: bigint): string => {
    const voteNumber = Number(votes) / 1e18;
    if (voteNumber >= 1000000) {
      return `${(voteNumber / 1000000).toFixed(1)}M`;
    } else if (voteNumber >= 1000) {
      return `${(voteNumber / 1000).toFixed(1)}K`;
    } else if (voteNumber >= 1) {
      return voteNumber.toFixed(0);
    } else if (voteNumber >= 0.1) {
      return voteNumber.toFixed(1);
    } else if (voteNumber > 0) {
      return voteNumber.toFixed(2);
    } else {
      return '0';
    }
  };

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen && canInteract) {
      fetchUserBalance();
      fetchCurrentDelegation();
    }
  }, [isOpen, canInteract]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(null);
      setDelegationAmount('');
      setIsDelegating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        'relative bg-gray-900 border border-green-400/50 rounded-lg shadow-2xl shadow-green-500/20',
        'max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden',
        'animate-in zoom-in-95 duration-200'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center">
              <ZapIcon className="h-5 w-5 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-green-400">Delegate $WEMARK</h2>
              <p className="text-sm text-gray-400">Support this Evermark</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Evermark Info */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <h3 className="font-semibold text-white mb-2 line-clamp-2">
              {evermarkTitle}
            </h3>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Current Votes:</span>
              <span className="text-green-400 font-bold">
                {currentVotes ? formatVotes(currentVotes) : '0'} $WEMARK
              </span>
            </div>
          </div>

          {/* Connection Status */}
          {!canInteract ? (
            <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircleIcon className="h-5 w-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-yellow-300 font-medium mb-2">Wallet Connection Required</h4>
                  <p className="text-yellow-400 text-sm mb-3">
                    {isInFarcaster 
                      ? "Link a wallet to your Farcaster profile to delegate $WEMARK tokens."
                      : "Connect your wallet to delegate $WEMARK tokens to this Evermark."
                    }
                  </p>
                  <WalletConnect />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Balance Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
                  <CoinsIcon className="h-6 w-6 text-green-400 mx-auto mb-2" />
                  <div className="text-lg font-bold text-white">{userBalance}</div>
                  <div className="text-xs text-gray-400">Available $WEMARK</div>
                </div>
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
                  <VoteIcon className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                  <div className="text-lg font-bold text-white">{currentDelegation}</div>
                  <div className="text-xs text-gray-400">Currently Delegated</div>
                </div>
              </div>

              {/* Delegation Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Delegation Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={delegationAmount}
                      onChange={(e) => setDelegationAmount(e.target.value)}
                      placeholder="Enter amount to delegate"
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-transparent text-white placeholder-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setDelegationAmount(userBalance)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-green-600 text-black text-xs font-bold rounded hover:bg-green-500 transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleDelegate}
                    disabled={isDelegating || !delegationAmount || parseFloat(delegationAmount) <= 0}
                    className={cn(
                      'flex-1 flex items-center justify-center px-4 py-3 rounded-lg font-bold transition-all duration-200',
                      'bg-gradient-to-r from-green-400 to-green-600 text-black',
                      'hover:from-green-300 hover:to-green-500 shadow-lg shadow-green-500/30',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {isDelegating ? (
                      <>
                        <LoaderIcon className="animate-spin h-4 w-4 mr-2" />
                        Delegating...
                      </>
                    ) : (
                      <>
                        <TrendingUpIcon className="h-4 w-4 mr-2" />
                        Delegate
                      </>
                    )}
                  </button>

                  {parseFloat(currentDelegation) > 0 && (
                    <button
                      onClick={handleUndelegate}
                      disabled={isDelegating}
                      className={cn(
                        'px-4 py-3 rounded-lg font-bold transition-all duration-200',
                        'bg-gray-700 text-gray-300 border border-gray-600',
                        'hover:bg-gray-600 hover:text-white',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      Undelegate
                    </button>
                  )}
                </div>
              </div>

              {/* Info Section */}
              <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start">
                  <InfoIcon className="h-5 w-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <h4 className="font-medium text-blue-300 mb-2">How Delegation Works</h4>
                    <div className="text-blue-200 space-y-1">
                      <p>• Delegating $WEMARK increases this Evermark's voting power</p>
                      <p>• You can undelegate your tokens at any time</p>
                      <p>• Delegated tokens earn rewards based on the Evermark's performance</p>
                      <p>• Your tokens remain in your wallet and are never locked</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Status Messages */}
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 flex items-start">
              <AlertCircleIcon className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-300 font-medium">Error</p>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          )}
          
          {success && (
            <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4 flex items-start">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-green-300 font-medium">Success!</p>
                <p className="text-green-400 text-sm">{success}</p>
              </div>
            </div>
          )}

          {/* Environment Info */}
          {isInFarcaster && (
            <div className="text-xs text-gray-500 text-center border-t border-gray-700 pt-4">
              Running in Farcaster • Wallet: {walletType} • {canInteract ? '✅ Connected' : '⚠️ Frame SDK'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};