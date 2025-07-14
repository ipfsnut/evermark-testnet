import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface EvermarkData {
  id: string;
  name: string;
  description: string;
  content: string;
  image: string;
  author: string;
  timestamp: string;
  view_count: number;
}

export default function EvermarkDetailPageSimple() {
  const { id } = useParams<{ id: string }>();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Evermark</div>
            <p className="text-gray-600">{error || 'Evermark not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => window.history.back()}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{data.name}</h1>
        <p className="text-gray-600 mb-4">{data.description}</p>
        
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
          <span>By {data.author}</span>
          <span>•</span>
          <span>{new Date(data.timestamp).toLocaleDateString()}</span>
          <span>•</span>
          <span>{data.view_count} views</span>
        </div>

        {data.image && (
          <div className="mb-6">
            <img
              src={data.image}
              alt={data.name}
              className="w-full max-w-lg rounded-lg shadow-lg"
            />
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="font-semibold mb-3">Content</h3>
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap">{data.content}</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            Visit <a href="https://evermarks.net" className="text-purple-600 hover:underline">evermarks.net</a> to create your own Evermarks
          </p>
        </div>
      </div>
    </div>
  );
}
