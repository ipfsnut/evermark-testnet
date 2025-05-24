import React from 'react';
import { useActiveAccount } from "thirdweb/react";
import { UserIcon, WalletIcon, BookmarkIcon, CoinsIcon } from 'lucide-react';
import { useUserEvermarks } from '../hooks/useEvermarks';
import { Link } from 'react-router-dom';
import { StakingWidget } from '../components/staking/StakingWidget';

const ProfilePage: React.FC = () => {
  const account = useActiveAccount();
  const { evermarks, isLoading: isLoadingEvermarks } = useUserEvermarks(account?.address);

  if (!account) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <UserIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600">Please connect your wallet to view your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600">Manage your account and preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-6">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mr-4">
            <UserIcon className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">User Profile</h2>
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <WalletIcon className="w-4 h-4 mr-1" />
              <span>{account.address.slice(0, 6)}...{account.address.slice(-4)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <BookmarkIcon className="h-5 w-5 text-purple-600 mr-2" />
              <h3 className="font-medium text-gray-900">Your Evermarks</h3>
            </div>
            <p className="text-2xl font-bold text-purple-600 mt-2">
              {isLoadingEvermarks ? "..." : evermarks.length}
            </p>
            <Link 
              to="/my-evermarks"
              className="text-sm text-purple-600 hover:underline mt-1 inline-block"
            >
              View collection
            </Link>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <CoinsIcon className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="font-medium text-gray-900">Manage Assets</h3>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Stake tokens to earn rewards and increase your voting power
            </p>
          </div>
        </div>
      </div>
      
      {/* Staking & Rewards Widget */}
      <StakingWidget userAddress={account.address} />
    </div>
  );
};

export default ProfilePage;