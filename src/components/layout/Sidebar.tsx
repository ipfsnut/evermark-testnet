import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useProfile } from '../../hooks/useProfile';
import { useWalletConnection } from '../../providers/WalletProvider';
import SwapWidget from '../swap/SwapWidget';
import { 
  X as CloseIcon, 
  Home as HomeIcon, 
  BookOpen as BookOpenIcon,
  Trophy as TrophyIcon,
  Info as AboutIcon,
  Plus as CreateIcon,
  Copy as CopyIcon,
  WifiIcon,
  WifiOffIcon,
  CoinsIcon,
  BookmarkIcon,
  InfoIcon,
  GridIcon,
  SearchIcon,
  TrendingUpIcon,
  UserIcon,
  ZapIcon,
  ActivityIcon
} from 'lucide-react';
import { cn, useIsMobile, touchFriendly, textSizes, spacing } from '../../utils/responsive';

interface SidebarProps {
  isOpen: boolean;
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, closeSidebar }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const {
    displayName,
    avatar,
    handle,
    isAuthenticated,
    walletAddress,
    isInFarcaster,
    farcasterUser,
    primaryAddress
  } = useProfile();
  
  const { canInteract, walletType, isConnected } = useWalletConnection();
  
  // Enhanced navigation items with cyber styling
  const navItems = [
    { 
      path: '/', 
      label: 'Home', 
      icon: <HomeIcon className="h-5 w-5" />,
      description: 'Discover featured Evermarks',
      category: 'discover',
      glow: 'hover:shadow-cyan-500/20'
    },
    { 
      path: '/explore', 
      label: 'Explore', 
      icon: <GridIcon className="h-5 w-5" />,
      description: 'Browse all Evermarks with filters',
      category: 'discover',
      badge: 'New',
      glow: 'hover:shadow-blue-500/20'
    },
    { 
      path: '/leaderboard', 
      label: 'Leaderboard', 
      icon: <TrophyIcon className="h-5 w-5" />,
      description: 'Top voted Evermarks',
      category: 'discover',
      glow: 'hover:shadow-yellow-500/20'
    },
    { 
      path: '/create', 
      label: 'Create', 
      icon: <CreateIcon className="h-5 w-5" />,
      description: 'Create new Evermark',
      requiresAuth: true,
      category: 'user',
      glow: 'hover:shadow-green-500/20'
    },
    { 
      path: '/my-evermarks', 
      label: 'My Collection', 
      icon: <BookOpenIcon className="h-5 w-5" />,
      description: 'Your created Evermarks',
      requiresAuth: true,
      category: 'user',
      glow: 'hover:shadow-purple-500/20'
    },
    { 
      path: '/bookshelf', 
      label: 'Bookshelf', 
      icon: <BookmarkIcon className="h-5 w-5" />,
      description: 'Curated favorites and voting delegation',
      requiresAuth: true,
      category: 'user',
      glow: 'hover:shadow-pink-500/20'
    },
    ...(canInteract ? [{
      path: '/wrapping', 
      label: 'Token Tools', 
      icon: <CoinsIcon className="h-5 w-5" />,
      badge: 'wEMARK',
      description: 'Wrap/unwrap EMARK tokens',
      category: 'tools',
      glow: 'hover:shadow-green-500/20'
    }] : []),
    { 
      path: '/about', 
      label: 'About', 
      icon: <InfoIcon className="h-5 w-5" />,
      description: 'Learn about Evermark Protocol',
      category: 'info',
      glow: 'hover:shadow-gray-500/20'
    },
  ];
  
  const navItemsByCategory = {
    discover: navItems.filter(item => item.category === 'discover'),
    user: navItems.filter(item => item.category === 'user'),
    tools: navItems.filter(item => item.category === 'tools'),
    info: navItems.filter(item => item.category === 'info')
  };
  
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  
  const copyWalletAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      console.log('Wallet address copied to clipboard');
    } catch (err) {
      console.error('Failed to copy wallet address:', err);
      const textArea = document.createElement('textarea');
      textArea.value = address;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };
  
  const renderNavSection = (title: string, items: typeof navItems, showTitle = true) => {
    const visibleItems = items.filter(item => !item.requiresAuth || isAuthenticated);
    
    if (visibleItems.length === 0) return null;
    
    return (
      <div className="mb-6">
        {showTitle && (
          <h3 className="px-3 mb-3 text-xs font-bold text-green-400 uppercase tracking-wider">
            {title}
          </h3>
        )}
        <ul className="space-y-2">
          {visibleItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={cn(
                  "flex items-center rounded-lg transition-all duration-300 group relative",
                  "px-3 py-3 mx-1",
                  touchFriendly.button,
                  isActive(item.path)
                    ? 'bg-gradient-to-r from-green-900/30 to-purple-900/30 text-green-400 border border-green-400/30 shadow-lg shadow-green-500/20'
                    : 'text-gray-300 hover:bg-gray-800/50 hover:text-white border border-transparent hover:border-gray-600',
                  item.glow
                )}
                onClick={closeSidebar}
                title={item.description}
              >
                <span className={cn(
                  "mr-3 transition-all duration-300",
                  isActive(item.path) ? 'text-green-400' : 'text-gray-500 group-hover:text-green-400'
                )}>
                  {item.icon}
                </span>
                <span className="flex-1 font-medium">{item.label}</span>
                
                {/* Enhanced badges */}
                {item.badge && (
                  <span className={cn(
                    "ml-2 px-2 py-1 text-xs font-bold rounded-full border",
                    item.badge === 'New' 
                      ? 'bg-blue-500/20 text-blue-400 border-blue-400/30 shadow-sm shadow-blue-500/30' 
                      : item.badge === 'wEMARK'
                      ? 'bg-green-500/20 text-green-400 border-green-400/30 shadow-sm shadow-green-500/30'
                      : 'bg-gray-500/20 text-gray-400 border-gray-400/30'
                  )}>
                    {item.badge}
                  </span>
                )}
                
                {/* Active indicator with glow */}
                {isActive(item.path) && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-400 to-cyan-400 rounded-r shadow-sm shadow-green-500/50" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  
  return (
    <div className={cn(
      "fixed md:sticky top-0 left-0 h-full md:h-screen w-64 z-20 transform transition-transform duration-300 ease-in-out flex flex-col",
      "bg-gradient-to-b from-gray-900 via-black to-gray-900 border-r border-green-400/30",
      isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    )}>
      {/* Enhanced Sidebar Header */}
      <div className="border-b border-green-400/30 p-4 bg-gradient-to-r from-gray-900/50 to-black/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className={cn(
              "font-serif font-bold flex items-center group",
              "bg-gradient-to-r from-green-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent",
              "hover:from-green-300 hover:via-cyan-300 hover:to-purple-400 transition-all duration-300"
            )}
            onClick={closeSidebar}
          >
            <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-purple-500 rounded-full flex items-center justify-center mr-3 shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-all duration-300">
              <ZapIcon className="h-5 w-5 text-black" />
            </div>
            <span className="text-lg font-bold">EVERMARK</span>
          </Link>
          <button
            className={cn(
              "md:hidden rounded-md text-gray-400 hover:text-green-400 hover:bg-gray-800/50 transition-colors p-2",
              "border border-gray-700 hover:border-green-400/50",
              touchFriendly.button
            )}
            onClick={closeSidebar}
            aria-label="Close navigation menu"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Enhanced User Profile Section */}
      {isAuthenticated && (
        <div className="border-b border-green-400/30 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20">
          <div className="flex items-center space-x-3">
            <Link 
              to={primaryAddress ? `/${primaryAddress}` : '/profile'} 
              className={cn(
                "bg-gradient-to-r from-green-400/20 to-purple-500/20 rounded-full flex items-center justify-center overflow-hidden transition-all cursor-pointer flex-shrink-0",
                "border-2 border-green-400/30 hover:border-green-400/60 hover:shadow-lg hover:shadow-green-500/30",
                isMobile ? "h-12 w-12" : "h-14 w-14"
              )}
              onClick={closeSidebar}
              title="View your profile"
            >
              {avatar ? (
                <img 
                  src={avatar} 
                  alt={displayName} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-bold text-green-400 text-xl">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </Link>
            
            <div className="flex-1 min-w-0">
              <Link 
                to={primaryAddress ? `/${primaryAddress}` : '/profile'}
                onClick={closeSidebar}
                className="block hover:text-green-400 transition-colors"
              >
                <h3 className="font-bold text-white truncate">
                  {displayName}
                </h3>
              </Link>
              
              {handle ? (
                <p className="text-sm text-cyan-400 truncate">@{handle}</p>
              ) : primaryAddress ? (
                <button
                  onClick={() => copyWalletAddress(primaryAddress)}
                  className="font-mono text-xs text-gray-400 hover:text-green-400 transition-colors cursor-pointer flex items-center gap-1 group truncate"
                  title="Click to copy wallet address"
                >
                  <span className="truncate">{primaryAddress.slice(0, 8)}...{primaryAddress.slice(-4)}</span>
                  <CopyIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              ) : (
                <p className="text-xs text-gray-500">No wallet connected</p>
              )}
              
              {/* Connection status with cyber styling */}
              <div className="flex items-center mt-2 text-xs">
                <div className={cn(
                  "w-2 h-2 rounded-full mr-2 animate-pulse",
                  canInteract ? 'bg-green-400 shadow-sm shadow-green-400' : isConnected ? 'bg-yellow-400 shadow-sm shadow-yellow-400' : 'bg-red-400'
                )}></div>
                <span className={cn(
                  "font-bold text-xs",
                  canInteract ? 'text-green-400' : isConnected ? 'text-yellow-400' : 'text-red-400'
                )}>
                  {canInteract ? 'FULL ACCESS' : isConnected ? 'READ ONLY' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Farcaster status */}
      {isInFarcaster && (
        <div className="px-4 py-3 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-b border-purple-400/30">
          <div className="flex items-center justify-center space-x-2">
            <ActivityIcon className="h-4 w-4 text-purple-400 animate-pulse" />
            <span className="text-xs font-bold text-purple-400">FARCASTER MODE</span>
            {canInteract ? (
              <WifiIcon className="h-3 w-3 text-green-400" />
            ) : (
              <WifiOffIcon className="h-3 w-3 text-red-400" />
            )}
          </div>
          <div className="mt-2 text-center">
            <span className={cn(
              "text-xs px-3 py-1 rounded-full font-bold border",
              canInteract 
                ? "bg-green-500/20 text-green-400 border-green-400/30"
                : isConnected 
                ? "bg-yellow-500/20 text-yellow-400 border-yellow-400/30" 
                : "bg-red-500/20 text-red-400 border-red-400/30"
            )}>
              {canInteract ? 'FULL FEATURES' : isConnected ? 'LIMITED' : 'NO WALLET'}
            </span>
          </div>
        </div>
      )}
      
      {/* Navigation with cyber styling */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        {/* Quick Swap Widget with cyber styling */}
        {isAuthenticated && (
          <div className="mb-6 mx-2">
            <div className="bg-gradient-to-r from-green-900/20 to-cyan-900/20 border border-green-400/30 rounded-lg p-3 backdrop-blur-sm">
              <SwapWidget />
              <p className="text-xs text-green-400 mt-2 text-center font-medium">
                QUICK $EMARK SWAP
              </p>
            </div>
          </div>
        )}

        {/* Discovery Section */}
        {renderNavSection('DISCOVER', navItemsByCategory.discover)}
        
        {/* User Section */}
        {isAuthenticated && renderNavSection('MY EVERMARKS', navItemsByCategory.user)}
        
        {/* Tools Section */}
        {navItemsByCategory.tools.length > 0 && renderNavSection('TOOLS', navItemsByCategory.tools)}
        
        {/* Info Section */}
        {renderNavSection('SYSTEM', navItemsByCategory.info)}
        
        {/* Enhanced CTA for unauthenticated users */}
        {!isAuthenticated && (
          <div className="mt-6 mx-2">
            <div className="p-4 bg-gradient-to-br from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-400/30 backdrop-blur-sm">
              <h4 className="text-sm font-bold text-purple-400 mb-3 flex items-center">
                <UserIcon className="h-4 w-4 mr-2" />
                INITIALIZE
              </h4>
              <p className="text-xs text-gray-300 mb-4 leading-relaxed">
                Connect your wallet to access the full Evermark Protocol and start earning $WEMARK rewards
              </p>
              <div className="space-y-2">
                <Link
                  to="/explore"
                  onClick={closeSidebar}
                  className="block text-xs text-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-2 rounded hover:from-purple-500 hover:to-blue-500 transition-all font-bold shadow-lg shadow-purple-500/30"
                >
                  EXPLORE EVERMARKS
                </Link>
                <Link
                  to="/about"
                  onClick={closeSidebar}
                  className="block text-xs text-center bg-gray-800 text-purple-400 border border-purple-400/50 px-3 py-2 rounded hover:bg-gray-700 transition-colors"
                >
                  LEARN PROTOCOL
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>
      
      {/* Enhanced footer */}
      <div className="border-t border-green-400/30 mt-auto p-4 bg-gradient-to-r from-gray-900/50 to-black/50">
        {/* Network status for authenticated users */}
        {isAuthenticated && (
          <div className="mb-4 p-3 bg-gradient-to-r from-green-900/20 to-cyan-900/20 rounded-lg border border-green-400/30">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-gray-400 font-medium">NETWORK:</span>
              <span className="text-green-400 font-bold">BASE MAINNET</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">STATUS:</span>
              <span className={cn(
                "font-bold flex items-center gap-1",
                canInteract ? 'text-green-400' : isConnected ? 'text-yellow-400' : 'text-red-400'
              )}>
                <div className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  canInteract ? 'bg-green-400' : isConnected ? 'bg-yellow-400' : 'bg-red-400'
                )}></div>
                {canInteract ? 'ONLINE' : isConnected ? 'LIMITED' : 'OFFLINE'}
              </span>
            </div>
          </div>
        )}
        
        {/* System info */}
        <div className="text-center space-y-1">
          <p className="text-xs text-gray-500 font-medium">
            © {new Date().getFullYear()} EVERMARK PROTOCOL
          </p>
          <p className="text-xs text-green-400 font-bold">
            v2.0.0 • MAINNET BUILD
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2">
              <span className="text-xs bg-orange-500/20 text-orange-400 border border-orange-400/30 px-2 py-1 rounded font-bold">
                DEV MODE
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;