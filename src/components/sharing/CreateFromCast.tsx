import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useFarcasterUser } from '../../lib/farcaster';
import { useActiveAccount } from 'thirdweb/react';

interface CastData {
  hash: string;
  authorFid: string;
  viewerFid?: string;
  // We'll populate more fields as we fetch cast data
  content?: string;
  author?: {
    username?: string;
    displayName?: string;
    pfpUrl?: string;
  };
  timestamp?: number;
  channelKey?: string;
}

export const CreateFromCast: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, hasVerifiedAddress } = useFarcasterUser();
  const activeAccount = useActiveAccount();
  
  const [castData, setCastData] = useState<CastData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
  
  useEffect(() => {
    if (!castHash || !castFid) {
      setError('Missing cast information');
      setIsLoading(false);
      return;
    }
    
    // Initialize cast data
    const initialCastData: CastData = {
      hash: castHash,
      authorFid: castFid,
      viewerFid: viewerFid || undefined
    };
    
    setCastData(initialCastData);
    
    // Pre-populate form with cast-based suggestions
    setTitle(`Cast by FID:${castFid}`);
    setDescription(`Evermark created from Farcaster cast ${castHash.slice(0, 8)}...\n\nOriginal cast hash: ${castHash}`);
    setTags('farcaster, cast, social, web3');
    
    setIsLoading(false);
    
    // TODO: In a real implementation, you might want to fetch additional cast data
    // from your backend or a Farcaster API to get the actual cast content
    
  }, [castHash, castFid, viewerFid]);
  
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
      
      // Prepare the Evermark data
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
          timestamp: new Date().toISOString()
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
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Preparing cast data...</p>
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
        
        {/* Cast Info Card */}
        {castData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">📤 Source Cast</h3>
            <div className="text-sm text-blue-800 space-y-1">
              <p><strong>Cast Hash:</strong> <code className="bg-blue-100 px-1 rounded">{castData.hash.slice(0, 16)}...</code></p>
              <p><strong>Author FID:</strong> {castData.authorFid}</p>
              {castData.viewerFid && (
                <p><strong>Shared by FID:</strong> {castData.viewerFid}</p>
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
                rows={4}
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
          </div>
        </div>
      </div>
    </div>
  );
};