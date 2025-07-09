import React, { useState, useEffect } from 'react';
import { 
  TagIcon, 
  PlusIcon, 
  XIcon, 
  BookIcon, 
  LinkIcon,
  HashIcon,
  FileTextIcon,
} from 'lucide-react';

export interface MetadataField {
  key: string;
  value: string;
}

export interface EnhancedMetadata {
  contentType: 'Cast' | 'DOI' | 'ISBN' | 'URL' | 'Custom';
  tags: string[];
  customFields: MetadataField[];
  // Type-specific fields
  doi?: string;
  isbn?: string;
  url?: string;
  castUrl?: string;
  publisher?: string;
  publicationDate?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
}

interface MetadataFormProps {
  onMetadataChange: (metadata: EnhancedMetadata) => void;
  initialMetadata?: Partial<EnhancedMetadata>;
}

export const MetadataForm: React.FC<MetadataFormProps> = ({ 
  onMetadataChange, 
  initialMetadata 
}) => {
  const [contentType, setContentType] = useState<EnhancedMetadata['contentType']>(
    initialMetadata?.contentType || 'URL'
  );
  const [tags, setTags] = useState<string[]>(initialMetadata?.tags || []);
  const [customFields, setCustomFields] = useState<MetadataField[]>(
    initialMetadata?.customFields || []
  );
  const [tagInput, setTagInput] = useState('');
  const [typeSpecificData, setTypeSpecificData] = useState<Partial<EnhancedMetadata>>({
    doi: initialMetadata?.doi || '',
    isbn: initialMetadata?.isbn || '',
    url: initialMetadata?.url || '',
    castUrl: initialMetadata?.castUrl || '',
    publisher: initialMetadata?.publisher || '',
    publicationDate: initialMetadata?.publicationDate || '',
    journal: initialMetadata?.journal || '',
    volume: initialMetadata?.volume || '',
    issue: initialMetadata?.issue || '',
    pages: initialMetadata?.pages || '',
  });

  // Suggested tags based on content type
  const suggestedTags: Record<EnhancedMetadata['contentType'], string[]> = {
    Cast: ['social', 'farcaster', 'thread', 'discussion'],
    DOI: ['research', 'academic', 'peer-reviewed', 'scientific'],
    ISBN: ['book', 'literature', 'reference', 'educational'],
    URL: ['article', 'blog', 'news', 'tutorial'],
    Custom: ['important', 'archive', 'reference', 'collection']
  };

  // Update parent component whenever metadata changes
  useEffect(() => {
    const metadata: EnhancedMetadata = {
      contentType,
      tags,
      customFields,
      ...typeSpecificData
    };
    onMetadataChange(metadata);
  }, [contentType, tags, customFields, typeSpecificData, onMetadataChange]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleAddCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }]);
  };

  const handleUpdateCustomField = (index: number, field: Partial<MetadataField>) => {
    const updated = [...customFields];
    updated[index] = { ...updated[index], ...field };
    setCustomFields(updated);
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleTypeSpecificChange = (field: string, value: string) => {
    setTypeSpecificData(prev => ({ ...prev, [field]: value }));
  };

  const contentTypeIcons = {
    Cast: <HashIcon className="h-4 w-4" />,
    DOI: <FileTextIcon className="h-4 w-4" />,
    ISBN: <BookIcon className="h-4 w-4" />,
    URL: <LinkIcon className="h-4 w-4" />,
    Custom: <PlusIcon className="h-4 w-4" />
  };

  return (
    <div className="space-y-6">
      {/* Content Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Content Type
        </label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {(['Cast', 'DOI', 'ISBN', 'URL', 'Custom'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setContentType(type)}
              className={`flex items-center justify-center px-3 py-3 rounded-lg border transition-all duration-200 ${
                contentType === type
                  ? 'border-cyan-400 bg-cyan-900/30 text-cyan-300 shadow-lg shadow-cyan-500/20'
                  : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
              }`}
            >
              {contentTypeIcons[type]}
              <span className="ml-2 text-sm font-medium">{type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Type-Specific Fields */}
      <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4">
        <h4 className="text-sm font-medium text-cyan-400 mb-4 flex items-center">
          {contentTypeIcons[contentType]}
          <span className="ml-2">{contentType} Details</span>
        </h4>
        
        {contentType === 'DOI' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">DOI</label>
              <input
                type="text"
                value={typeSpecificData.doi || ''}
                onChange={(e) => handleTypeSpecificChange('doi', e.target.value)}
                placeholder="10.1234/example"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Journal</label>
                <input
                  type="text"
                  value={typeSpecificData.journal || ''}
                  onChange={(e) => handleTypeSpecificChange('journal', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Publication Date</label>
                <input
                  type="date"
                  value={typeSpecificData.publicationDate || ''}
                  onChange={(e) => handleTypeSpecificChange('publicationDate', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Volume</label>
                <input
                  type="text"
                  value={typeSpecificData.volume || ''}
                  onChange={(e) => handleTypeSpecificChange('volume', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Issue</label>
                <input
                  type="text"
                  value={typeSpecificData.issue || ''}
                  onChange={(e) => handleTypeSpecificChange('issue', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Pages</label>
                <input
                  type="text"
                  value={typeSpecificData.pages || ''}
                  onChange={(e) => handleTypeSpecificChange('pages', e.target.value)}
                  placeholder="1-10"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400"
                />
              </div>
            </div>
          </div>
        )}

        {contentType === 'ISBN' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">ISBN</label>
              <input
                type="text"
                value={typeSpecificData.isbn || ''}
                onChange={(e) => handleTypeSpecificChange('isbn', e.target.value)}
                placeholder="978-3-16-148410-0"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Publisher</label>
                <input
                  type="text"
                  value={typeSpecificData.publisher || ''}
                  onChange={(e) => handleTypeSpecificChange('publisher', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Publication Date</label>
                <input
                  type="date"
                  value={typeSpecificData.publicationDate || ''}
                  onChange={(e) => handleTypeSpecificChange('publicationDate', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white"
                />
              </div>
            </div>
          </div>
        )}

        {contentType === 'URL' && (
          <div>
            <label className="block text-sm text-gray-300 mb-2">URL</label>
            <input
              type="url"
              value={typeSpecificData.url || ''}
              onChange={(e) => handleTypeSpecificChange('url', e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400"
            />
          </div>
        )}

        {contentType === 'Cast' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Cast URL or Hash</label>
              <input
                type="text"
                value={typeSpecificData.castUrl || ''}
                onChange={(e) => handleTypeSpecificChange('castUrl', e.target.value)}
                placeholder="https://warpcast.com/username/0x1234... or 0x1234..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400"
              />
              <p className="text-xs text-gray-500 mt-2">
                Enter a Warpcast URL or cast hash to extract metadata automatically
              </p>
            </div>
          </div>
        )}

        {contentType === 'Custom' && (
          <div className="p-4 bg-purple-900/30 border border-purple-500/30 rounded-lg">
            <p className="text-sm text-purple-300">
              Use custom fields below to add any metadata specific to your content
            </p>
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Tags
        </label>
        
        {/* Tag Input */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            placeholder="Add a tag..."
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-lg hover:from-purple-400 hover:to-purple-600 transition-colors shadow-lg shadow-purple-500/30"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Suggested Tags */}
        {suggestedTags[contentType].length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Suggested:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedTags[contentType].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => !tags.includes(tag) && setTags([...tags, tag])}
                  disabled={tags.includes(tag)}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    tags.includes(tag)
                      ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-900/30 text-purple-300 border border-purple-500/30 hover:bg-purple-800/30'
                  }`}
                >
                  +{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center px-3 py-1 bg-cyan-900/30 text-cyan-300 rounded-full text-sm border border-cyan-500/30"
              >
                <TagIcon className="h-3 w-3 mr-1" />
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-2 hover:text-cyan-100 transition-colors"
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Custom Fields */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-300">
            Custom Metadata Fields
          </label>
          <button
            type="button"
            onClick={handleAddCustomField}
            className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center transition-colors"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Field
          </button>
        </div>

        {customFields.length > 0 && (
          <div className="space-y-3">
            {customFields.map((field, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={field.key}
                  onChange={(e) => handleUpdateCustomField(index, { key: e.target.value })}
                  placeholder="Field name"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400"
                />
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => handleUpdateCustomField(index, { value: e.target.value })}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveCustomField(index)}
                  className="px-3 py-2 text-red-400 hover:bg-red-900/30 hover:text-red-300 rounded-lg transition-colors"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {customFields.length === 0 && (
          <p className="text-sm text-gray-500 italic bg-gray-800/30 p-3 rounded-lg border border-gray-700">
            No custom fields added. Click "Add Field" to include additional metadata.
          </p>
        )}
      </div>
    </div>
  );
};