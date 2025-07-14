// src/components/sharing/CreateFromCast.tsx - Enhanced with rich cast data
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useFarcasterUser } from '../../lib/farcaster';
import { useActiveAccount } from 'thirdweb/react';
import { farcasterAPI, castUtils, useCastData, type FarcasterCast } from '../../lib/farcaster-api';
import { Heart, MessageCircle, Repeat, Calendar, Hash, ExternalLink } from 'lucide-react';

interface CastData {
  hash: string;
  authorFid: string;
  viewerFid?: string;
  content?: string;
  author?: {
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
  timestamp?: number;
  channelKey?: string;
}

// Rich cast preview component
const CastPreview: React.FC<{ cast: FarcasterCast }> = ({ cast }) => {
  const formatted = castUtils.formatForDisplay(cast);
  const hashtags = castUtils.extractHashtags(cast.text);
  const urls = castUtils.extractUrls(cast.text);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <h3 className="font-medium text-blue-900 mb-3">📤 Source Cast Preview</h3>
      
      <div className="bg-white rounded-lg p-4 border border-blue-100">
        {/* Author info */}
        <div className="flex items-start space-x-3 mb-3">
          <img 
            src={formatted.author.pfpUrl} 
            alt={formatted.author.displayName}
            className="w-10 h-10 rounded-full bg-gray-200"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${formatted.author.username}`;
            }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-semibold text-gray-900 truncate">
                {formatted.author.displayName}
              </span>
              <span className="text-gray-500 text-sm">@{formatted.author.username}</span>
              {formatted.author.isVerified && (
                <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{formatted.metadata.timestamp.toLocaleDateString()}</span>
              </div>
              
              {formatted.metadata.channel && (
                <div className="flex items-center space-x-1">
                  <Hash className="w-3 h-3" />
                  <span>/{formatted.metadata.channel}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cast content */}
        <div className="mb-3">
          <p className="text-gray-900 text-sm leading-relaxed whitespace-pre-wrap">
            {formatted.content.mentionsFormatted}
          </p>
        </div>

        {/* Hashtags */}
        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {hashtags.map((tag) => (
              <span 
                key={tag} 
                className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* URLs */}
        {urls.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-700 mb-1">Links:</p>
            {urls.slice(0, 2).map((url, index) => (
              <a 
                key={index}
                href={url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-xs"
              >
                <ExternalLink className="w-3 h-3" />
                <span className="truncate">{url.slice(0, 50)}...</span>
              </a>
            ))}
          </div>
        )}

        {/* Engagement stats */}
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <div className="flex items-center space-x-1">
            <Heart className="w-3 h-3" />
            <span>{formatted.engagement.likes.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <Repeat className="w-3 h-3" />
            <span>{formatted.engagement.recasts.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <MessageCircle className="w-3 h-3" />
            <span>{formatted.engagement.replies.toLocaleString()}</span>
          </div>

          <div className="ml-auto">
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
              Quality: {Math.round(castUtils.getQualityScore(cast))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CreateFromCast: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, hasVerifiedAddress } = useFarcasterUser();
  const activeAccount = useActiveAccount();
  
  const [castData, setCastData] = useState<CastData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('social');
  
  const castHash = searchParams.get('castHash');
  const castFid = searchParams.get('castFid');
  const viewerFid = searchParams.get('viewerFid');
  
  // Enhanced cast data from API
  const { cast: richCast, isLoading: isLoadingCast, error: castError } = useCastData(castHash);
  
  // Pre-populate form data from URL params or rich cast data
  useEffect(() => {
    if (!castHash || !castFid) {
      setError('Missing cast information');
      return;
    }
    
    // Initialize basic cast data
    const initialCastData: CastData = {
      hash: castHash,
      authorFid: castFid,
      viewerFid: viewerFid || undefined
    };
    
    setCastData(initialCastData);
    
    // Pre-populate form with cast-based suggestions or URL params
    const titleFromParams = searchParams.get('title');
    const authorFromParams = searchParams.get('author');
    const channelFromParams = searchParams.get('channel');
    
    if (richCast) {
      // Use rich cast data for better form pre-population
      const formatted = castUtils.formatForDisplay(richCast);
      const hashtags = castUtils.extractHashtags(richCast.text);
      
      setTitle(titleFromParams || `"${richCast.text.slice(0, 50)}..." by ${formatted.author.displayName}`);
      setDescription(`Evermark created from a Farcaster cast by ${formatted.author.displayName} (@${formatted.author.username})\n\nOriginal cast: "${richCast.text}"\n\nCast hash: ${castHash}`);
      setTags(['farcaster', 'cast', 'social', 'web3', ...hashtags].join(', '));
      
      // Set category based on channel or content
      if (formatted.metadata.channel) {
        const channelCategories: Record<string, string> = {
          'art': 'art',
          'design': 'art',
          'tech': 'technology',
          'dev': 'technology',
          'crypto': 'technology',
          'defi': 'technology',
          'nft': 'art',
          'news': 'news',
          'culture': 'culture',
          'music': 'entertainment',
          'gaming': 'entertainment'
        };
        
        const detectedCategory = channelCategories[formatted.metadata.channel.toLowerCase()];
        if (detectedCategory) {
          setCategory(detectedCategory);
        }
      }
    } else {
      // Fallback to basic form pre-population
      setTitle(titleFromParams || `Cast by ${authorFromParams || `FID:${castFid}`}`);
      setDescription(`Evermark created from Farcaster cast ${castHash.slice(0, 8)}...\n\nOriginal cast hash: ${castHash}`);
      setTags('farcaster, cast, social, web3');
    }
    
  }, [castHash, castFid, viewerFid, richCast, searchParams]);
  
  const handleCreateEvermark = async () => {
    if (!castData) {
      setError('Missing cast data');
      return;
    }
    
    if (!isAuthenticated && !activeAccount) {
      setError('Please connect your wallet to create an Evermark');
      return;
    }
    
    if (!title.trim()) {
      setError('Please enter a title for your Evermark');
      return;
    }
    
    if (!description.trim()) {
      setError('Please enter a description for your Evermark');
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    try {
      // Track the creation attempt
      await fetch('/.netlify/functions/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evermarkId: `cast-creation-${castData.hash}`,
          platform: 'farcaster_create_from_cast',
          timestamp: new Date().toISOString(),
          castHash: castData.hash,
          castFid: castData.authorFid,
          viewerFid: castData.viewerFid
        })
      });
      
      // Prepare the Evermark data with rich cast info if available
      const evermarkData = {
        title: title.trim(),
        description: description.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(t => t.length > 0),
        category,
        source: 'farcaster_cast',
        sourceData: {
          castHash: castData.hash,
          authorFid: castData.authorFid,
          viewerFid: castData.viewerFid,
          timestamp: new Date().toISOString(),
          // Include rich cast data if available
          ...(richCast && {
            richCastData: {
              text: richCast.text,
              author: {
                fid: richCast.author.fid,
                username: richCast.author.username,
                displayName: richCast.author.display_name,
                pfpUrl: richCast.author.pfp_url
              },
              engagement: {
                likes: richCast.reactions.likes_count,
                recasts: richCast.reactions.recasts_count,
                replies: richCast.replies.count
              },
              channel: richCast.channel?.name,
              timestamp: richCast.timestamp,
              qualityScore: castUtils.getQualityScore(richCast)
            }
          })
        }
      };
      
      console.log('🎯 Creating Evermark from cast:', evermarkData);
      
      // Navigate to the main create page with pre-filled data
      const createParams = new URLSearchParams();
      createParams.set('title', evermarkData.title);
      createParams.set('description', evermarkData.description);
      createParams.set('tags', evermarkData.tags.join(', '));
      createParams.set('category', evermarkData.category);
      createParams.set('source', 'farcaster_cast');
      createParams.set('sourceHash', castData.hash);
      createParams.set('sourceFid', castData.authorFid);
      
      navigate(`/create?${createParams.toString()}`);
      
    } catch (err) {
      console.error('Failed to prepare Evermark creation:', err);
      setError('Failed to prepare Evermark. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleGoBack = () => {
    navigate('/share');
  };
  
  if (isLoadingCast) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading cast data...</p>
          <p className="text-xs text-gray-500 mt-1">Fetching from Farcaster...</p>
        </div>
      </div>
    );
  }
  
  if (error && !castData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h1 className="text-lg font-semibold text-red-900 mb-2">
              Creation Error
            </h1>
            <p className="text-red-700 mb-4">{error}</p>
            <div className="space-y-2">
              <button 
                onClick={handleGoBack}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Go Back
              </button>
              <button 
                onClick={() => navigate('/')}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Create Evermark from Cast
          </h1>
          <p className="text-gray-600">
            Fill in the details to create your Evermark
          </p>
        </div>
        
        {/* Rich Cast Preview */}
        {richCast && <CastPreview cast={richCast} />}
        
        {/* Fallback Cast Info Card */}
        {!richCast && castData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">📤 Source Cast</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Cast Hash:</strong> <code className="bg-blue-100 px-1 rounded">{castData.hash.slice(0, 16)}...</code></p>
              <p><strong>Author FID:</strong> {castData.authorFid}</p>
              {castData.viewerFid && (
                <p><strong>Shared by FID:</strong> {castData.viewerFid}</p>
              )}
              {castError && (
                <p className="text-orange-700"><strong>Note:</strong> Rich cast data unavailable ({castError})</p>
              )}
            </div>
          </div>
        )}
        
        {/* Creation Form */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <form onSubmit={(e) => { e.preventDefault(); handleCreateEvermark(); }} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter a title for your Evermark"
                required
              />
            </div>
            
            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Describe what makes this cast worth preserving..."
                required
              />
            </div>
            
            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="farcaster, cast, social, web3 (comma separated)"
              />
              <p className="text-xs text-gray-500 mt-1">Separate tags with commas</p>
            </div>
            
            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="social">Social</option>
                <option value="technology">Technology</option>
                <option value="art">Art</option>
                <option value="culture">Culture</option>
                <option value="news">News</option>
                <option value="education">Education</option>
                <option value="entertainment">Entertainment</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
            
            {/* Wallet Status */}
            {!isAuthenticated && !activeAccount && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800 text-sm">
                  ⚠️ Please connect your wallet to create an Evermark
                </p>
              </div>
            )}
            
            {/* Rich cast quality indicator */}
            {richCast && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-800 text-sm">
                  ✨ <strong>High-quality cast detected!</strong> This cast has {richCast.reactions.likes_count + richCast.reactions.recasts_count} engagements and appears to be well-crafted content.
                </p>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={handleGoBack}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isCreating}
              >
                Back
              </button>
              
              <button
                type="submit"
                disabled={isCreating || (!isAuthenticated && !activeAccount) || !title.trim() || !description.trim()}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  '🎯 Create Evermark'
                )}
              </button>
            </div>
          </form>
        </div>
        
        {/* Help Section */}
        <div className="mt-8 bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-medium text-purple-900 mb-2">💡 What happens next?</h3>
          <div className="text-sm text-purple-800 space-y-1">
            <p>• Your Evermark will be minted on-chain with the cast reference</p>
            <p>• The original cast data will be preserved permanently</p>
            <p>• Others can discover and collect your Evermark</p>
            <p>• You'll earn rewards when others interact with it</p>
            {richCast && (
              <p>• Rich cast metadata (engagement, author info) will be included</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};