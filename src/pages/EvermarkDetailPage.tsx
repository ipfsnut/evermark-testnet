import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, BookmarkIcon, UserIcon, CalendarIcon, ExternalLinkIcon, ShieldIcon, MessageCircleIcon } from 'lucide-react';
import { useActiveAccount } from "thirdweb/react";
import { VotingPanel } from '../components/voting/VotingPanel';
import { getContract, readContract } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EVERMARK_NFT_ABI } from "../lib/contracts";
import { useEvermarkMetadata } from '../hooks/useEvermarkMetadata';

interface EvermarkData {
  id: string;
  title: string;
  author: string;
  metadataURI: string;
  creator: string;
  creationTime: number;
}

const EvermarkDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const account = useActiveAccount();
  const [evermark, setEvermark] = useState<EvermarkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { metadata, getImageUrl, isFarcasterCast } = useEvermarkMetadata(evermark?.metadataURI);

  useEffect(() => {
    const fetchEvermarkDetails = async () => {
      if (!id) {
        setError("Invalid Evermark ID");
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const contract = getContract({
          client,
          chain: CHAIN,
          address: CONTRACTS.EVERMARK_NFT,
          abi: EVERMARK_NFT_ABI,
        });

        const [title, author, metadataURI] = await readContract({
          contract,
          method: "getEvermarkMetadata",
          params: [BigInt(id)],
        });

        const creator = await readContract({
          contract,
          method: "getEvermarkCreator",
          params: [BigInt(id)],
        });

        const creationTime = await readContract({
          contract,
          method: "getEvermarkCreationTime",
          params: [BigInt(id)],
        });

        setEvermark({
          id,
          title,
          author,
          metadataURI,
          creator,
          creationTime: Number(creationTime) * 1000,
        });
        console.log("🔍 EVERMARK FETCHED:", {
          id,
          title,
          author,
          metadataURI,
          creator,
          creationTime: Number(creationTime) * 1000,
        });
      } catch (err: any) {
        console.error("Error fetching Evermark:", err);
        setError(err.message || "Failed to load Evermark details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvermarkDetails();
  }, [id]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  console.log("🔍 Evermark data:", evermark);
  console.log("🔍 Metadata URI:", evermark?.metadataURI);
  console.log("🔍 Metadata:", metadata);
  console.log("🔍 getImageUrl():", getImageUrl());

  const displayTitle = metadata?.name || evermark?.title || '';
  const displayDescription = metadata?.description || '';
  const displayImage = getImageUrl();
  console.log("🔍 Final displayImage:", displayImage);
  const externalUrl = metadata?.external_url;
  
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-gray-600 hover:text-purple-600 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-6"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (error || !evermark) {
    return (
      <div className="max-w-4xl mx-auto">
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
      </div>
    );
  }
  
  const isOwner = account && account.address.toLowerCase() === evermark.creator.toLowerCase();
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-gray-600 hover:text-purple-600 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Back to Home
        </Link>
      </div>

      {displayImage && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="aspect-video bg-gray-100 relative">
            <img
              src={displayImage}
              alt={displayTitle}
              className="w-full h-full object-cover"
            />
            {isFarcasterCast() && (
              <div className="absolute top-4 right-4 bg-purple-600 text-white px-3 py-2 rounded-full text-sm font-medium flex items-center">
                <MessageCircleIcon className="h-4 w-4 mr-2" />
                Farcaster Cast
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">
              {displayTitle}
            </h1>
            <div className="flex flex-wrap items-center text-sm text-gray-600 gap-4">
              <div className="flex items-center">
                <UserIcon className="h-4 w-4 mr-1" />
                <span>{evermark.author}</span>
              </div>
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
              {externalUrl && (
                <div className="flex items-center">
                  <ExternalLinkIcon className="h-4 w-4 mr-1" />
                  <a 
                    href={externalUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-600 hover:underline"
                  >
                    Source
                  </a>
                </div>
              )}
            </div>
          </div>
          <div className="bg-purple-100 rounded-full p-3">
            <BookmarkIcon className="h-6 w-6 text-purple-600" />
          </div>
        </div>
        
        {displayDescription && (
          <div className="mb-6">
            {isFarcasterCast() ? (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <MessageCircleIcon className="h-5 w-5 mr-2 text-purple-600" />
                  Cast Content
                </h2>
                <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-400">
                  <p className="text-gray-700 whitespace-pre-line italic text-lg">
                    "{displayDescription}"
                  </p>
                  
                  {metadata?.farcaster_data && (
                    <div className="mt-4 pt-4 border-t border-purple-200">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-purple-900">Author:</span>
                          <span className="ml-2 text-purple-700">@{metadata.farcaster_data.author.username}</span>
                        </div>
                        <div>
                          <span className="font-medium text-purple-900">Cast Hash:</span>
                          <span className="ml-2 font-mono text-xs text-purple-700">{metadata.farcaster_data.cast_hash}</span>
                        </div>
                        {metadata.farcaster_data.author.fid > 0 && (
                          <div>
                            <span className="font-medium text-purple-900">FID:</span>
                            <span className="ml-2 text-purple-700">{metadata.farcaster_data.author.fid}</span>
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-purple-900">Original:</span>
                          <a 
                            href={metadata.farcaster_data.canonical_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-2 text-purple-600 hover:underline"
                          >
                            View on Farcaster
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-3">Description</h2>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-700 whitespace-pre-line">
                    {displayDescription}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
        
        {metadata?.attributes && metadata.attributes.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Attributes</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {metadata.attributes.map((attr, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {attr.trait_type}
                  </div>
                  <div className="text-sm text-gray-900 mt-1">
                    {attr.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
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
      </div>
      
      <div className="mb-6">
        <VotingPanel evermarkId={id || ""} isOwner={isOwner} />
      </div>
    </div>
  );
};

export default EvermarkDetailPage;
