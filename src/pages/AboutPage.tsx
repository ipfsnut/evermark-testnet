import React from 'react';
import PageContainer from '../components/layout/PageContainer';
import { MarkdownViewer } from '../components/docs/MarkdownViewer';
import { CONTRACTS } from '../lib/contracts';
import { 
  BookOpenIcon, 
  CodeIcon, 
  ExternalLinkIcon,
  Github,
  Star,
  GitFork,
  Bug,
  Users,
  FileText
} from 'lucide-react';

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

        {/* GitHub Repository Section */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg shadow-sm p-8 text-white">
          <div className="flex items-center mb-6">
            <Github className="h-8 w-8 mr-3" />
            <div>
              <h2 className="text-2xl font-serif font-bold">Open Source Project</h2>
              <p className="text-gray-300">Built in the open, powered by the community</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Repository Info */}
            <div>
              <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold mb-3 text-white">Repository</h3>
                <a
                  href="https://github.com/ipfsnut/evermark-testnet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors text-lg font-medium"
                >
                  github.com/ipfsnut/evermark-testnet
                  <ExternalLinkIcon className="h-4 w-4 ml-2" />
                </a>
                <p className="text-gray-300 mt-3 text-sm">
                  Full-stack decentralized application for permanent content referencing and social discovery.
                  Built with React, TypeScript, and smart contracts on Base blockchain.
                </p>
              </div>

              {/* Tech Stack */}
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-3 text-white">Tech Stack</h3>
                <div className="flex flex-wrap gap-2">
                  {['React', 'TypeScript', 'Tailwind CSS', 'Vite', 'Solidity', 'Base Blockchain', 'IPFS', 'Farcaster SDK'].map((tech) => (
                    <span key={tech} className="px-3 py-1 bg-gray-700 rounded-full text-sm text-gray-200">
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="space-y-4">
              <a
                href="https://github.com/ipfsnut/evermark-testnet"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center">
                  <Star className="h-5 w-5 mr-3 text-yellow-400" />
                  <span className="font-medium">Star the Repository</span>
                </div>
                <ExternalLinkIcon className="h-4 w-4 text-gray-400" />
              </a>

              <a
                href="https://github.com/ipfsnut/evermark-testnet/fork"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center">
                  <GitFork className="h-5 w-5 mr-3 text-green-400" />
                  <span className="font-medium">Fork & Contribute</span>
                </div>
                <ExternalLinkIcon className="h-4 w-4 text-gray-400" />
              </a>

              <a
                href="https://github.com/ipfsnut/evermark-testnet/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center">
                  <Bug className="h-5 w-5 mr-3 text-red-400" />
                  <span className="font-medium">Report Issues</span>
                </div>
                <ExternalLinkIcon className="h-4 w-4 text-gray-400" />
              </a>

              <a
                href="https://github.com/ipfsnut/evermark-testnet/discussions"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-3 text-purple-400" />
                  <span className="font-medium">Join Discussions</span>
                </div>
                <ExternalLinkIcon className="h-4 w-4 text-gray-400" />
              </a>

              <a
                href="https://github.com/ipfsnut/evermark-testnet/blob/main/README.md"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center">
                  <FileText className="h-5 w-5 mr-3 text-blue-400" />
                  <span className="font-medium">Read Documentation</span>
                </div>
                <ExternalLinkIcon className="h-4 w-4 text-gray-400" />
              </a>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-8 p-6 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg border border-purple-500/30">
            <h3 className="text-lg font-semibold mb-2 text-white">Get Involved</h3>
            <p className="text-gray-300 text-sm mb-4">
              Evermark is an open-source project that thrives on community contributions. 
              Whether you're a developer, designer, or blockchain enthusiast, there are many ways to contribute.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://github.com/ipfsnut/evermark-testnet/blob/main/CONTRIBUTING.md"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
              >
                Contributing Guide
                <ExternalLinkIcon className="h-3 w-3 ml-2" />
              </a>
              <a
                href="https://github.com/ipfsnut/evermark-testnet/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
              >
                Good First Issues
                <ExternalLinkIcon className="h-3 w-3 ml-2" />
              </a>
            </div>
          </div>
        </div>

        {/* Protocol Documentation */}
        <MarkdownViewer 
          markdownPath="/docs/protocol-overview.md"
          title="Protocol Overview"
        />

        {/* Token Economics */}
        <MarkdownViewer 
          markdownPath="/docs/token-economics.md"
          title="Token Economics"
        />

        {/* Governance & Voting */}
        <MarkdownViewer 
          markdownPath="/docs/governance-voting.md"
          title="Governance & Voting"
        />

        {/* Reward System */}
        <MarkdownViewer 
          markdownPath="/docs/reward-system.md"
          title="Reward System"
        />

        {/* Technical Overview */}
        <MarkdownViewer 
          markdownPath="/docs/technical-overview.md"
          title="Technical Overview"
        />

        {/* Smart Contracts Information */}
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