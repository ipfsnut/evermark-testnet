import React from 'react';
import { Link } from 'react-router-dom';
import { useActiveAccount } from "thirdweb/react";
import { MenuIcon } from 'lucide-react';
import { WalletConnect } from '../ConnectButton';

interface HeaderProps {
  openSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ openSidebar }) => {
  const account = useActiveAccount();
  
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Left: Mobile Menu Button */}
        <div className="flex items-center md:hidden">
          <button
            type="button"
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            onClick={openSidebar}
          >
            <MenuIcon className="h-6 w-6" />
          </button>
        </div>
        
        {/* Center: Logo (mobile only) */}
        <div className="md:hidden flex items-center">
          <Link to="/" className="font-serif text-xl font-bold text-purple-600">
            Evermark
          </Link>
        </div>
        
        {/* Right: Wallet Connect Button */}
        <div className="flex items-center ml-auto">
          <WalletConnect />
          {/* Show connection status indicator */}
          {account && (
            <div className="ml-2 w-2 h-2 bg-green-500 rounded-full" title="Wallet Connected" />
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;