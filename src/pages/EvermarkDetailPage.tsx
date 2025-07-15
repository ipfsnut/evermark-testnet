// src/pages/EvermarkDetailPage.tsx - Enhanced error handling and fallbacks
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  BookmarkIcon, 
  ArrowLeftIcon, 
  AlertCircleIcon,
  RefreshCwIcon
} from 'lucide-react';

interface EvermarkData {
  id: string;
  title: string;
  author: string;
  description?: string;
  creator: string;
  creationTime: number;
  image?: string;
  sourceUrl?: string;
  metadataURI?: string;
}

const EvermarkDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [evermark, setEvermark] = useState<EvermarkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchEvermark = async (evermarkId: string, attempt: number = 1) => {
    console.log(`🔍 Fetching Evermark ${evermarkId}, attempt ${attempt}`);
    
    try {
      // Try multiple endpoints with fallbacks
      const endpoints = [
        `/.netlify/functions/evermarks?id=${evermarkId}`,
        `/api/evermarks/${evermarkId}`,
        `/api/evermarks?id=${evermarkId}`
      ];

      let lastError: Error | null = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`📡 Trying endpoint: ${endpoint}`);
          const response = await fetch(endpoint);
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Evermark data fetched:', data);
            return data;
          } else {
            console.log(`⚠️ Endpoint ${endpoint} failed with status:`, response.status);
            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (fetchError) {
          console.log(`❌ Endpoint ${endpoint} error:`, fetchError);
          lastError = fetchError instanceof Error ? fetchError : new Error('Fetch failed');
        }
      }
      
      // If all endpoints fail, throw the last error
      throw lastError || new Error('All endpoints failed');
      
    } catch (err) {
      console.error('❌ Error fetching Evermark:', err);
      throw err;
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setIsLoading(true);
    if (id) {
      loadEvermark(id);
    }
  };

  const loadEvermark = async (evermarkId: string) => {
    try {
      const data = await fetchEvermark(evermarkId, retryCount + 1);
      setEvermark(data);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load Evermark';
      setError(errorMessage);
      console.error('Failed to load evermark:', err);
      
      // Create fallback data for development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Creating fallback data for development');
        setEvermark({
          id: evermarkId,
          title: `Evermark #${evermarkId} (Fallback)`,
          author: 'Unknown Author',
          description: 'This is fallback content for development. The actual Evermark could not be loaded.',
          creator: '0x0000000000000000000000000000000000000000',
          creationTime: Date.now() / 1000,
          image: '',
          sourceUrl: '',
          metadataURI: ''
        });
        setError(`Using fallback data (Original error: ${errorMessage})`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setError('No Evermark ID provided');
      setIsLoading(false);
      return;
    }

    loadEvermark(id);
  }, [id, retryCount]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-4">
            <button 
              onClick={() => navigate('/')}
              className="inline-flex items-center text-sm text-gray-600 hover:text-purple-600 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              Back to Home
            </button>
          </div>
          
          <div className="animate-pulse space-y-6">
            <div className="w-full h-48 md:h-64 lg:h-80 bg-gray-200 rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !evermark) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-4">
            <button 
              onClick={() => navigate('/')}
              className="inline-flex items-center text-sm text-gray-600 hover:text-purple-600 transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4 mr-1" />
              Back to Home
            </button>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <AlertCircleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              Error Loading Evermark
            </h2>
            <p className="text-gray-600 mb-4">{error}</p>
            
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Retry ({retryCount + 1})
              </button>
              
              <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-100 rounded text-left">
                <p><strong>Debug info:</strong></p>
                <p>ID: {id}</p>
                <p>URL: {window.location.href}</p>
                <p>Attempts: {retryCount + 1}</p>
                <p>Error: {error}</p>
                <p>Environment: {process.env.NODE_ENV}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!evermark) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <BookmarkIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h2 className="text-xl font-medium text-gray-900 mb-2">
              Evermark Not Found
            </h2>
            <p className="text-gray-600">
              This Evermark could not be found. It may have been removed or the ID is incorrect.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Navigation */}
        <div className="mb-6">
          <button 
            onClick={() => navigate('/')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-purple-600 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to Home
          </button>
        </div>

        {/* Error banner if using fallback data */}
        {error && evermark && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircleIcon className="w-5 h-5 text-yellow-600 mr-2" />
              <p className="text-yellow-800 text-sm">{error}</p>
              <button
                onClick={handleRetry}
                className="ml-auto text-yellow-600 hover:text-yellow-700 text-sm underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        
        {/* Main Content Card */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Hero Image Section */}
          {evermark.image && (
            <div className="w-full h-48 sm:h-64 md:h-80 bg-gray-100 relative overflow-hidden">
              <img
                src={evermark.image}
                alt={evermark.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.log('Image failed to load:', evermark.image);
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <h1 className="text-2xl md:text-3xl font-serif font-bold mb-2 drop-shadow-lg">
                  {evermark.title}
                </h1>
                <p className="text-sm md:text-base">by {evermark.author}</p>
              </div>
            </div>
          )}
          
          {/* Content Section */}
          <div className="p-6 md:p-8">
            {/* Title and meta info (if no image) */}
            {!evermark.image && (
              <div className="mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-3">
                      {evermark.title}
                    </h1>
                    <p className="text-gray-600">by {evermark.author}</p>
                  </div>
                  <div className="bg-purple-100 rounded-full p-3 ml-4">
                    <BookmarkIcon className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>
            )}
            
            {/* Description */}
            {evermark.description && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Description</h3>
                <div className="prose prose-sm max-w-none text-gray-700">
                  <p className="whitespace-pre-line leading-relaxed">
                    {evermark.description}
                  </p>
                </div>
              </div>
            )}
            
            {/* Metadata */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Evermark ID:</span>
                  <span className="font-mono font-medium">{evermark.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Creator:</span>
                  <span className="font-mono text-xs break-all">{evermark.creator}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{formatDate(evermark.creationTime)}</span>
                </div>
                {evermark.sourceUrl && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Source:</span>
                    <a 
                      href={evermark.sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:underline truncate max-w-xs"
                    >
                      View Original
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvermarkDetailPage;