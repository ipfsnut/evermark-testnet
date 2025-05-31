import React, { useState, useEffect } from 'react';
import { ExternalLinkIcon, FileTextIcon } from 'lucide-react';
import { useFarcasterUser } from '../../lib/farcaster';

export const MarkdownViewer: React.FC<{ 
  markdownPath: string; 
  title: string; 
}> = ({ markdownPath, title }) => {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isInFarcaster } = useFarcasterUser();

  useEffect(() => {
    const fetchMarkdown = async () => {
      try {
        const response = await fetch(markdownPath);
        if (!response.ok) {
          throw new Error(`Failed to fetch markdown: ${response.statusText}`);
        }
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load content');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMarkdown();
  }, [markdownPath]);

  // Simple markdown to HTML converter with better text wrapping
  const parseMarkdown = (markdown: string): string => {
    return markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-gray-900 mt-8 mb-4">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-6">$1</h1>')
      // Bold and italic
      .replace(/\*\*(.*)\*\*/gim, '<strong class="font-semibold">$1</strong>')
      .replace(/\*(.*)\*/gim, '<em class="italic">$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-purple-600 hover:text-purple-800 underline">$1</a>')
      // Code blocks
      .replace(/([^`]+)/gim, '<pre class="bg-gray-100 p-3 rounded-lg overflow-x-auto my-4"><code class="text-sm whitespace-pre-wrap">$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/gim, '<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono">$1</code>')
      // Paragraphs
      .replace(/\n\n/gim, '</p><p class="mb-4 leading-relaxed">')
      // Line breaks
      .replace(/\n/gim, '<br>');
  };

  if (isLoading) {
    return (
      <div className={`${isInFarcaster ? 'max-w-full px-2' : 'max-w-4xl'} mx-auto`}>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${isInFarcaster ? 'max-w-full px-2' : 'max-w-4xl'} mx-auto`}>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="text-center py-8">
            <FileTextIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Content</h3>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${isInFarcaster ? 'max-w-full px-2' : 'max-w-4xl'} mx-auto`}>
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 lg:p-8">
        <div className="flex items-start justify-between mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900 flex-1">
            {title}
          </h1>
          <a
            href={markdownPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 flex-shrink-0"
          >
            <ExternalLinkIcon className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">View Raw</span>
          </a>
        </div>
        
        <div 
          className="prose prose-sm sm:prose-lg max-w-none text-gray-800"
          style={{ 
            wordWrap: 'normal',
            overflowWrap: 'break-word',
            hyphens: 'auto'
          }}
          dangerouslySetInnerHTML={{ 
            __html: `<div class="space-y-4 leading-relaxed">${parseMarkdown(content)}</div>` 
          }}
        />
      </div>
    </div>
  );
};