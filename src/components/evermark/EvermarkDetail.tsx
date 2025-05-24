import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BookmarkIcon, UserIcon, CalendarIcon, ExternalLinkIcon, ArrowLeftIcon, ShieldIcon, ImageIcon } from 'lucide-react';
import { useEvermarkDetail } from '../../hooks/useEvermarks';
import { VotingPanel } from '../voting/VotingPanel';
import { useWallet } from '../../hooks/useWallet';
import PageContainer from '../layout/PageContainer';

interface EvermarkDetailProps {
  id?: string;
}

export function EvermarkDetail({ id: propId }: EvermarkDetailProps) {
  const params = useParams();
  const id = propId || params.id || '';
  const { evermark, isLoading, error } = useEvermarkDetail(id);
  const { address } = useWallet();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleImageLoad = () => setImageLoading(false);
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };
  
  if (isLoading) {
    return (
      <PageContainer>
        <div className="mb-4">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-purple-600 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
        </div>
        
        <div className="animate-pulse">
          <div className="w-full h-64 bg-gray-200 rounded-lg mb-6"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
          <div className="h-10 bg-gray-200 rounded w-full"></div>
        </div>
      </PageContainer>
    );
  }
  
  if (error || !evermark) {
    return (
      <PageContainer>
        <div className="mb-4">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-purple-600 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <BookmarkIcon className="mx-auto h-12 w-12 text-red-300 mb-4" />
          <h2 className="text-xl font-medium text-gray-900 mb-2">Error Loading Evermark</h2>
          <p className="text-gray-600">{error || "This Evermark could not be found"}</p>
        </div>
      </PageContainer>
    );
  }
  
  const isOwner = Boolean(address && address.toLowerCase() === evermark.creator.toLowerCase());
  
  return (
    <PageContainer>
      <div className="mb-4">
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-gray-600 hover:text-purple-600 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Home
        </Link>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        {/* Hero Image Section - Full width */}
        {evermark.image && !imageError && (
          <div className="w-full h-64 md:h-80 lg:h-96 bg-gray-100 relative overflow-hidden">
            {imageLoading && (
              <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
            )}
            <img
              src={evermark.image}
              alt={evermark.title}
              className={`w-full h-full object-cover ${imageLoading ? 'hidden' : 'block'}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
            {/* Overlay gradient for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
            
            {/* Title overlay on image */}
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2 drop-shadow-lg">
                {evermark.title}
              </h1>
              <div className="flex items-center text-sm md:text-base">
                <UserIcon className="h-4 w-4 mr-1" />
                <span>by {evermark.author}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Content Section */}
        <div className="p-6">
          {/* Title and meta info (if no image) */}
          {(!evermark.image || imageError) && (
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">
                  {evermark.title}
                </h1>
                <div className="flex flex-wrap items-center text-sm text-gray-600 gap-4">
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 mr-1" />
                    <span>{evermark.author}</span>
                  </div>
                </div>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <BookmarkIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          )}
          
          {/* Meta information */}
          <div className="flex flex-wrap items-center text-sm text-gray-600 gap-4 mb-6">
            <div className="flex items-center">
              <CalendarIcon className="h-4 w-4 mr-1" />
              <span>{formatDate(evermark.creationTime)}</span>
            </div>
            {evermark.metadataURI && (
              <div className="flex items-center">
                <ExternalLinkIcon className="h-4 w-4 mr-1" />
                <a 
                  href={evermark.metadataURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline"
                >
                  Metadata
                </a>
              </div>
            )}
            {evermark.sourceUrl && (
              <div className="flex items-center">
                <ExternalLinkIcon className="h-4 w-4 mr-1" />
                <a 
                  href={evermark.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline"
                >
                  Source
                </a>
              </div>
            )}
          </div>
          
          {/* Description */}
          {evermark.description && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 mb-2">Description</h2>
              <p className="text-gray-700 whitespace-pre-line">
                {evermark.description}
              </p>
            </div>
          )}
          
          {/* Blockchain info */}
          <div className="flex items-center text-sm text-gray-600 mb-4">
            <ShieldIcon className="h-4 w-4 mr-1" />
            <span>Preserved on the blockchain</span>
            <span className="mx-2">•</span>
            <span>ID: {evermark.id}</span>
            {isOwner && (
              <>
                <span className="mx-2">•</span>
                <span className="text-green-600 font-medium">You are the creator</span>
              </>
            )}
          </div>
          
          {evermark.metadataURI && evermark.metadataURI.startsWith('ipfs://') && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm">
              <p className="text-blue-700">
                This content is permanently stored on IPFS and referenced on the blockchain.
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Voting Component */}
      <div className="mb-6">
        <VotingPanel evermarkId={id} isOwner={isOwner} />
      </div>
    </PageContainer>
  );
}