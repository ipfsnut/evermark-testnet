import React from 'react';
import { ZapIcon, ShieldIcon, GlobeIcon } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-r from-gray-900 via-black to-gray-900 border-t border-green-400/30 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Main footer content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          {/* Brand section */}
          <div className="space-y-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-purple-500 rounded-full flex items-center justify-center mr-3 shadow-lg shadow-green-500/30">
                <ZapIcon className="h-5 w-5 text-black" />
              </div>
              <span className="font-serif font-bold text-xl bg-gradient-to-r from-green-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent">
                EVERMARK
              </span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Content preservation on the blockchain. Create permanent references and earn rewards through community curation.
            </p>
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center text-green-400">
                <ShieldIcon className="h-4 w-4 mr-1" />
                <span className="font-medium">Base Mainnet</span>
              </div>
              <div className="flex items-center text-cyan-400">
                <GlobeIcon className="h-4 w-4 mr-1" />
                <span className="font-medium">IPFS Storage</span>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="space-y-4">
            <h4 className="text-green-400 font-bold text-sm uppercase tracking-wider">Quick Access</h4>
            <div className="space-y-2">
              <a href="/explore" className="block text-gray-400 hover:text-white transition-colors text-sm">
                Explore Evermarks
              </a>
              <a href="/leaderboard" className="block text-gray-400 hover:text-white transition-colors text-sm">
                Leaderboard
              </a>
              <a href="/create" className="block text-gray-400 hover:text-white transition-colors text-sm">
                Create Content
              </a>
              <a href="/about" className="block text-gray-400 hover:text-white transition-colors text-sm">
                Protocol Info
              </a>
            </div>
          </div>

          {/* Legal & docs */}
          <div className="space-y-4">
            <h4 className="text-green-400 font-bold text-sm uppercase tracking-wider">System</h4>
            <div className="space-y-2">
              <a href="#" className="block text-gray-400 hover:text-white transition-colors text-sm">
                Terms of Service
              </a>
              <a href="#" className="block text-gray-400 hover:text-white transition-colors text-sm">
                Privacy Policy
              </a>
              <a href="#" className="block text-gray-400 hover:text-white transition-colors text-sm">
                Documentation
              </a>
              <a href="#" className="block text-gray-400 hover:text-white transition-colors text-sm">
                API Reference
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-gray-500">
              © {new Date().getFullYear()} Evermark Protocol. All rights reserved.
            </div>
            
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center text-green-400">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                <span className="font-medium">System Online</span>
              </div>
              <div className="text-gray-400">
                Build <span className="font-mono">v2.0.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Animated border */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-400 to-transparent opacity-50"></div>
      </div>
    </footer>
  );
};

export default Footer;