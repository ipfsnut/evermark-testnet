import React, { useState, useEffect } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useUserEvermarks } from '../../hooks/useEvermarks';
import { useVoting } from '../../hooks/useVoting';
import { 
  LockIcon, 
  UnlockIcon, 
  CoinsIcon,
  BookmarkIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  InfoIcon,
  TrendingUpIcon,
  ClockIcon
} from 'lucide-react';
import { toEther } from 'thirdweb/utils';

interface StakedNFT {
  tokenId: string;
  stakedAt: Date;
  lastWeekVotes: bigint;
  projectedRewards: bigint;
  lockPeriod: number; // days
}

export const NFTStakingPanel: React.FC = () => {
  const { address, isConnected } = useWallet();
  const { evermarks } = useUserEvermarks(address);
  const [stakedNFTs, setStakedNFTs] = useState<StakedNFT[]>([]);
  const [selectedNFT, setSelectedNFT] = useState<string | null>(null);
  const [isStaking, setIsStaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  
  // Load staked NFTs (mock data - in production from contract)
  useEffect(() => {
    if (address) {
      const mockStakedNFTs: StakedNFT[] = [
        {
          tokenId: '3',
          stakedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          lastWeekVotes: BigInt(1000),
          projectedRewards: BigInt(100),
          lockPeriod: 7
        },
        {
          tokenId: '4',
          stakedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
          lastWeekVotes: BigInt(2500),
          projectedRewards: BigInt(250),
          lockPeriod: 14
        }
      ];
      setStakedNFTs(mockStakedNFTs);
    }
  }, [address]);
  
  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);
  
  // Get unstaked NFTs
  const unstakedEvermarks = evermarks.filter(
    e => !stakedNFTs.find(s => s.tokenId === e.id)
  );
  
  const handleStakeNFT = async () => {
    if (!selectedNFT) {
      setError('Please select an NFT to stake');
      return;
    }
    
    setIsStaking(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Mock staking - in production, call contract
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newStakedNFT: StakedNFT = {
        tokenId: selectedNFT,
        stakedAt: new Date(),
        lastWeekVotes: BigInt(0),
        projectedRewards: BigInt(0),
        lockPeriod: 7
      };
      
      setStakedNFTs([...stakedNFTs, newStakedNFT]);
      setSuccess(`Successfully staked Evermark #${selectedNFT}!`);
      setSelectedNFT(null);
    } catch (err: any) {
      setError(err.message || 'Failed to stake NFT');
    } finally {
      setIsStaking(false);
    }
  };
  
  const handleUnstakeNFT = async (tokenId: string) => {
    const stakedNFT = stakedNFTs.find(s => s.tokenId === tokenId);
    if (!stakedNFT) return;
    
    const daysSinceStaked = Math.floor(
      (Date.now() - stakedNFT.stakedAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceStaked < stakedNFT.lockPeriod) {
      setError(`NFT is locked for ${stakedNFT.lockPeriod - daysSinceStaked} more days`);
      return;
    }
    
    setIsStaking(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Mock unstaking - in production, call contract
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStakedNFTs(stakedNFTs.filter(s => s.tokenId !== tokenId));
      setSuccess(`Successfully unstaked Evermark #${tokenId}!`);
    } catch (err: any) {
      setError(err.message || 'Failed to unstake NFT');
    } finally {
      setIsStaking(false);
    }
  };
  
  const getTotalProjectedRewards = () => {
    return stakedNFTs.reduce((total, nft) => total + nft.projectedRewards, BigInt(0));
  };
  
  const getBoostMultiplier = (lockPeriod: number) => {
    if (lockPeriod >= 30) return '3x';
    if (lockPeriod >= 14) return '2x';
    if (lockPeriod >= 7) return '1.5x';
    return '1x';
  };
  
  if (!isConnected) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="text-center py-8">
          <LockIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Connect to Stake NFTs</h3>
          <p className="text-gray-600">Connect your wallet to stake Evermarks for rewards</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <LockIcon className="h-6 w-6 text-purple-600 mr-2" />
          <h3 className="text-lg font-semibold text-gray-900">NFT Staking</h3>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-1 text-gray-500 hover:text-gray-700"
        >
          <InfoIcon className="h-5 w-5" />
        </button>
      </div>
      
      {/* Info Box */}
      {showInfo && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">How NFT Staking Works</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Stake your Evermark NFTs to earn $NSI rewards</li>
            <li>• Rewards are based on votes your NFT received last week</li>
            <li>• Longer lock periods = higher reward multipliers</li>
            <li>• Staked NFTs cannot be transferred until unstaked</li>
            <li>• Claim rewards weekly while NFT remains staked</li>
          </ul>
        </div>
      )}
      
      {/* Status Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center">
          <AlertCircleIcon className="h-4 w-4 text-red-600 mr-2" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
          <span className="text-green-700 text-sm">{success}</span>
        </div>
      )}
      
      {/* Staking Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center">
            <BookmarkIcon className="h-5 w-5 text-purple-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Staked NFTs</p>
              <p className="text-xl font-bold text-gray-900">{stakedNFTs.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center">
            <CoinsIcon className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Projected Weekly</p>
              <p className="text-xl font-bold text-gray-900">
                {toEther(getTotalProjectedRewards())} NSI
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center">
            <TrendingUpIcon className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Available to Stake</p>
              <p className="text-xl font-bold text-gray-900">{unstakedEvermarks.length}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stake New NFT */}
      {unstakedEvermarks.length > 0 && (
        <div className="mb-6 p-4 bg-purple-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Stake an Evermark</h4>
          <div className="flex gap-3">
            <select
              value={selectedNFT || ''}
              onChange={(e) => setSelectedNFT(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select an Evermark...</option>
              {unstakedEvermarks.map(evermark => (
                <option key={evermark.id} value={evermark.id}>
                  #{evermark.id} - {evermark.title}
                </option>
              ))}
            </select>
            <button
              onClick={handleStakeNFT}
              disabled={!selectedNFT || isStaking}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStaking ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <LockIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      )}
      
      {/* Staked NFTs List */}
      {stakedNFTs.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Your Staked NFTs</h4>
          <div className="space-y-3">
            {stakedNFTs.map(stakedNFT => {
              const evermark = evermarks.find(e => e.id === stakedNFT.tokenId);
              const daysSinceStaked = Math.floor(
                (Date.now() - stakedNFT.stakedAt.getTime()) / (1000 * 60 * 60 * 24)
              );
              const canUnstake = daysSinceStaked >= stakedNFT.lockPeriod;
              
              return (
                <div key={stakedNFT.tokenId} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-medium text-gray-900">
                        {evermark?.title || `Evermark #${stakedNFT.tokenId}`}
                      </h5>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          Staked {daysSinceStaked} days ago
                        </span>
                        <span className="flex items-center">
                          <TrendingUpIcon className="h-3 w-3 mr-1" />
                          {toEther(stakedNFT.lastWeekVotes)} votes last week
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">Weekly Rewards</p>
                      <p className="font-bold text-green-600">
                        {toEther(stakedNFT.projectedRewards)} NSI
                      </p>
                      <span className="text-xs text-purple-600">
                        {getBoostMultiplier(stakedNFT.lockPeriod)} boost
                      </span>
                    </div>
                  </div>
                  
                  {canUnstake && (
                    <button
                      onClick={() => handleUnstakeNFT(stakedNFT.tokenId)}
                      disabled={isStaking}
                      className="mt-3 w-full px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <UnlockIcon className="h-4 w-4 mr-2" />
                      Unstake
                    </button>
                  )}
                  
                  {!canUnstake && (
                    <div className="mt-3 text-center text-sm text-gray-500">
                      Locked for {stakedNFT.lockPeriod - daysSinceStaked} more days
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {stakedNFTs.length === 0 && unstakedEvermarks.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <BookmarkIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p>Create Evermarks to start staking for rewards</p>
        </div>
      )}
    </div>
  );
};