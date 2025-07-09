import React from 'react';
import { Link } from 'react-router-dom';
import { MenuIcon, ZapIcon } from 'lucide-react';
import { WalletConnect } from '../ConnectButton';
import { cn } from '../../utils/responsive';

interface HeaderProps {
  openSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ openSidebar }) => {
  return (
    <header className="sticky top-0 z-30 bg-black border-b border-green-400/30 shadow-lg shadow-green-500/10 backdrop-blur-sm">
      <div className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 flex items-center justify-between">
        {/* Left: Mobile Menu Button */}
        <div className="flex items-center">
          <button
            type="button"
            className={cn(
              "md:hidden p-2 rounded-md text-green-400 hover:text-green-300 hover:bg-gray-800/50",
              "active:bg-gray-700/50 transition-all duration-200 touch-manipulation",
              "border border-gray-700 hover:border-green-400/50"
            )}
            onClick={openSidebar}
            aria-label="Open navigation menu"
          >
            <MenuIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          
          {/* Logo - Mobile Center, Desktop Left */}
          <Link 
            to="/" 
            className={cn(
              "md:hidden absolute left-1/2 transform -translate-x-1/2",
              "font-serif text-lg sm:text-xl font-bold",
              "bg-gradient-to-r from-green-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent",
              "hover:from-green-300 hover:via-cyan-300 hover:to-purple-400 transition-all duration-300"
            )}
          >
            EVERMARK
          </Link>
        </div>

        {/* Center: Desktop Logo (hidden on mobile) */}
        <div className="hidden md:flex items-center flex-1">
          <Link 
            to="/" 
            className={cn(
              "font-serif text-xl lg:text-2xl font-bold flex items-center",
              "bg-gradient-to-r from-green-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent",
              "hover:from-green-300 hover:via-cyan-300 hover:to-purple-400 transition-all duration-300",
              "group"
            )}
          >
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-r from-green-400 to-purple-500 rounded-full flex items-center justify-center mr-3 shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-all duration-300">
              <ZapIcon className="h-5 w-5 lg:h-6 lg:w-6 text-black" />
            </div>
            EVERMARK
          </Link>
        </div>

        {/* Right: Wallet Connect - Enhanced for cyber theme */}
        <div className="flex items-center">
          <div className="scale-90 sm:scale-100 origin-right">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-1">
              <WalletConnect />
            </div>
          </div>
        </div>
      </div>
      
      {/* Animated border effect */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-50"></div>
    </header>
  );
};

export default Header;