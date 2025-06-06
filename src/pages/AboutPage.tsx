import React, { useState } from 'react';
import PageContainer from '../components/layout/PageContainer';
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
  FileText,
  ChevronRightIcon,
  ChevronDownIcon,
  CoinsIcon,
  VoteIcon,
  TrophyIcon,
  GiftIcon,
  ShoppingCartIcon,
  LayersIcon,
  DatabaseIcon,
  ZapIcon,
  ShieldIcon,
  TrendingUpIcon,
  RefreshCwIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from 'lucide-react';

// Expandable documentation section component
const DocSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}> = ({ title, icon, children, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center">
          <div className="p-2 bg-purple-100 rounded-lg mr-4">
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        {isExpanded ? (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronRightIcon className="h-5 w-5 text-gray-500" />
        )}
      </button>
      
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

// Feature highlight component
const FeatureHighlight: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  details: string[];
}> = ({ icon, title, description, details }) => (
  <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
    <div className="flex items-center mb-4">
      <div className="p-2 bg-purple-600 text-white rounded-lg mr-3">
        {icon}
      </div>
      <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
    </div>
    <p className="text-gray-700 mb-4">{description}</p>
    <ul className="space-y-2">
      {details.map((detail, index) => (
        <li key={index} className="flex items-start">
          <CheckCircleIcon className="h-4 w-4 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
          <span className="text-sm text-gray-600">{detail}</span>
        </li>
      ))}
    </ul>
  </div>
);

const AboutPage: React.FC = () => {
  return (
    <PageContainer title="About Evermark Protocol">
      <div className="space-y-8">
        {/* Protocol Header */}
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

        {/* Core Features Deep Dive */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FeatureHighlight
            icon={<BookOpenIcon className="h-5 w-5" />}
            title="Evermark NFTs"
            description="Permanent, immutable bookmarks stored as NFTs on Base blockchain"
            details={[
              "Create permanent references to any online content",
              "Metadata stored on IPFS for decentralized access",
              "Support for Farcaster casts, URLs, DOIs, ISBNs",
              "Rich metadata with titles, descriptions, and images",
              "Transferable and tradeable on secondary markets"
            ]}
          />
          
          <FeatureHighlight
            icon={<CoinsIcon className="h-5 w-5" />}
            title="Dual Token System"
            description="EMARK liquid tokens and wEMARK governance tokens working together"
            details={[
              "$EMARK: Liquid utility token for fees and rewards",
              "wEMARK: Wrapped staking token with voting power",
              "Unbonding period for unstaking wEMARK tokens",
              "Governance participation through token delegation",
              "Dual-token rewards (ETH + EMARK) for participants"
            ]}
          />
          
          <FeatureHighlight
            icon={<VoteIcon className="h-5 w-5" />}
            title="Community Governance"
            description="Democratic voting system for content curation and platform decisions"
            details={[
              "Weekly voting cycles for Evermark rankings",
              "Delegate wEMARK tokens to support quality content",
              "Leaderboard system for top-voted content",
              "Reward multipliers for consistent participation",
              "Transparent on-chain voting and results"
            ]}
          />
          
          <FeatureHighlight
            icon={<GiftIcon className="h-5 w-5" />}
            title="Reward Distribution"
            description="Automated dual-token rewards for active community members"
            details={[
              "ETH rewards from protocol fees and revenue",
              "EMARK token rewards from emission schedule",
              "Staking rewards for wEMARK token holders",
              "Voting participation bonuses and multipliers",
              "Automated distribution every reward period"
            ]}
          />
        </div>

        {/* Technical Documentation Sections */}
        <div className="space-y-4">
          <h2 className="text-2xl font-serif font-bold text-gray-900">Technical Documentation</h2>
          
          <DocSection
            title="Protocol Architecture"
            icon={<LayersIcon className="h-5 w-5 text-purple-600" />}
            defaultExpanded={true}
          >
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Core Components</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">Smart Contracts</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• EvermarkNFT: Core NFT contract for Evermarks</li>
                      <li>• CardCatalog: Token wrapping and staking</li>
                      <li>• Voting: Democratic governance system</li>
                      <li>• Rewards: Dual-token reward distribution</li>
                      <li>• FeeCollector: Revenue collection and routing</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-2">Infrastructure</h5>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Base Blockchain: L2 scaling and low fees</li>
                      <li>• IPFS: Decentralized metadata storage</li>
                      <li>• Pinata: IPFS pinning and gateway services</li>
                      <li>• Farcaster: Social integration and frames</li>
                      <li>• React/TypeScript: Modern web frontend</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Data Flow</h4>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded">User Input</span>
                    <ArrowRightIcon className="h-4 w-4 text-blue-600" />
                    <span className="bg-purple-600 text-white px-2 py-1 rounded">IPFS Storage</span>
                    <ArrowRightIcon className="h-4 w-4 text-purple-600" />
                    <span className="bg-green-600 text-white px-2 py-1 rounded">NFT Minting</span>
                    <ArrowRightIcon className="h-4 w-4 text-green-600" />
                    <span className="bg-amber-600 text-white px-2 py-1 rounded">Blockchain</span>
                  </div>
                </div>
              </div>
            </div>
          </DocSection>

          <DocSection
            title="Token Economics"
            icon={<CoinsIcon className="h-5 w-5 text-green-600" />}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">$EMARK Token</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• <strong>Purpose:</strong> Utility token for platform fees</li>
                    <li>• <strong>Use Cases:</strong> Minting fees, transaction costs</li>
                    <li>• <strong>Supply:</strong> Fixed total supply with emission schedule</li>
                    <li>• <strong>Distribution:</strong> Rewards, liquidity, development</li>
                    <li>• <strong>Transferability:</strong> Fully liquid and tradeable</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">wEMARK Token</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• <strong>Purpose:</strong> Governance and voting power</li>
                    <li>• <strong>Mechanism:</strong> Wrapped/staked EMARK tokens</li>
                    <li>• <strong>Voting Power:</strong> 1:1 ratio with wEMARK balance</li>
                    <li>• <strong>Unbonding:</strong> 7-day unstaking period</li>
                    <li>• <strong>Rewards:</strong> Staking yields and governance bonuses</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Token Flow</h4>
                <p className="text-sm text-gray-600">
                  Users wrap EMARK → wEMARK for voting → Participate in governance → 
                  Earn dual rewards → Compound or unwrap → Repeat cycle
                </p>
              </div>
            </div>
          </DocSection>

          <DocSection
            title="Governance & Voting"
            icon={<VoteIcon className="h-5 w-5 text-blue-600" />}
          >
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Weekly Voting Cycles</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600 mb-2">7</div>
                    <div className="text-sm text-gray-600">Days per cycle</div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600 mb-2">∞</div>
                    <div className="text-sm text-gray-600">Evermarks eligible</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600 mb-2">10</div>
                    <div className="text-sm text-gray-600">Top leaderboard spots</div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Voting Mechanism</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Delegate wEMARK tokens to support Evermarks</li>
                  <li>• Vote weight equals delegated token amount</li>
                  <li>• Cannot vote on your own created Evermarks</li>
                  <li>• Votes can be changed or withdrawn during cycle</li>
                  <li>• Results finalized at end of weekly cycle</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Reward Multipliers</h4>
                <div className="bg-amber-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-amber-600">1.0x</div>
                      <div className="text-gray-600">Base Rate</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-amber-600">1.25x</div>
                      <div className="text-gray-600">50%+ Delegation</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-amber-600">1.5x</div>
                      <div className="text-gray-600">75%+ Delegation</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-amber-600">2.0x</div>
                      <div className="text-gray-600">100% Delegation</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </DocSection>

          <DocSection
            title="Reward System"
            icon={<GiftIcon className="h-5 w-5 text-amber-600" />}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                    <ZapIcon className="h-5 w-5 mr-2" />
                    ETH Rewards
                  </h4>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li>• Generated from protocol fees and revenue</li>
                    <li>• Minting fees from Evermark creation</li>
                    <li>• Trading fees from marketplace activity</li>
                    <li>• Distributed proportionally to stakers</li>
                    <li>• Real economic value from platform usage</li>
                  </ul>
                </div>
                
                <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <h4 className="font-semibold text-purple-900 mb-3 flex items-center">
                    <CoinsIcon className="h-5 w-5 mr-2" />
                    EMARK Rewards
                  </h4>
                  <ul className="space-y-2 text-sm text-purple-800">
                    <li>• Distributed via emission schedule</li>
                    <li>• Governance participation incentives</li>
                    <li>• Community growth and adoption rewards</li>
                    <li>• Long-term platform sustainability</li>
                    <li>• Decreasing issuance over time</li>
                  </ul>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Distribution Schedule</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Reward Period:</span>
                    <span className="text-gray-600">7 days</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="font-medium">Eligibility:</span>
                    <span className="text-gray-600">Active wEMARK stakers</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="font-medium">Distribution:</span>
                    <span className="text-gray-600">Proportional to stake & multipliers</span>
                  </div>
                </div>
              </div>
            </div>
          </DocSection>

          <DocSection
            title="User Experience Features"
            icon={<Users className="h-5 w-5 text-indigo-600" />}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Personal Bookshelf</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Curate up to 3 favorite Evermarks</li>
                    <li>• Maintain a reading list of 10 items</li>
                    <li>• Add personal notes to bookmarked items</li>
                    <li>• Organize and discover content efficiently</li>
                    <li>• Share collections with the community</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Social Discovery</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Browse community-curated content</li>
                    <li>• Follow trending and top-voted Evermarks</li>
                    <li>• Discover new creators and collections</li>
                    <li>• Share Evermarks across social platforms</li>
                    <li>• Integrate with Farcaster for social context</li>
                  </ul>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Content Support</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { type: 'Farcaster Casts', desc: 'Social media posts' },
                    { type: 'Academic Papers', desc: 'DOI references' },
                    { type: 'Books & Publications', desc: 'ISBN cataloging' },
                    { type: 'Web Content', desc: 'Any URL reference' }
                  ].map((item, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg text-center">
                      <div className="font-medium text-gray-900 text-sm">{item.type}</div>
                      <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DocSection>

          <DocSection
            title="Security & Decentralization"
            icon={<ShieldIcon className="h-5 w-5 text-red-600" />}
          >
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Smart Contract Security</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Audited smart contracts on Base blockchain</li>
                    <li>• Immutable NFT metadata and ownership</li>
                    <li>• Transparent voting and governance</li>
                    <li>• Multi-signature administrative controls</li>
                    <li>• Time-locked governance changes</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Data Permanence</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• IPFS ensures decentralized storage</li>
                    <li>• Pinata provides reliable pinning services</li>
                    <li>• Multiple gateway redundancy</li>
                    <li>• Content addressing prevents tampering</li>
                    <li>• Community-driven preservation incentives</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-900 mb-2">Decentralization Guarantees</h4>
                <p className="text-sm text-red-800">
                  All critical data is stored on-chain or IPFS. The protocol can function independently 
                  of any centralized services, ensuring permanent access to content and governance.
                </p>
              </div>
            </div>
          </DocSection>
        </div>

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