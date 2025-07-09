import React, { useEffect } from 'react';
import { X as XIcon, ExternalLinkIcon, UserIcon, CalendarIcon, EyeIcon, ShareIcon, ZapIcon } from 'lucide-react';
import { useEvermarkDetail } from '../../hooks/useEvermarks';
import { useViewTracking, formatViewCount } from '../../hooks/useViewTracking';
import { EvermarkImage } from '../layout/UniversalImage';
import { formatDistanceToNow } from 'date-fns';
import { cn, useIsMobile } from '../../utils/responsive';

interface EvermarkDetailModalProps {
  evermarkId: string;
  isOpen: boolean;
  onClose: () => void;
  onWemark?: () => void;
}

export const EvermarkDetailModal: React.FC<EvermarkDetailModalProps> = ({
  evermarkId,
  isOpen,
  onClose,
  onWemark
}) => {
  const { evermark, isLoading, error } = useEvermarkDetail(evermarkId);
  const { viewStats } = useViewTracking(evermarkId);
  const isMobile = useIsMobile();

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={cn(
        'relative bg-gray-900 border border-gray-700 rounded-lg shadow-2xl shadow-green-500/20',
        'max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden',
        'animate-in zoom-in-95 duration-200'
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-black font-bold text-sm">E</span>
            </div>
            <span className="text-green-400 font-bold">Evermark Detail</span>
          </div>
          
          <div className="flex items-center gap-2">
            {onWemark && (
              <button
                onClick={onWemark}
                className={cn(
                  'px-4 py-2 bg-gradient-to-r from-green-400 to-green-600 text-black font-bold rounded',
                  'hover:from-green-300 hover:to-green-500 transition-all duration-200',
                  'shadow-lg shadow-green-500/30 hover:shadow-green-500/50',
                  'flex items-center gap-2'
                )}
              >
                <ZapIcon className="h-4 w-4" />
                <span>$WEMARK</span>
              </button>
            )}
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
              <span className="ml-3 text-gray-400">Loading Evermark...</span>
            </div>
          ) : error || !evermark ? (
            <div className="text-center py-16">
              <div className="text-red-400 text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-medium text-white mb-2">Error Loading Evermark</h3>
              <p className="text-gray-400">{error || "Evermark not found"}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              {/* Image Section */}
              <div className="space-y-4">
                <div className={cn(
                  'relative rounded-lg overflow-hidden',
                  isMobile ? 'h-64' : 'h-80'
                )}>
                  <EvermarkImage
                    src={evermark.image}
                    alt={evermark.title}
                    aspectRatio="video"
                    rounded="lg"
                    className="w-full h-full"
                  />
                  
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                </div>

                {/* Quick Actions */}
                <div className="flex gap-3">
                  <button className="flex-1 bg-gray-700 text-gray-300 py-2 px-4 rounded hover:bg-gray-600 transition-colors flex items-center justify-center gap-2">
                    <ShareIcon className="h-4 w-4" />
                    <span>Share</span>
                  </button>
                  
                  <a
                    href={`/evermark/${evermark.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-gray-700 text-gray-300 py-2 px-4 rounded hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLinkIcon className="h-4 w-4" />
                    <span>Open Page</span>
                  </a>
                </div>
              </div>

              {/* Content Section */}
              <div className="space-y-6">
                {/* Title & Meta */}
                <div>
                  <h1 className="text-2xl font-bold text-white mb-3 leading-tight">
                    {evermark.title}
                  </h1>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 mr-1" />
                      <span>{evermark.author}</span>
                    </div>
                    <div className="flex items-center">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      <span>{formatDistanceToNow(evermark.creationTime, { addSuffix: true })}</span>
                    </div>
                    {viewStats && (
                      <div className="flex items-center text-cyan-400">
                        <EyeIcon className="h-4 w-4 mr-1" />
                        <span>{formatViewCount(viewStats.totalViews)} views</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {evermark.description && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-green-400">Description</h3>
                    <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                      {evermark.description}
                    </p>
                  </div>
                )}

                {/* Source URL */}
                {evermark.sourceUrl && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-green-400">Source</h3>
                    <a
                      href={evermark.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 transition-colors break-all"
                    >
                      {evermark.sourceUrl}
                    </a>
                  </div>
                )}

                {/* Blockchain Info */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-green-400">Blockchain Verification</h3>
                  <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Token ID:</span>
                      <span className="font-mono text-white">{evermark.id}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Creator:</span>
                      <span className="font-mono text-white text-xs">
                        {evermark.creator?.slice(0, 6)}...{evermark.creator?.slice(-4)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Network:</span>
                      <span className="text-green-400 font-medium">Base Mainnet</span>
                    </div>
                  </div>
                </div>

                {/* IPFS Info */}
                {evermark.metadataURI && (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-green-400">Decentralized Storage</h3>
                    <div className="bg-gray-800 rounded-lg p-4">
                      <p className="text-gray-300 text-sm mb-3">
                        This content is permanently stored on IPFS and referenced on the blockchain.
                      </p>
                      <a
                        href={evermark.metadataURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:text-cyan-300 transition-colors text-sm"
                      >
                        View IPFS Metadata →
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};