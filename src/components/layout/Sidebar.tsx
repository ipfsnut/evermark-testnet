// src/components/layout/Sidebar.tsx - ✅ ENHANCED with unified auth and mobile optimization
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useProfile } from '../../hooks/useProfile';
import { useWalletConnection } from '../../providers/WalletProvider';
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
  UserIcon,
  VoteIcon,
  ChevronRightIcon
} from 'lucide-react';
import { cn, useIsMobile, touchFriendly, textSizes, spacing } from '../../utils/responsive';

interface SidebarProps {
  isOpen: boolean;
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, closeSidebar }) => {
  const location = useLocation();
  const isMobile = useIsMobile();
  
  // ✅ Use unified auth system
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
  
  // ✅ Use unified wallet connection
  const { canInteract, walletType, isConnected } = useWalletConnection();
  
  // Define navigation items with conditional visibility
  const navItems = [
    { 
      path: '/', 
      label: 'Home', 
      icon: <HomeIcon className="h-5 w-5" />,
      description: 'Discover latest Evermarks'
    },
    { 
      path: '/leaderboard', 
      label: 'Leaderboard', 
      icon: <TrophyIcon className="h-5 w-5" />,
      description: 'Top voted Evermarks'
    },
    { 
      path: '/create', 
      label: 'Create', 
      icon: <CreateIcon className="h-5 w-5" />,
      description: 'Create new Evermark',
      requiresAuth: true
    },
    { 
      path: '/my-evermarks', 
      label: 'My Collection', 
      icon: <BookOpenIcon className="h-5 w-5" />,
      description: 'Your created Evermarks',
      requiresAuth: true
    },
    // ✅ Add delegation link for authenticated users
    ...(isAuthenticated ? [{
      path: '/delegation', 
      label: 'Delegation', 
      icon: <VoteIcon className="h-5 w-5" />,
      badge: 'New',
      description: 'Voting power delegation history'
    }] : []),
    // ✅ Add wrapping link only if user can interact with contracts
    ...(canInteract ? [{
      path: '/wrapping', 
      label: 'Wrapping', 
      icon: <CoinsIcon className="h-5 w-5" />,
      badge: 'wEMARK',
      description: 'Manage your EMARK tokens'
    }] : []),
    { 
      path: '/profile', 
      label: 'Profile', 
      icon: <UserIcon className="h-5 w-5" />,
      description: 'Your profile and settings'
    },
    { 
      path: '/about', 
      label: 'About', 
      icon: <AboutIcon className="h-5 w-5" />,
      description: 'Learn about Evermark'
    },
  ];
  
  // Check if a nav item is active
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  
  // Copy wallet address to clipboard
  const copyWalletAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      // You could add a toast notification here
      console.log('Wallet address copied to clipboard');
    } catch (err) {
      console.error('Failed to copy wallet address:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = address;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };
  
  return (
    <div className={cn(
      "fixed md:sticky top-0 left-0 h-full md:h-screen w-64 bg-white border-r border-gray-200 z-20 transform transition-transform duration-300 ease-in-out flex flex-col",
      isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    )}>
      {/* ✅ Enhanced Sidebar Header */}
      <div className={cn("border-b border-gray-200 flex items-center justify-between", spacing.responsive['sm-md-lg'])}>
        <Link 
          to="/" 
          className={cn(
            "font-serif font-bold text-purple-600 hover:text-purple-700 transition-colors",
            textSizes.responsive['lg-xl-2xl']
          )}
          onClick={closeSidebar}
        >
          Evermark
        </Link>
        <button
          className={cn(
            "md:hidden rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors",
            touchFriendly.button
          )}
          onClick={closeSidebar}
          aria-label="Close navigation menu"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>
      
      {/* ✅ Enhanced User Profile Section */}
      {isAuthenticated && (
        <div className={cn("border-b border-gray-200", spacing.responsive['sm-md-lg'])}>
          <div className="flex items-center space-x-3">
            {/* Profile Picture - Clickable to go to profile */}
            <Link 
              to={primaryAddress ? `/${primaryAddress}` : '/profile'} 
              className={cn(
                "bg-purple-100 rounded-full flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-purple-300 transition-all cursor-pointer flex-shrink-0",
                isMobile ? "h-10 w-10" : "h-12 w-12"
              )}
              onClick={closeSidebar}
            >
              {avatar ? (
                <img 
                  src={avatar} 
                  alt={displayName} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className={cn(
                  "font-bold text-purple-600",
                  textSizes.responsive['lg-xl-2xl']
                )}>
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </Link>
            
            {/* User Info - Enhanced */}
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "font-medium text-gray-900 truncate",
                textSizes.responsive['sm-base-lg']
              )}>
                {displayName}
              </h3>
              
              {/* Show handle OR wallet address with better hierarchy */}
              {handle ? (
                <p className="text-xs sm:text-sm text-purple-600 truncate">{handle}</p>
              ) : primaryAddress ? (
                <button
                  onClick={() => copyWalletAddress(primaryAddress)}
                  className="font-mono text-xs text-gray-600 hover:text-purple-600 transition-colors cursor-pointer flex items-center gap-1 group truncate"
                  title="Click to copy wallet address"
                >
                  <span className="truncate">{primaryAddress.slice(0, 6)}...{primaryAddress.slice(-4)}</span>
                  <CopyIcon className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              ) : (
                <p className="text-xs text-gray-500">No wallet connected</p>
              )}
              
              {/* Connection status indicator */}
              <div className="flex items-center mt-1 text-xs">
                <div className={cn(
                  "w-2 h-2 rounded-full mr-2",
                  canInteract ? 'bg-green-400' : isConnected ? 'bg-yellow-400' : 'bg-red-400'
                )}></div>
                <span className={cn(
                  "capitalize",
                  canInteract ? 'text-green-600' : isConnected ? 'text-yellow-600' : 'text-red-600'
                )}>
                  {walletType}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* ✅ Enhanced Frame-specific messaging */}
      {isInFarcaster && (
        <div className="px-3 sm:px-4 py-2 bg-purple-50 border-b border-purple-100">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></div>
            <p className="text-xs font-medium text-purple-700">Running in Farcaster</p>
            {isAuthenticated ? (
              <WifiIcon className="h-3 w-3 text-purple-600" />
            ) : (
              <WifiOffIcon className="h-3 w-3 text-purple-400" />
            )}
          </div>
          {/* Connection quality indicator */}
          <div className="mt-1 text-center">
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full",
              canInteract 
                ? "bg-green-100 text-green-700"
                : isConnected 
                ? "bg-yellow-100 text-yellow-700" 
                : "bg-red-100 text-red-700"
            )}>
              {canInteract ? 'Full Access' : isConnected ? 'Limited' : 'Read Only'}
            </span>
          </div>
        </div>
      )}
      
      {/* ✅ Enhanced Navigation Links */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const shouldShow = !item.requiresAuth || isAuthenticated;
            
            if (!shouldShow) return null;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center rounded-lg transition-colors group",
                    spacing.responsive['sm-md-lg'],
                    textSizes.responsive['sm-base-lg'],
                    touchFriendly.button,
                    isActive(item.path)
                      ? 'bg-purple-50 text-purple-700 border border-purple-200'
                      : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                  )}
                  onClick={closeSidebar}
                  title={item.description}
                >
                  <span className={cn(
                    "mr-3 transition-colors",
                    isActive(item.path) ? 'text-purple-600' : 'text-gray-500 group-hover:text-gray-700'
                  )}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  
                  {/* Enhanced badges */}
                  {item.badge && (
                    <span className={cn(
                      "ml-2 px-2 py-0.5 text-xs font-medium rounded-full",
                      item.badge === 'New' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    )}>
                      {item.badge}
                    </span>
                  )}
                  
                  {/* Arrow for external feel */}
                  {item.requiresAuth && !isAuthenticated && (
                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        
        {/* ✅ Quick action for unauthenticated users */}
        {!isAuthenticated && (
          <div className="mt-6 px-2">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Get Started</h4>
              <p className="text-xs text-gray-600 mb-3">
                Connect your wallet or Farcaster to create and vote on Evermarks
              </p>
              <Link
                to="/about"
                onClick={closeSidebar}
                className="text-xs text-purple-600 hover:text-purple-700 font-medium"
              >
                Learn More →
              </Link>
            </div>
          </div>
        )}
      </nav>
      
      {/* ✅ Enhanced footer with better status indicators */}
      <div className={cn("border-t border-gray-200 mt-auto", spacing.responsive['sm-md-lg'])}>
        {/* Contract status indicator */}
        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-600">Blockchain Access:</span>
            <span className={cn(
              "font-medium px-2 py-1 rounded-full",
              canInteract 
                ? 'bg-green-100 text-green-700' 
                : isConnected 
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            )}>
              {canInteract ? 'Full' : isConnected ? 'Limited' : 'None'}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {canInteract 
              ? '✅ Can create Evermarks and vote'
              : isConnected 
              ? '⚠️ Read-only blockchain access'
              : '❌ Connect wallet for full features'
            }
          </div>
        </div>
        
        {/* Logo and copyright */}
        <div className="flex justify-center mb-2">
          <img 
            src="/logo.png" 
            alt="Evermark Logo" 
            className="h-6 sm:h-8"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        <p className="text-xs text-center text-gray-500">
          © {new Date().getFullYear()} Evermark
        </p>
        
        {/* Environment indicator for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-2 text-center">
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
              Dev Mode
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;