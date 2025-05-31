import React from 'react';
import PageContainer from '../components/layout/PageContainer';
import { MarkdownViewer } from '../components/docs/MarkdownViewer';
import { CONTRACTS } from '../lib/contracts';
import { BookOpenIcon, CodeIcon, ExternalLinkIcon } from 'lucide-react';

const AboutPage: React.FC = () => {
  return (
    <PageContainer title="About Evermark Protocol">
      <div className="space-y-8">
        {/* Protocol Overview */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex items-center mb-6">
            <img 
              src="/EvermarkLogo.png" 
              alt="Evermark Protocol" 
              className="h-12 w-auto mr-4"
            />
            <div>
              <h1 className="text-3xl font-serif font-bold text-gray-900">Evermark Protocol</h1>
              <p className="text-gray-600">Permanent reference & social discovery for any sort of online content</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-purple-50 rounded-lg">
              <BookOpenIcon className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Permanent Storage</h3>
              <p className="text-sm text-gray-600">Create immutable references to any online content using blockchain technology</p>
            </div>
            
            <div className="text-center p-6 bg-blue-50 rounded-lg">
              <CodeIcon className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Decentralized</h3>
              <p className="text-sm text-gray-600">Built on Base blockchain with smart contracts ensuring transparency and permanence</p>
            </div>
            
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <ExternalLinkIcon className="h-8 w-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Social Discovery</h3>
              <p className="text-sm text-gray-600">Discover and share valuable content through community curation and bookmarking</p>
            </div>
          </div>
        </div>

        {/* Documentation Viewer */}
        <MarkdownViewer 
          markdownPath="/docs/protocol-overview.md"
          title="Protocol Documentation"
        />

        {/* Contract Information */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-xl font-serif font-bold text-gray-900 mb-4">Smart Contracts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(CONTRACTS)
              .filter(([_, address]) => address)
              .map(([name, address]) => (
                <div key={name} className="bg-white p-4 rounded-lg border">
                  <h3 className="font-medium text-gray-900 mb-2">
                    {name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </h3>
                  <a
                    href={`https://basescan.org/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-purple-600 hover:text-purple-800 break-all flex items-center"
                  >
                    {address}
                    <ExternalLinkIcon className="h-3 w-3 ml-1 flex-shrink-0" />
                  </a>
                </div>
              ))}
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default AboutPage;