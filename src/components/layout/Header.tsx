import React from 'react';
import { Link } from 'react-router-dom';
import { MenuIcon } from 'lucide-react';
import { WalletConnect } from '../ConnectButton';

interface HeaderProps {
  openSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ openSidebar }) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 flex items-center justify-between">
        {/* Left: Mobile Menu Button */}
        <div className="flex items-center">
          <button
            type="button"
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
            onClick={openSidebar}
            aria-label="Open navigation menu"
          >
            <MenuIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          
          {/* Logo - Mobile Center, Desktop Left */}
          <Link 
            to="/" 
            className="md:hidden absolute left-1/2 transform -translate-x-1/2 font-serif text-lg sm:text-xl font-bold text-purple-600 active:text-purple-700 transition-colors"
          >
            Evermark
          </Link>
        </div>

        {/* Center: Desktop Logo (hidden on mobile) */}
        <div className="hidden md:flex items-center flex-1">
          <Link 
            to="/" 
            className="font-serif text-xl lg:text-2xl font-bold text-purple-600 hover:text-purple-700 transition-colors"
          >
            Evermark
          </Link>
        </div>

        {/* Right: Wallet Connect - Always visible but responsive */}
        <div className="flex items-center">
          <div className="scale-90 sm:scale-100 origin-right">
            <WalletConnect />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;