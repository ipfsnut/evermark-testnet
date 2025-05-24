import React, { useState, useEffect } from 'react';
import { 
  TagIcon, 
  PlusIcon, 
  XIcon, 
  BookIcon, 
  LinkIcon,
  HashIcon,
  FileTextIcon,
  AlertCircleIcon
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Content Type
        </label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {(['Cast', 'DOI', 'ISBN', 'URL', 'Custom'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setContentType(type)}
              className={`flex items-center justify-center px-3 py-2 rounded-lg border transition-colors ${
                contentType === type
                  ? 'border-purple-500 bg-purple-50 text-purple-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              {contentTypeIcons[type]}
              <span className="ml-2 text-sm">{type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Type-Specific Fields */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
          {contentTypeIcons[contentType]}
          <span className="ml-2">{contentType} Details</span>
        </h4>
        
        {contentType === 'DOI' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">DOI</label>
              <input
                type="text"
                value={typeSpecificData.doi || ''}
                onChange={(e) => handleTypeSpecificChange('doi', e.target.value)}
                placeholder="10.1234/example"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Journal</label>
                <input
                  type="text"
                  value={typeSpecificData.journal || ''}
                  onChange={(e) => handleTypeSpecificChange('journal', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Publication Date</label>
                <input
                  type="date"
                  value={typeSpecificData.publicationDate || ''}
                  onChange={(e) => handleTypeSpecificChange('publicationDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Volume</label>
                <input
                  type="text"
                  value={typeSpecificData.volume || ''}
                  onChange={(e) => handleTypeSpecificChange('volume', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Issue</label>
                <input
                  type="text"
                  value={typeSpecificData.issue || ''}
                  onChange={(e) => handleTypeSpecificChange('issue', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Pages</label>
                <input
                  type="text"
                  value={typeSpecificData.pages || ''}
                  onChange={(e) => handleTypeSpecificChange('pages', e.target.value)}
                  placeholder="1-10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {contentType === 'ISBN' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">ISBN</label>
              <input
                type="text"
                value={typeSpecificData.isbn || ''}
                onChange={(e) => handleTypeSpecificChange('isbn', e.target.value)}
                placeholder="978-3-16-148410-0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Publisher</label>
                <input
                  type="text"
                  value={typeSpecificData.publisher || ''}
                  onChange={(e) => handleTypeSpecificChange('publisher', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Publication Date</label>
                <input
                  type="date"
                  value={typeSpecificData.publicationDate || ''}
                  onChange={(e) => handleTypeSpecificChange('publicationDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        )}

        {contentType === 'URL' && (
          <div>
            <label className="block text-sm text-gray-600 mb-1">URL</label>
            <input
              type="url"
              value={typeSpecificData.url || ''}
              onChange={(e) => handleTypeSpecificChange('url', e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        )}

        {contentType === 'Cast' && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 flex items-start">
              <AlertCircleIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
              Cast metadata will be automatically extracted from the Farcaster protocol
            </p>
          </div>
        )}

        {contentType === 'Custom' && (
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-700">
              Use custom fields below to add any metadata specific to your content
            </p>
          </div>
        )}
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        
        {/* Tag Input */}
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            placeholder="Add a tag..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Suggested Tags */}
        {suggestedTags[contentType].length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-600 mb-2">Suggested:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedTags[contentType].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => !tags.includes(tag) && setTags([...tags, tag])}
                  disabled={tags.includes(tag)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    tags.includes(tag)
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
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
                className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
              >
                <TagIcon className="h-3 w-3 mr-1" />
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-2 hover:text-purple-900"
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
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Custom Metadata Fields
          </label>
          <button
            type="button"
            onClick={handleAddCustomField}
            className="text-sm text-purple-600 hover:text-purple-700 flex items-center"
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => handleUpdateCustomField(index, { value: e.target.value })}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveCustomField(index)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {customFields.length === 0 && (
          <p className="text-sm text-gray-500 italic">
            No custom fields added. Click "Add Field" to include additional metadata.
          </p>
        )}
      </div>
    </div>
  );
};