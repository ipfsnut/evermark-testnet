// src/components/wallet/WalletManagement.tsx
import React, { useState } from 'react';
import { useWalletLinking } from '../../hooks/useWalletLinking';
import { 
  WalletIcon, 
  PlusIcon, 
  TrashIcon, 
  EditIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ExternalLinkIcon,
  StarIcon,
  ChevronRightIcon,
  CopyIcon,
  EyeIcon
} from 'lucide-react';

interface WalletManagementProps {
  className?: string;
  showTitle?: boolean;
  compact?: boolean;
}

export const WalletManagement: React.FC<WalletManagementProps> = ({ 
  className = '',
  showTitle = true,
  compact = false
}) => {
  const {
    linkedWallets,
    primaryWallet,
    isLoading,
    error,
    linkWallet,
    addWalletAddress,
    unlinkWallet,
    setPrimaryWallet,
    updateWalletLabel,
    getWalletDisplayInfo,
    getAvailableWalletTypes,
    clearError
  } = useWalletLinking();

  const [showAddWallet, setShowAddWallet] = useState(false);
  const [addWalletMode, setAddWalletMode] = useState<'connect' | 'address'>('connect');
  const [newWalletAddress, setNewWalletAddress] = useState('');
  const [newWalletLabel, setNewWalletLabel] = useState('');
  const [editingWallet, setEditingWallet] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLinkWallet = async (walletId: string) => {
    setIsProcessing(true);
    const result = await linkWallet(walletId, newWalletLabel || undefined);
    setIsProcessing(false);
    
    if (result.success) {
      setShowAddWallet(false);
      setNewWalletLabel('');
    }
  };

  const handleAddAddress = async () => {
    if (!newWalletAddress.trim() || !newWalletLabel.trim()) return;
    
    setIsProcessing(true);
    const result = await addWalletAddress(newWalletAddress.trim(), newWalletLabel.trim());
    setIsProcessing(false);
    
    if (result.success) {
      setShowAddWallet(false);
      setNewWalletAddress('');
      setNewWalletLabel('');
    }
  };

  const handleUnlinkWallet = async (address: string) => {
    if (!confirm('Are you sure you want to unlink this wallet?')) return;
    await unlinkWallet(address);
  };

  const handleSetPrimary = async (address: string) => {
    await setPrimaryWallet(address);
  };

  const handleUpdateLabel = async (address: string) => {
    if (!editLabel.trim()) {
      setEditingWallet(null);
      return;
    }
    
    await updateWalletLabel(address, editLabel.trim());
    setEditingWallet(null);
    setEditLabel('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getWalletTypeIcon = (type: string) => {
    switch (type) {
      case 'connected': return '🔗';
      case 'farcaster-verified': return '🟣';
      case 'manually-added': return '👁️';
      default: return '💼';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="h-10 w-10 bg-gray-200 rounded-full mr-3"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${compact ? 'p-4' : 'p-6'} ${className}`}>
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <WalletIcon className="h-5 w-5 mr-2 text-purple-600" />
            Linked Wallets
          </h3>
          <button
            onClick={() => setShowAddWallet(true)}
            className="inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Wallet
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircleIcon className="h-4 w-4 text-red-600 mr-2" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
          <button
            onClick={clearError}
            className="text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Linked Wallets List */}
      <div className="space-y-3">
        {linkedWallets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <WalletIcon className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm">No wallets linked yet</p>
          </div>
        ) : (
          linkedWallets.map(wallet => {
            const displayInfo = getWalletDisplayInfo(wallet.address);
            const isEditing = editingWallet === wallet.address;
            
            return (
              <div 
                key={wallet.address}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  displayInfo.isPrimary 
                    ? 'border-purple-200 bg-purple-50' 
                    : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white border border-gray-200 mr-3">
                      <span className="text-lg">{getWalletTypeIcon(wallet.type)}</span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="Wallet label"
                            autoFocus
                          />
                          <button
                            onClick={() => handleUpdateLabel(wallet.address)}
                            className="p-1 text-green-600 hover:text-green-700"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingWallet(null);
                              setEditLabel('');
                            }}
                            className="p-1 text-gray-500 hover:text-gray-700"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900 text-sm">
                              {displayInfo.label}
                            </p>
                            {displayInfo.isPrimary && (
                              <StarIcon className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                            {displayInfo.isConnected && (
                              <div className="w-2 h-2 bg-green-500 rounded-full" title="Connected" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-600 font-mono">
                              {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                            </span>
                            <button
                              onClick={() => copyToClipboard(wallet.address)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Copy address"
                            >
                              <CopyIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!isEditing && (
                    <div className="flex items-center gap-1 ml-2">
                      {!displayInfo.isPrimary && (
                        <button
                          onClick={() => handleSetPrimary(wallet.address)}
                          className="p-1 text-gray-500 hover:text-purple-600"
                          title="Set as primary"
                        >
                          <StarIcon className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => {
                          setEditingWallet(wallet.address);
                          setEditLabel(wallet.label || '');
                        }}
                        className="p-1 text-gray-500 hover:text-blue-600"
                        title="Edit label"
                      >
                        <EditIcon className="h-4 w-4" />
                      </button>
                      
                      {displayInfo.canRemove && (
                        <button
                          onClick={() => handleUnlinkWallet(wallet.address)}
                          className="p-1 text-gray-500 hover:text-red-600"
                          title="Unlink wallet"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Wallet type info */}
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  <span className="capitalize">{wallet.type.replace('-', ' ')}</span>
                  {wallet.lastUsed && wallet.lastUsed > 0 && (
                    <span>Last used: {new Date(wallet.lastUsed).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Wallet Modal */}
      {showAddWallet && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Wallet</h3>
              <button
                onClick={() => {
                  setShowAddWallet(false);
                  setNewWalletAddress('');
                  setNewWalletLabel('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {/* Mode Selection */}
            <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setAddWalletMode('connect')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  addWalletMode === 'connect'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Connect Wallet
              </button>
              <button
                onClick={() => setAddWalletMode('address')}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  addWalletMode === 'address'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Watch Address
              </button>
            </div>

            {addWalletMode === 'connect' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wallet Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={newWalletLabel}
                    onChange={(e) => setNewWalletLabel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="My Trading Wallet"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Wallet Type
                  </label>
                  {getAvailableWalletTypes().map(walletType => (
                    <button
                      key={walletType.id}
                      onClick={() => handleLinkWallet(walletType.id)}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors disabled:opacity-50"
                    >
                      <span className="font-medium text-gray-900">{walletType.name}</span>
                      <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wallet Address
                  </label>
                  <input
                    type="text"
                    value={newWalletAddress}
                    onChange={(e) => setNewWalletAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                    placeholder="0x..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Label *
                  </label>
                  <input
                    type="text"
                    value={newWalletLabel}
                    onChange={(e) => setNewWalletLabel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Friend's Wallet"
                    required
                  />
                </div>

                <div className="flex items-start p-3 bg-blue-50 rounded-lg">
                  <EyeIcon className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800">
                    Watch-only addresses let you view collections without the ability to make transactions.
                  </p>
                </div>

                <button
                  onClick={handleAddAddress}
                  disabled={!newWalletAddress.trim() || !newWalletLabel.trim() || isProcessing}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Adding...' : 'Add Address'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};