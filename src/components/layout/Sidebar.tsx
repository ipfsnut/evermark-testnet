import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWallet } from '../../hooks/useWallet';
import { 
  X as CloseIcon, 
  Home as HomeIcon, 
  BookOpen as BookOpenIcon,
  Trophy as TrophyIcon,
  DollarSign as AuctionIcon,
  Plus as CreateIcon,
  User as UserIcon,
  Bookmark as BookmarkIcon
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  closeSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, closeSidebar }) => {
  const location = useLocation();
  const { isConnected, account, displayAddress } = useWallet();
  
  // Define navigation items
  const navItems = [
    { path: '/', label: 'Home', icon: <HomeIcon className="h-5 w-5" /> },
    { path: '/leaderboard', label: 'Leaderboard', icon: <TrophyIcon className="h-5 w-5" /> },
    { path: '/auctions', label: 'Auctions', icon: <AuctionIcon className="h-5 w-5" /> },
    { path: '/create', label: 'Create', icon: <CreateIcon className="h-5 w-5" /> },
    { path: '/my-evermarks', label: 'My Collection', icon: <BookOpenIcon className="h-5 w-5" /> },
    { path: '/profile', label: 'Profile', icon: <UserIcon className="h-5 w-5" /> },
    { path: '/bookshelf', label: 'My Bookshelf', icon: <BookmarkIcon className="h-5 w-5" /> },
  ];
  
  // Check if a nav item is active
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  
  return (
    <>
      {/* Sidebar */}
      <div className={`fixed md:sticky top-0 left-0 h-full md:h-screen w-64 bg-white border-r border-gray-200 z-20 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
        {/* Sidebar Header with Close Button (mobile only) */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <Link to="/" className="font-serif text-xl font-bold text-purple-600">
            Evermark
          </Link>
          <button
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-900"
            onClick={closeSidebar}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        
        {/* User Profile Section */}
        {isConnected && (
          <div className="px-6 py-6 border-b border-gray-200">
            <Link to="/profile" className="flex flex-col items-center" onClick={() => closeSidebar()}>
              <div className="h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                <span className="text-2xl font-bold text-purple-600">
                  {displayAddress.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-center">
                <h3 className="font-medium text-gray-900">{displayAddress}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {account?.address.slice(0, 6)}...{account?.address.slice(-4)}
                </p>
              </div>
            </Link>
          </div>
        )}
        
        {/* Navigation Links */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                    isActive(item.path)
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => closeSidebar()}
                >
                  <span className="mr-3 text-purple-600">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Footer with Logo */}
        <div className="px-6 py-4 border-t border-gray-200 mt-auto">
          <div className="flex justify-center">
            <img 
              src="/logo.png" 
              alt="Evermark Logo" 
              className="h-10"
              onError={(e) => {
                // Fallback if image doesn't exist
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <p className="text-xs text-center text-gray-500 mt-2">
            © {new Date().getFullYear()} Evermark
          </p>
        </div>
      </div>
    </>
  );
};

export default Sidebar;