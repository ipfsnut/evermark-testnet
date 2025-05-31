import React, { useState, useEffect } from 'react';
import { FileTextIcon, ExternalLinkIcon } from 'lucide-react';

interface MarkdownViewerProps {
  markdownPath: string;
  title?: string;
}

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ 
  markdownPath, 
  title = "Documentation" 
}) => {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMarkdown = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(markdownPath);
        if (!response.ok) {
          throw new Error(`Failed to load documentation: ${response.statusText}`);
        }
        const text = await response.text();
        setContent(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load documentation');
      } finally {
        setIsLoading(false);
      }
    };

    loadMarkdown();
  }, [markdownPath]);

  // Simple markdown to HTML converter (basic implementation)
  const parseMarkdown = (markdown: string): string => {
    return markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-gray-900 mt-6 mb-3 break-words">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold text-gray-900 mt-8 mb-4 break-words">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mt-8 mb-6 break-words">$1</h1>')
      // Bold and italic
      .replace(/\*\*(.*)\*\*/gim, '<strong class="font-semibold break-words">$1</strong>')
      .replace(/\*(.*)\*/gim, '<em class="italic break-words">$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-purple-600 hover:text-purple-800 underline break-words">$1</a>')
      // Code blocks
      .replace(/([^`]+)/gim, '<pre class="bg-gray-100 p-4 rounded-lg overflow-x-auto my-4 whitespace-pre-wrap break-words"><code class="text-sm break-all">$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/gim, '<code class="bg-gray-100 px-2 py-1 rounded text-sm font-mono break-words">$1</code>')
      // Paragraphs
      .replace(/\n\n/gim, '</p><p class="mb-4 break-words leading-relaxed">')
      // Line breaks
      .replace(/\n/gim, '<br>');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-3 text-gray-600">Loading documentation...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <FileTextIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Documentation Error</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-serif font-bold text-gray-900 break-words">{title}</h1>
          <a
            href={markdownPath}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 flex-shrink-0"
          >
            <ExternalLinkIcon className="h-4 w-4 mr-1" />
            View Raw
          </a>
        </div>
        
        <div 
          className="prose prose-lg max-w-none overflow-hidden"
          style={{ wordWrap: 'break-word', overflowWrap: 'break-word' }}
          dangerouslySetInnerHTML={{ 
            __html: `<div class="space-y-4 break-words leading-relaxed">${parseMarkdown(content)}</div>` 
          }}
        />
      </div>
    </div>
  );
};