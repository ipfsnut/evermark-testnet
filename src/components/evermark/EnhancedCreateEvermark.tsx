import React, { useState, useRef } from "react";
import { useProfile } from "../../hooks/useProfile";
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
  WalletIcon,
  LinkIcon,
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import PageContainer from '../layout/PageContainer';
import { ContractRequired } from '../auth/AuthGuard';
import { WalletConnect } from '../ConnectButton';
import { useWalletConnection } from "../../providers/WalletProvider";

export function EnhancedCreateEvermark() {
  const navigate = useNavigate();
  const profile = useProfile();
  
  // ✅ NEW: Use unified wallet system
  const { canInteract, isConnected, walletType, isInFarcaster } = useWalletConnection();
  const needsWalletConnection = !canInteract;
  
  // ✅ UPDATED: Remove needsWalletConnection from useEvermarkCreation
  const { createEvermark, isCreating, error, success, validateFarcasterInput } = useEvermarkCreation();
  
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
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Auto-populate author if we have Farcaster info
  React.useEffect(() => {

    if (profile.farcasterUser) {
      const authorName = profile.farcasterUser.displayName || profile.farcasterUser.username || '';
      if (authorName) {







        setEnhancedMetadata(prev => {
          // Always update/add author field
          const otherFields = prev.customFields.filter(f => f.key !== 'author');
          return {
            ...prev,
            customFields: [
              ...otherFields,
              { key: 'author', value: authorName }
            ]
          };
        });
      }
    }

  }, [profile.farcasterUser]); // Remove the dependency on customFields
  
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
  
  // Generate title based on content type and metadata
  const generateTitle = (): string => {
    if (title.trim()) return title.trim();
    
    const { contentType } = enhancedMetadata;
    
    switch (contentType) {
      case 'Cast':
        // Check if we have a valid Farcaster input
        const castInput = enhancedMetadata.castUrl || enhancedMetadata.url || '';
        if (castInput) {
          const validation = validateFarcasterInput(castInput);
          if (validation.isValid) {
            return `Farcaster Cast (${validation.hash?.substring(0, 10)}...)`;
          }
        }
        return 'Farcaster Cast';
        
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
      case 'Cast':
        return enhancedMetadata.castUrl || '';
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
    // Check for cast data first
    const castAuthor = enhancedMetadata.customFields.find(f => f.key === 'author')?.value;
    if (castAuthor && castAuthor !== 'Unknown Author') {
      return castAuthor;
    }
    
    return profile.farcasterUser?.displayName || 
           profile.farcasterUser?.username || 
           'Unknown Author';
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
        // ✅ ADD: Include all the enhanced metadata
        customFields: enhancedMetadata.customFields,
        tags: enhancedMetadata.tags,
        contentType: enhancedMetadata.contentType,
        // Include type-specific fields
        ...(enhancedMetadata.contentType === 'DOI' && {
          doi: enhancedMetadata.doi,
          journal: enhancedMetadata.journal,
          volume: enhancedMetadata.volume,
          issue: enhancedMetadata.issue,
          pages: enhancedMetadata.pages,
          publicationDate: enhancedMetadata.publicationDate
        }),
        ...(enhancedMetadata.contentType === 'ISBN' && {
          isbn: enhancedMetadata.isbn,
          publisher: enhancedMetadata.publisher,
          publicationDate: enhancedMetadata.publicationDate
        }),
        ...(enhancedMetadata.contentType === 'Cast' && {
          castUrl: enhancedMetadata.castUrl
        }),
        ...(enhancedMetadata.contentType === 'URL' && {
          url: enhancedMetadata.url
        })
      };
      
      console.log('Creating Evermark with enhanced data:', {
        basicData: evermarkData,
        enhancedMetadata
      });
      
      const result = await createEvermark(evermarkData);
      
      if (result.success) {
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
    
    // For Farcaster URLs, show a preview of what will be detected
    if (validateFarcasterInput(sourceUrl).isValid) {
      setTitle("Farcaster Cast (will be auto-detected)");
      setDescription("Cast content will be automatically fetched during creation");
      return;
    }
    
    // For other URLs, do basic detection
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
      {/* ✅ UPDATED: Authentication-aware UI using unified wallet */}
      <ContractRequired fallback={
        <div className="text-center py-8">
          <PlusIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isInFarcaster ? "Link Wallet to Create" : "Connect to Create"}
          </h3>
          <p className="text-gray-600 mb-4">
            {isInFarcaster 
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
            <div className="flex-1">
              <p className="text-red-700 font-medium">Error</p>
              <p className="text-red-600 text-sm">{error}</p>
              
              {/* ✅ UPDATED: Enhanced wallet connection option using unified system */}
              {needsWalletConnection && isInFarcaster && (
                <div className="mt-3 p-3 bg-red-100 rounded-lg border border-red-200">
                  <div className="flex items-start">
                    <WalletIcon className="h-4 w-4 text-red-600 mr-2 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-red-700 text-sm font-medium mb-2">
                        {walletType === 'farcaster' 
                          ? "Farcaster wallet connection required."
                          : "Wallet connection required for blockchain transactions."
                        }
                      </p>
                      <p className="text-red-600 text-xs mb-3">
                        Connect a wallet for reliable blockchain transactions:
                      </p>
                      <WalletConnect />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
            <div>
              <p className="text-green-700 font-medium">Success!</p>
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          </div>
        )}

        {/* ✅ UPDATED: Environment status using unified wallet */}
        {isInFarcaster && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-blue-700 text-sm">
                📱 Running in Farcaster • {canInteract ? '✅ Wallet connected' : '⚠️ Using Frame SDK'}
              </span>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                {walletType}
              </span>
            </div>
          </div>
        )}

        {/* ✅ UPDATED: Wallet connection recommendation using unified system */}
        {isInFarcaster && !isConnected && (
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-start">
              <LinkIcon className="h-5 w-5 text-purple-600 mr-3 mt-0.5" />
              <div>
                <h4 className="text-purple-800 font-medium mb-2">💡 Recommended: Link a Wallet</h4>
                <p className="text-purple-700 text-sm mb-3">
                  For the best experience creating Evermarks, link a wallet to your Farcaster profile. 
                  This enables reliable blockchain transactions and gives you full control over your content.
                </p>
                <div className="space-y-2 text-xs text-purple-600">
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                    Guaranteed transaction delivery
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                    Better error handling and retry options
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
                    Full ownership of your Evermarks
                  </div>
                </div>
                <div className="mt-3">
                  <WalletConnect />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-serif font-bold text-gray-900">Create Evermark</h2>
                <div className="flex items-center text-sm text-gray-500">
                  <span className="mr-2">{contentTypeInfo.icon}</span>
                  <span>{contentTypeInfo.description}</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Enhanced Metadata Form */}
                <MetadataForm 
                  onMetadataChange={setEnhancedMetadata}
                  initialMetadata={enhancedMetadata}
                />

                {/* Basic Fields */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h3 className="font-medium text-gray-900">Content Details</h3>
                  
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                      Title (Optional)
                    </label>
                    <input
                      type="text"
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Leave blank for auto-generated title"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      If left blank, title will be generated from content type and metadata
                    </p>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Leave blank for auto-generated description"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      If left blank, description will be generated from metadata
                    </p>
                  </div>

                  {/* Auto-detect button */}
                  {previewSourceUrl && (
                    <button
                      type="button"
                      onClick={handleAutoDetect}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      🔍 Auto-detect content details
                    </button>
                  )}
                </div>

                {/* Image Upload */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h3 className="font-medium text-gray-900">Cover Image (Optional)</h3>
                  
                  {!selectedImage ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                      <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-600 mb-2">Add a cover image to your Evermark</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                      >
                        {isUploadingImage ? (
                          <>
                            <LoaderIcon className="animate-spin h-4 w-4 mr-2" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <UploadIcon className="h-4 w-4 mr-2" />
                            Choose Image
                          </>
                        )}
                      </button>
                      <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF up to 10MB</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={imagePreview!}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {imageUploadError && (
                    <p className="text-red-600 text-sm">{imageUploadError}</p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={isSubmitting || isCreating || !canInteract}
                    className="w-full flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting || isCreating ? (
                      <>
                        <LoaderIcon className="animate-spin h-5 w-5 mr-2" />
                        {isCreating ? "Creating Evermark..." : "Processing..."}
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Create Evermark
                      </>
                    )}
                  </button>

                  {/* ✅ UPDATED: Connection status using unified system */}
                  {!canInteract && (
                    <p className="text-center text-sm text-gray-500 mt-2">
                      {isInFarcaster 
                        ? "Link a wallet to create Evermarks"
                        : "Connect your wallet to continue"
                      }
                    </p>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Preview</h3>
              
              <div className="space-y-4">
                {/* Preview Image */}
                {imagePreview && (
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Preview Content */}
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-gray-900 text-lg">
                      {previewTitle || "Untitled Evermark"}
                    </h4>
                    <p className="text-sm text-gray-500">by {previewAuthor}</p>
                  </div>

                  {previewDescription && (
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {previewDescription}
                    </p>
                  )}

                  {previewSourceUrl && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Source:</p>
                      <a
                        href={previewSourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:text-purple-700 text-sm break-all"
                      >
                        {previewSourceUrl}
                      </a>
                    </div>
                  )}

                  {/* Tags Preview */}
                  {enhancedMetadata.tags.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs text-gray-500 mb-2">Tags:</p>
                      <div className="flex flex-wrap gap-1">
                        {enhancedMetadata.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-block bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Content Type Info */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Content Type:</span>
                  <span className="text-gray-900 font-medium">
                    {contentTypeInfo.icon} {enhancedMetadata.contentType}
                  </span>
                </div>
              </div>

              {/* ✅ UPDATED: Wallet info using unified system */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Wallet:</span>
                    <span className={canInteract ? "text-green-600" : "text-red-600"}>
                      {canInteract ? "✅ Connected" : "❌ Not connected"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Environment:</span>
                    <span>{isInFarcaster ? "📱 Farcaster" : "🖥️ Desktop"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Wallet Type:</span>
                    <span className="capitalize">{walletType}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-start">
                <InfoIcon className="h-5 w-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <h4 className="font-medium text-blue-900 mb-2">Creating Evermarks</h4>
                  <div className="text-blue-800 space-y-1">
                    <p>• Choose your content type and fill in the relevant metadata</p>
                    <p>• Title and description will be auto-generated if left blank</p>
                    <p>• Add tags to help others discover your content</p>
                    <p>• Upload an optional cover image to make your Evermark stand out</p>
                    {isInFarcaster && (
                      <p>• For best results, link a wallet to your Farcaster profile</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ContractRequired>
    </PageContainer>
  );
}
