import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-6">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p className="text-sm text-gray-600">
          &copy; {new Date().getFullYear()} Evermark - Content preservation on the blockchain
        </p>
        <div className="mt-2 flex justify-center space-x-6">
          <a href="#" className="text-gray-500 hover:text-purple-600 transition-colors">
            Terms
          </a>
          <a href="#" className="text-gray-500 hover:text-purple-600 transition-colors">
            Privacy
          </a>
          <a href="#" className="text-gray-500 hover:text-purple-600 transition-colors">
            Docs
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;