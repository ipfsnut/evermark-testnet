// Minimal EvermarkDetail Page - no wallet dependencies
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  UserIcon, 
  CalendarIcon, 
  ExternalLinkIcon, 
  ArrowLeftIcon, 
  ShieldIcon, 
  EyeIcon,
  TagIcon
} from 'lucide-react';
import { useViewTracking, formatViewCount } from '../hooks/useViewTracking';
import { EvermarkMetaTags } from '../components/meta/EvermarkMetaTags';
import { cn, textSizes } from '../utils/responsive';

interface EvermarkDetailProps {
  id?: string;
}

interface EnhancedMetadata {
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
  farcaster_data?: {
    content?: string;
    author?: {
      username?: string;
      display_name?: string;
      pfp_url?: string;
    };
    cast?: {
      hash?: string;
      parent_hash?: string;
      thread_hash?: string;
    };
    channel?: {
      id?: string;
      name?: string;
      image_url?: string;
    };
    url?: string;
    timestamp?: string;
    embeds?: Array<{
      url?: string;
      metadata?: {
        content_type?: string;
        content_length?: number;
        image?: {
          url?: string;
          width?: number;
          height?: number;
        };
      };
    }>;
  };
  content?: string;
  author?: string;
  timestamp?: string;
  channel?: string;
  cast_hash?: string;
  parent_hash?: string;
  thread_hash?: string;
  url?: string;
  embeds?: Array<{
    url?: string;
    metadata?: {
      content_type?: string;
      content_length?: number;
      image?: {
        url?: string;
        width?: number;
        height?: number;
      };
    };
  }>;
}

interface EvermarkData {
  id: string;
  name: string;
  description: string;
  content: string;
  image: string;
  external_url: string;
  author: string;
  timestamp: string;
  tx_hash: string;
  block_number: number;
  metadata: EnhancedMetadata;
  evermark_type: string;
  source_platform: string;
  voting_power: number;
  view_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// Minimal hook for fetching Evermark data without wallet dependencies
function useEvermarkDetailMinimal(id?: string) {
  const [data, setData] = useState<EvermarkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchEvermark = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/evermarks/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch Evermark');
        }
        const evermark = await response.json();
        setData(evermark);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchEvermark();
  }, [id]);

  return { data, loading, error };
}

const EvermarkDetailPage: React.FC<EvermarkDetailProps> = ({ id: propId }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const id = propId || paramId;
  
  const { data: evermark, loading, error } = useEvermarkDetailMinimal(id);
  const { trackView } = useViewTracking(id || '');

  useEffect(() => {
    if (evermark && id) {
      trackView();
    }
  }, [evermark, id]); // Remove trackView from dependencies to prevent infinite loop

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !evermark) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center py-12">
          <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Evermark</div>
          <p className="text-gray-600">
            {error || 'Evermark not found'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <EvermarkMetaTags evermark={evermark as any} />
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => window.history.back()}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon size={20} className="mr-2" />
            Back
          </button>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-gray-500">
              <EyeIcon size={16} className="mr-1" />
              <span className="text-sm">{formatViewCount(evermark.view_count)}</span>
            </div>
            <div className="flex items-center text-gray-500">
              <ShieldIcon size={16} className="mr-1" />
              <span className="text-sm">Verified</span>
            </div>
          </div>
        </div>
        
        <h1 className={cn("font-bold text-gray-900 mb-2", textSizes.responsive["xl-2xl-3xl"])}>
          {evermark.name}
        </h1>
        
        <p className={cn("text-gray-600 mb-4", textSizes.responsive["base-lg-xl"])}>
          {evermark.description}
        </p>
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center">
            <UserIcon size={16} className="mr-1" />
            <span>{evermark.author}</span>
          </div>
          <div className="flex items-center">
            <CalendarIcon size={16} className="mr-1" />
            <span>{new Date(evermark.timestamp).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center">
            <TagIcon size={16} className="mr-1" />
            <span className="capitalize">{evermark.evermark_type}</span>
          </div>
        </div>
      </div>

      {/* Image */}
      {evermark.image && (
        <div className="mb-6">
          <img
            src={evermark.image}
            alt={evermark.name}
            className="w-full max-w-2xl mx-auto rounded-lg shadow-lg"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h3 className={cn("font-semibold mb-3", textSizes.responsive["lg-xl-2xl"])}>Content</h3>
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap">{evermark.content}</p>
        </div>
      </div>

      {/* Farcaster Data */}
      {evermark.metadata?.farcaster_data && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
          <h3 className={cn("font-semibold mb-3 text-purple-900", textSizes.responsive["lg-xl-2xl"])}>
            Farcaster Cast Data
          </h3>
          <div className="space-y-3">
            {evermark.metadata.farcaster_data.author && (
              <div className="flex items-center space-x-3">
                {evermark.metadata.farcaster_data.author.pfp_url && (
                  <img
                    src={evermark.metadata.farcaster_data.author.pfp_url}
                    alt="Author"
                    className="w-8 h-8 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium text-purple-900">
                    {evermark.metadata.farcaster_data.author.display_name || evermark.metadata.farcaster_data.author.username}
                  </p>
                  <p className="text-sm text-purple-700">
                    @{evermark.metadata.farcaster_data.author.username}
                  </p>
                </div>
              </div>
            )}
            {evermark.metadata.farcaster_data.content && (
              <div className="bg-white rounded p-3">
                <p className="text-gray-800">{evermark.metadata.farcaster_data.content}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* External URL */}
      {evermark.external_url && (
        <div className="text-center">
          <a
            href={evermark.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <ExternalLinkIcon size={16} className="mr-2" />
            View Original
          </a>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center">
        <p className="text-sm text-gray-500">
          Visit <a href="https://evermarks.net" className="text-purple-600 hover:underline">evermarks.net</a> to create your own Evermarks
        </p>
      </div>
    </div>
  );
};

export default EvermarkDetailPage;
