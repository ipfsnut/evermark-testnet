import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon, BookmarkIcon, UserIcon, CalendarIcon, ExternalLinkIcon, ShieldIcon, MessageCircleIcon } from 'lucide-react';
import { useActiveAccount } from "thirdweb/react";
import { VotingPanel } from '../components/voting/VotingPanel';
import { getContract, readContract } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EVERMARK_NFT_ABI } from "../lib/contracts";

interface EvermarkData {
  id: string;
  title: string;
  author: string;
  description: string;
  sourceUrl: string;
  image: string;
  metadataURI: string;
  creator: string;
  creationTime: number;
}

// Helper function to fetch IPFS metadata
const fetchIPFSMetadata = async (metadataURI: string) => {
  if (!metadataURI) return { description: "", sourceUrl: "", image: "" };
  
  try {
    const fetchUrl = metadataURI.startsWith('ipfs://') 
      ? metadataURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
      : metadataURI;
    
    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);
    
    const ipfsData = await response.json();
    
    return {
      description: ipfsData.description || "",
      sourceUrl: ipfsData.external_url || "",
      image: ipfsData.image 
        ? ipfsData.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') 
        : "",
      farcaster_data: ipfsData.farcaster_data
    };
  } catch (error) {
    console.error('Error fetching IPFS metadata:', error);
    return { description: "", sourceUrl: "", image: "" };
  }
};

const EvermarkDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const account = useActiveAccount();
  const [evermark, setEvermark] = useState<EvermarkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        // Fetch IPFS metadata including image
        const { description, sourceUrl, image } = await fetchIPFSMetadata(metadataURI);

        setEvermark({
          id,
          title,
          author,
          description,
          sourceUrl,
          image,
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

  // Helper to check if it's a Farcaster cast
  const isFarcasterCast = () => {
    return evermark?.sourceUrl?.includes('farcaster') || 
           evermark?.description?.includes('Farcaster');
  };
  
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

      {/* Cover Image Section */}
      {evermark.image && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="aspect-video bg-gray-100 relative">
            <img 
              src={evermark.image} 
              alt={evermark.title} 
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
              {evermark.title}
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
          </div>
          <div className="bg-purple-100 rounded-full p-3">
            <BookmarkIcon className="h-6 w-6 text-purple-600" />
          </div>
        </div>
        
        {evermark.description && (
          <div className="mb-6">
            {isFarcasterCast() ? (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <MessageCircleIcon className="h-5 w-5 mr-2 text-purple-600" />
                  Cast Content
                </h2>
                <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-400">
                  <p className="text-gray-700 whitespace-pre-line italic text-lg">
                    "{evermark.description}"
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-3">Description</h2>
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-gray-700 whitespace-pre-line">
                    {evermark.description}
                  </p>
                </div>
              </div>
            )}
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
