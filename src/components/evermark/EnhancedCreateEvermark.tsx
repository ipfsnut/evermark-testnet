import React, { useState, useRef } from "react";
import { useProfile, useContractAuth } from "../../hooks/useProfile";
import { useEvermarkCreation, type EvermarkMetadata } from "../../hooks/useEvermarkCreation";
import { MetadataForm, type EnhancedMetadata } from "./MetadataForm";
import { 
  PlusIcon, 
  AlertCircleIcon, 
  CheckCircleIcon,
  UploadIcon,
  ImageIcon,
  XIcon,
  LoaderIcon,
  InfoIcon,
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import PageContainer from '../layout/PageContainer';
import { ContractRequired } from '../auth/AuthGuard';

export function EnhancedCreateEvermark() {
  const navigate = useNavigate();
  const profile = useProfile();
  const contractAuth = useContractAuth();
  const { createEvermark, isCreating, error, success } = useEvermarkCreation();
  
  // Enhanced metadata state
  const [enhancedMetadata, setEnhancedMetadata] = useState<EnhancedMetadata>({
    contentType: 'URL',
    tags: [],
    customFields: []
  });
  
  // Basic required fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  
  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  
  // Cast extraction state
  const [isExtractingCast, setIsExtractingCast] = useState(false);
  const [extractedCastData, setExtractedCastData] = useState<any>(null);
  
  // Add form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Auto-populate author if we have Farcaster info
  React.useEffect(() => {
    if (profile.farcasterUser && !enhancedMetadata.customFields.find(f => f.key === 'author')) {
      const authorName = profile.farcasterUser.displayName || profile.farcasterUser.username || '';
      if (authorName) {
        setEnhancedMetadata(prev => ({
          ...prev,
          customFields: [
            ...prev.customFields,
            { key: 'author', value: authorName }
          ]
        }));
      }
    }
  }, [profile.farcasterUser, enhancedMetadata.customFields]);
  
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setImageUploadError('Please select a valid image file');
      return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setImageUploadError('Image must be smaller than 10MB');
      return;
    }
    
    setSelectedImage(file);
    setImageUploadError(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };
  

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setImageUploadError(null);
  };
  
  // Cast extraction function using Pinata's Farcaster API
  const handleExtractCastMetadata = async () => {
    const castInput = enhancedMetadata.castUrl;
    if (!castInput) return;
    
    setIsExtractingCast(true);
    setImageUploadError(null);
    
    try {
      // Extract cast hash from farcaster.xyz URL or use direct hash
      let castHash = castInput.trim();
      
      // Handle different URL formats
      if (castInput.includes('farcaster.xyz') || castInput.includes('warpcast.com')) {
        // Extract hash from URL - both old and new formats
        const urlParts = castInput.split('/');
        castHash = urlParts[urlParts.length - 1];
        
        // Remove any query parameters or fragments
        castHash = castHash.split('?')[0].split('#')[0];
      }
      
      // Ensure hash starts with 0x
      if (!castHash.startsWith('0x')) {
        castHash = '0x' + castHash;
      }
      
      console.log('Extracting cast metadata for hash:', castHash);
      
      // Use Pinata's Farcaster API to fetch cast data
      const response = await fetch(`https://api.pinata.cloud/v3/farcaster/casts/${castHash}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch cast: ${response.status} ${response.statusText}`);
      }
      
      const castData = await response.json();
      console.log('Cast data retrieved:', castData);
      
      // Transform Pinata's response to our format
      const extractedData = {
        hash: castData.hash,
        author: castData.author?.username || 'unknown-user',
        authorDisplayName: castData.author?.display_name || castData.author?.username || 'Unknown User',
        authorFid: castData.author?.fid || 0,
        text: castData.text || '',
        timestamp: castData.timestamp || new Date().toISOString(),
        embeds: castData.embeds || [],
        mentions: castData.mentions || [],
        parentUrl: `https://farcaster.xyz/~/cast/${castHash}`,
        channel: castData.parent_url ? castData.parent_url.replace('https://farcaster.xyz/~/channel/', '') : null
      };
      
      setExtractedCastData(extractedData);
      
      // Auto-populate metadata based on extracted cast data
      setEnhancedMetadata(prev => ({
        ...prev,
        customFields: [
          ...prev.customFields.filter(f => !['author', 'castHash', 'castText', 'castTimestamp', 'authorFid', 'channel'].includes(f.key)),
          { key: 'author', value: extractedData.authorDisplayName },
          { key: 'castHash', value: extractedData.hash },
          { key: 'castText', value: extractedData.text },
          { key: 'castTimestamp', value: extractedData.timestamp },
          { key: 'authorFid', value: extractedData.authorFid.toString() },
          ...(extractedData.channel ? [{ key: 'channel', value: extractedData.channel }] : [])
        ]
      }));
      
      // Auto-populate title and description if they're empty
      if (!title) {
        const channelText = extractedData.channel ? ` in /${extractedData.channel}` : '';
        setTitle(`Cast by ${extractedData.authorDisplayName}${channelText}`);
      }
      if (!description) {
        const truncatedText = extractedData.text.length > 200 
          ? extractedData.text.substring(0, 200) + '...' 
          : extractedData.text;
        setDescription(truncatedText || 'Farcaster cast content');
      }
      
    } catch (error) {
      console.error('Failed to extract cast metadata:', error);
      setImageUploadError(`Failed to extract cast metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExtractingCast(false);
    }
  };

  // Generate title based on content type and metadata
  const generateTitle = (): string => {
    if (title.trim()) return title.trim();
    
    const { contentType } = enhancedMetadata;
    
    switch (contentType) {
      case 'DOI':
        return enhancedMetadata.journal ? 
          `Research Paper from ${enhancedMetadata.journal}` : 
          'Academic Research Paper';
          
      case 'ISBN':
        return enhancedMetadata.publisher ? 
          `Book from ${enhancedMetadata.publisher}` : 
          'Published Book';
          
      case 'URL':
        if (enhancedMetadata.url) {
          try {
            const domain = new URL(enhancedMetadata.url).hostname.replace('www.', '');
            return `Content from ${domain}`;
          } catch {
            return 'Web Content';
          }
        }
        return 'Web Content';
        
      case 'Cast':
        return 'Farcaster Cast';
        
      case 'Custom':
        return enhancedMetadata.customFields.find(f => f.key === 'title')?.value || 'Custom Evermark';
        
      default:
        return 'Untitled Evermark';
    }
  };

  // Generate description from metadata
  const generateDescription = (): string => {
    if (description.trim()) return description.trim();
    
    const { contentType } = enhancedMetadata;
    let autoDescription = '';
    
    switch (contentType) {
      case 'DOI':
        const parts = [];
        if (enhancedMetadata.journal) parts.push(`Published in ${enhancedMetadata.journal}`);
        if (enhancedMetadata.volume) parts.push(`Volume ${enhancedMetadata.volume}`);
        if (enhancedMetadata.issue) parts.push(`Issue ${enhancedMetadata.issue}`);
        if (enhancedMetadata.pages) parts.push(`Pages ${enhancedMetadata.pages}`);
        if (enhancedMetadata.publicationDate) parts.push(`Published ${enhancedMetadata.publicationDate}`);
        autoDescription = parts.join(' • ');
        break;
        
      case 'ISBN':
        const bookParts = [];
        if (enhancedMetadata.publisher) bookParts.push(`Published by ${enhancedMetadata.publisher}`);
        if (enhancedMetadata.publicationDate) bookParts.push(`Published ${enhancedMetadata.publicationDate}`);
        autoDescription = bookParts.join(' • ');
        break;
        
      case 'URL':
        autoDescription = enhancedMetadata.url ? `Web content from ${enhancedMetadata.url}` : 'Web content reference';
        break;
        
      case 'Cast':
        autoDescription = 'Content preserved from Farcaster social network';
        break;
        
      case 'Custom':
        const customDesc = enhancedMetadata.customFields.find(f => f.key === 'description')?.value;
        autoDescription = customDesc || 'Custom content preserved on blockchain';
        break;
    }
    
    // Add tags to description if present
    if (enhancedMetadata.tags.length > 0) {
      autoDescription += ` | Tags: ${enhancedMetadata.tags.join(', ')}`;
    }
    
    return autoDescription;
  };

  // Get source URL from metadata
  const getSourceUrl = (): string => {
    const { contentType } = enhancedMetadata;
    
    switch (contentType) {
      case 'DOI':
        return enhancedMetadata.doi ? `https://doi.org/${enhancedMetadata.doi}` : '';
      case 'ISBN':
        return enhancedMetadata.isbn ? `https://www.worldcat.org/isbn/${enhancedMetadata.isbn}` : '';
      case 'URL':
        return enhancedMetadata.url || '';
      default:
        return enhancedMetadata.customFields.find(f => f.key === 'sourceUrl')?.value || '';
    }
  };

  // Get author from metadata
  const getAuthor = (): string => {
    return enhancedMetadata.customFields.find(f => f.key === 'author')?.value || 
           profile.farcasterUser?.displayName || 
           profile.farcasterUser?.username || 
           'Unknown Author';
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent multiple submissions
    if (isSubmitting || isCreating) return;
    setIsSubmitting(true);
    
    try {
      const finalTitle = generateTitle();
      if (!finalTitle.trim()) {
        return;
      }
      
      const evermarkData: EvermarkMetadata = {
        title: finalTitle,
        description: generateDescription(),
        sourceUrl: getSourceUrl(),
        author: getAuthor(),
        imageFile: selectedImage,
      };
      
      console.log('Creating Evermark with enhanced metadata:', {
        basicData: evermarkData,
        enhancedMetadata
      });
      
      const result = await createEvermark(evermarkData);
      
      if (result.success) {
        // Navigate immediately after successful creation
        navigate("/my-evermarks");
      }
    } catch (error) {
      console.error("Evermark creation failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleAutoDetect = async () => {
    const sourceUrl = getSourceUrl();
    if (!sourceUrl) return;
    
    // This would be an actual implementation that scrapes metadata
    // For now, just simulate a delay
    setTimeout(() => {
      try {
        const url = new URL(sourceUrl);
        setTitle(`Content from ${url.hostname}`);
        setDescription(`Automatically detected content from ${sourceUrl}`);
      } catch {
        setTitle("Detected Content");
        setDescription(`Content from: ${sourceUrl}`);
      }
    }, 500);
  };

  // Get content type info for display
  const getContentTypeInfo = () => {
    const { contentType } = enhancedMetadata;
    const icons = {
      Cast: '💬',
      DOI: '📄',
      ISBN: '📚',
      URL: '🌐',
      Custom: '✨'
    };
    
    const descriptions = {
      Cast: 'Social media post from Farcaster',
      DOI: 'Academic research paper with DOI',
      ISBN: 'Published book with ISBN',
      URL: 'Web content from a URL',
      Custom: 'Custom content with flexible metadata'
    };
    
    return {
      icon: icons[contentType],
      description: descriptions[contentType]
    };
  };

  const contentTypeInfo = getContentTypeInfo();
  const previewTitle = generateTitle();
  const previewDescription = generateDescription();
  const previewSourceUrl = getSourceUrl();
  const previewAuthor = getAuthor();
  
  return (
    <PageContainer title="Create New Evermark">
      {/* Authentication-aware UI */}
      <ContractRequired fallback={
        <div className="text-center py-8">
          <PlusIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {profile.isInFarcaster ? "Link Wallet to Create" : "Connect to Create"}
          </h3>
          <p className="text-gray-600 mb-4">
            {profile.isInFarcaster 
              ? "Creating Evermarks requires blockchain interaction. Link a wallet to continue."
              : "Please connect your wallet to create an Evermark"
            }
          </p>
          
          {/* Show Farcaster user info if available */}
          {profile.isFarcasterAuthenticated && (
            <div className="mb-4 p-3 bg-purple-50 rounded-lg max-w-sm mx-auto">
              <div className="flex items-center justify-center space-x-2">
                {profile.avatar && (
                  <img src={profile.avatar} alt="Profile" className="w-6 h-6 rounded-full" />
                )}
                <span className="text-sm text-purple-700">
                  Authenticated as {profile.displayName}
                </span>
              </div>
            </div>
          )}
        </div>
      }>
        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircleIcon className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
            <div>
              <p className="text-red-700 font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
            <div>
              <p className="text-green-700 font-medium">Success!</p>
              <p className="text-green-600 text-sm">{success}</p>
              <p className="text-green-600 text-sm mt-1">
                Redirecting to your collection...
              </p>
            </div>
          </div>
        )}
        
        {/* Transaction processing indicator */}
        {(isCreating || isSubmitting) && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start">
            <LoaderIcon className="h-5 w-5 text-blue-600 mr-3 mt-0.5 animate-spin" />
            <div>
              <p className="text-blue-700 font-medium">Processing Transaction</p>
              <p className="text-blue-600 text-sm">
                Please confirm the transaction in your wallet...
              </p>
            </div>
          </div>
        )}
        
        {/* Auth status indicator for debugging */}
        {profile.isInFarcaster && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700">
                📱 Running in Farcaster • {profile.authMethod === 'both' ? '✅ Wallet linked' : '⚠️ Wallet needed for blockchain'}
              </span>
              {profile.primaryAddress && (
                <span className="text-blue-600 font-mono text-xs">
                  {profile.primaryAddress.slice(0, 6)}...{profile.primaryAddress.slice(-4)}
                </span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Cover Image Upload Section - Always at Top */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <ImageIcon className="h-5 w-5 mr-2" />
              Cover Image (Optional)
            </h3>
            
            {!imagePreview ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 mb-2">Click to upload a cover image</p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  <XIcon className="h-4 w-4" />
                </button>
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                  {selectedImage?.name}
                </div>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            
            {imageUploadError && (
              <p className="mt-2 text-sm text-red-600">{imageUploadError}</p>
            )}
            
            {isUploadingImage && (
              <div className="mt-2 flex items-center text-sm text-purple-600">
                <LoaderIcon className="h-4 w-4 mr-2 animate-spin" />
                Uploading image to IPFS...
              </div>
            )}
          </div>

          {/* Enhanced Metadata Form */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Content Details</h3>
            <MetadataForm 
              onMetadataChange={setEnhancedMetadata}
              initialMetadata={enhancedMetadata}
            />
          </div>

          {/* Optional Override Fields */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <InfoIcon className="h-5 w-5 mr-2" />
              Optional Overrides
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              These fields will override the auto-generated values from your metadata selections.
            </p>
            
            <div className="space-y-4">
              {/* Manual Title Override */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Title (leave blank to auto-generate)
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder={`Auto-generated: "${previewTitle}"`}
                />
              </div>
              
              {/* Manual Description Override */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Description (leave blank to auto-generate)
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  placeholder={`Auto-generated: "${previewDescription}"`}
                />
              </div>

              {/* Auto-detect button for URL content */}
              {enhancedMetadata.contentType === 'URL' && previewSourceUrl && (
                <button
                  type="button"
                  onClick={handleAutoDetect}
                  disabled={isCreating || isSubmitting}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Auto-Detect from URL
                </button>
              )}
            </div>
          </div>

          {/* Preview Section */}
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Preview</h3>
            
            <div className="bg-white rounded-lg p-4 border border-gray-300">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <span className="text-2xl mr-2">{contentTypeInfo.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">{previewTitle || 'Untitled'}</h4>
                    <p className="text-sm text-gray-600">{contentTypeInfo.description}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div><strong>Author:</strong> {previewAuthor}</div>
                {previewDescription && <div><strong>Description:</strong> {previewDescription}</div>}
                {previewSourceUrl && <div><strong>Source:</strong> {previewSourceUrl}</div>}
                {enhancedMetadata.tags.length > 0 && (
                  <div><strong>Tags:</strong> {enhancedMetadata.tags.join(', ')}</div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isCreating || isSubmitting || isUploadingImage || !contractAuth.canInteract}
            className="w-full flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating || isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating Evermark...
              </>
            ) : (
              <>
                <UploadIcon className="h-5 w-5 mr-2" />
                Create {enhancedMetadata.contentType} Evermark
              </>
            )}
          </button>
        </form>
        
        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">How it works:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Select content type:</strong> Choose what kind of content you're preserving</li>
            <li>• <strong>Fill metadata:</strong> Provide details specific to your content type</li>
            <li>• <strong>Add cover image:</strong> Make your Evermark visually appealing (optional)</li>
            <li>• <strong>Custom overrides:</strong> Manually adjust title/description if needed</li>
            <li>• <strong>Preview & create:</strong> Review and mint your Evermark to the blockchain</li>
          </ul>
        </div>
      </ContractRequired>
    </PageContainer>
  );
}