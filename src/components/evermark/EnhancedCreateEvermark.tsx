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
  ZapIcon,
  EyeIcon,
  HelpCircleIcon
} from 'lucide-react';
import { useNavigate } from "react-router-dom";
import { ContractRequired } from '../auth/AuthGuard';
import { WalletConnect } from '../ConnectButton';
import { useWalletConnection } from "../../providers/WalletProvider";
import { cn, useIsMobile } from '../../utils/responsive';

// Help Modal Component
const HelpModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 border border-cyan-500/50 rounded-lg shadow-2xl shadow-cyan-500/20 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h3 className="text-xl font-bold text-cyan-400">Creating Evermarks</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-green-400">📚 Content Types</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                <strong className="text-purple-400">Cast:</strong> Preserve Farcaster posts permanently
              </div>
              <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                <strong className="text-blue-400">URL:</strong> Reference any web content
              </div>
              <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                <strong className="text-yellow-400">DOI:</strong> Academic papers and research
              </div>
              <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                <strong className="text-green-400">ISBN:</strong> Books and publications
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-green-400">⚡ Smart Features</h4>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start">
                <span className="w-2 h-2 bg-cyan-400 rounded-full mr-2 mt-2"></span>
                Auto-generated titles and descriptions if left blank
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-cyan-400 rounded-full mr-2 mt-2"></span>
                Tags help others discover your content
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-cyan-400 rounded-full mr-2 mt-2"></span>
                Cover images make your Evermark stand out
              </li>
              <li className="flex items-start">
                <span className="w-2 h-2 bg-cyan-400 rounded-full mr-2 mt-2"></span>
                All content is stored permanently on IPFS
              </li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-green-400">🚀 Getting Started</h4>
            <ol className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start">
                <span className="w-5 h-5 bg-green-600 text-black rounded-full flex items-center justify-center text-xs font-bold mr-2 mt-0.5">1</span>
                Choose your content type and fill in the source information
              </li>
              <li className="flex items-start">
                <span className="w-5 h-5 bg-green-600 text-black rounded-full flex items-center justify-center text-xs font-bold mr-2 mt-0.5">2</span>
                Add tags and custom metadata to improve discoverability
              </li>
              <li className="flex items-start">
                <span className="w-5 h-5 bg-green-600 text-black rounded-full flex items-center justify-center text-xs font-bold mr-2 mt-0.5">3</span>
                Upload a cover image (optional but recommended)
              </li>
              <li className="flex items-start">
                <span className="w-5 h-5 bg-green-600 text-black rounded-full flex items-center justify-center text-xs font-bold mr-2 mt-0.5">4</span>
                Preview and create your permanent Evermark!
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export function EnhancedCreateEvermark() {
  const navigate = useNavigate();
  const profile = useProfile();
  const isMobile = useIsMobile();
  
  // Help modal state
  const [showHelpModal, setShowHelpModal] = useState(false);
  
  // ✅ Use unified wallet system
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
  }, [profile.farcasterUser]);
  
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
    <div className="min-h-screen bg-black text-white">
      {/* Cyber Header */}
      <div className="bg-gradient-to-r from-gray-900 via-black to-gray-900 border-b border-green-400/30">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-6">
            <div className="flex justify-center items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/50">
                <PlusIcon className="h-7 w-7 text-black" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-green-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent">
                CREATE EVERMARK
              </h1>
              <button
                onClick={() => setShowHelpModal(true)}
                className="w-8 h-8 bg-gray-800/50 border border-cyan-400/50 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors group"
                title="Get Help"
              >
                <HelpCircleIcon className="h-4 w-4 text-cyan-400 group-hover:text-cyan-300" />
              </button>
            </div>
            
            <p className="text-gray-300 max-w-3xl mx-auto text-lg">
              Transform any content into a permanent reference. Stored forever on <span className="text-green-400 font-bold">IPFS</span> and <span className="text-purple-400 font-bold">Base blockchain</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* ✅ UPDATED: Authentication-aware UI using unified wallet */}
        <ContractRequired fallback={
          <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-12 text-center">
            <PlusIcon className="mx-auto h-16 w-16 text-gray-500 mb-6" />
            <h3 className="text-2xl font-medium text-white mb-4">
              {isInFarcaster ? "Link Wallet to Create" : "Connect to Create"}
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {isInFarcaster 
                ? "Creating Evermarks requires blockchain interaction. Link a wallet to continue."
                : "Please connect your wallet to create an Evermark"
              }
            </p>
            
            {/* Show Farcaster user info if available */}
            {profile.isFarcasterAuthenticated && (
              <div className="mb-6 p-4 bg-purple-900/30 border border-purple-500/30 rounded-lg max-w-sm mx-auto">
                <div className="flex items-center justify-center space-x-3">
                  {profile.avatar && (
                    <img src={profile.avatar} alt="Profile" className="w-8 h-8 rounded-full" />
                  )}
                  <span className="text-purple-300">
                    Authenticated as {profile.displayName}
                  </span>
                </div>
              </div>
            )}
            
            <WalletConnect />
          </div>
        }>
          {/* Status Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-500/50 rounded-lg flex items-start">
              <AlertCircleIcon className="h-5 w-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-red-300 font-medium">Error</p>
                <p className="text-red-400 text-sm">{error}</p>
                
                {/* ✅ UPDATED: Enhanced wallet connection option using unified system */}
                {needsWalletConnection && isInFarcaster && (
                  <div className="mt-3 p-3 bg-red-800/30 rounded-lg border border-red-500/30">
                    <div className="flex items-start">
                      <WalletIcon className="h-4 w-4 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-red-300 text-sm font-medium mb-2">
                          {walletType === 'farcaster' 
                            ? "Farcaster wallet connection required."
                            : "Wallet connection required for blockchain transactions."
                          }
                        </p>
                        <p className="text-red-400 text-xs mb-3">
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
            <div className="mb-6 p-4 bg-green-900/30 border border-green-500/50 rounded-lg flex items-start">
              <CheckCircleIcon className="h-5 w-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-green-300 font-medium">Success!</p>
                <p className="text-green-400 text-sm">{success}</p>
              </div>
            </div>
          )}

          {/* ✅ UPDATED: Environment status using unified wallet */}
          {isInFarcaster && (
            <div className="mb-6 p-4 bg-blue-900/30 border border-blue-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-blue-300 text-sm">
                  📱 Running in Farcaster • {canInteract ? '✅ Wallet connected' : '⚠️ Using Frame SDK'}
                </span>
                <span className="text-xs text-blue-400 bg-blue-800/50 px-2 py-1 rounded">
                  {walletType}
                </span>
              </div>
            </div>
          )}

          {/* ✅ UPDATED: Wallet connection recommendation using unified system */}
          {isInFarcaster && !isConnected && (
            <div className="mb-6 p-4 bg-purple-900/30 border border-purple-500/30 rounded-lg">
              <div className="flex items-start">
                <LinkIcon className="h-5 w-5 text-purple-400 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-purple-300 font-medium mb-2">💡 Recommended: Link a Wallet</h4>
                  <p className="text-purple-400 text-sm mb-3">
                    For the best experience creating Evermarks, link a wallet to your Farcaster profile. 
                    This enables reliable blockchain transactions and gives you full control over your content.
                  </p>
                  <div className="space-y-2 text-xs text-purple-400">
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

          <div className={cn(
            "grid gap-8",
            isMobile ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
          )}>
            {/* Left Column - Form */}
            <div className="space-y-6">
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg shadow-gray-900/50 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">Create Evermark</h2>
                  <div className="flex items-center text-sm text-gray-400">
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
                  <div className="space-y-4 pt-6 border-t border-gray-700">
                    <h3 className="font-medium text-cyan-400">Content Details</h3>
                    
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
                        Title (Optional)
                      </label>
                      <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400"
                        placeholder="Leave blank for auto-generated title"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        If left blank, title will be generated from content type and metadata
                      </p>
                    </div>

                    <div>
                      <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                        Description (Optional)
                      </label>
                      <textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white placeholder-gray-400"
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
                        className="text-sm text-cyan-400 hover:text-cyan-300 font-medium flex items-center transition-colors"
                      >
                        <ZapIcon className="h-4 w-4 mr-2" />
                        Auto-detect content details
                      </button>
                    )}
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-4 pt-6 border-t border-gray-700">
                    <h3 className="font-medium text-cyan-400">Cover Image (Optional)</h3>
                    
                    {!selectedImage ? (
                      <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-cyan-400 transition-colors bg-gray-800/30">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageSelect}
                          className="hidden"
                        />
                        <ImageIcon className="mx-auto h-12 w-12 text-gray-500 mb-4" />
                        <p className="text-gray-400 mb-4">Add a cover image to your Evermark</p>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingImage}
                          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-lg hover:from-purple-400 hover:to-purple-600 transition-colors disabled:opacity-50 shadow-lg shadow-purple-500/30"
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
                        <p className="text-xs text-gray-500 mt-3">PNG, JPG, GIF up to 10MB</p>
                      </div>
                    ) : (
                      <div className="relative">
                        <img
                          src={imagePreview!}
                          alt="Preview"
                          className="w-full h-48 object-cover rounded-lg border border-gray-600"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-3 right-3 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {imageUploadError && (
                      <p className="text-red-400 text-sm">{imageUploadError}</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-6 border-t border-gray-700">
                    <button
                      type="submit"
                      disabled={isSubmitting || isCreating || !canInteract}
                      className="w-full flex items-center justify-center px-6 py-4 bg-gradient-to-r from-green-400 to-green-600 text-black font-bold rounded-lg hover:from-green-300 hover:to-green-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/30"
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
                      <p className="text-center text-sm text-gray-500 mt-3">
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
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg shadow-lg shadow-gray-900/50 p-6 sticky top-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-cyan-400">Live Preview</h3>
                  <EyeIcon className="h-5 w-5 text-gray-500" />
                </div>
                
                <div className="space-y-6">
                  {/* Preview Image */}
                  {imagePreview && (
                    <div className="aspect-video bg-gray-700 rounded-lg overflow-hidden border border-gray-600">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Preview Content */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-white text-xl mb-2">
                        {previewTitle || "Untitled Evermark"}
                      </h4>
                      <p className="text-sm text-gray-400">by {previewAuthor}</p>
                    </div>

                    {previewDescription && (
                      <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                        <p className="text-gray-300 text-sm leading-relaxed">
                          {previewDescription}
                        </p>
                      </div>
                    )}

                    {previewSourceUrl && (
                      <div className="pt-3 border-t border-gray-700">
                        <p className="text-xs text-gray-500 mb-2">Source:</p>
                        <a
                          href={previewSourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 text-sm break-all transition-colors"
                        >
                          {previewSourceUrl}
                        </a>
                      </div>
                    )}

                    {/* Tags Preview */}
                    {enhancedMetadata.tags.length > 0 && (
                      <div className="pt-3">
                        <p className="text-xs text-gray-500 mb-3">Tags:</p>
                        <div className="flex flex-wrap gap-2">
                          {enhancedMetadata.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-block bg-purple-900/50 text-purple-300 text-xs px-3 py-1 rounded-full border border-purple-500/30"
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
                <div className="mt-6 pt-4 border-t border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Content Type:</span>
                    <span className="text-white font-medium">
                      {contentTypeInfo.icon} {enhancedMetadata.contentType}
                    </span>
                  </div>
                </div>

                {/* ✅ UPDATED: Wallet info using unified system */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Wallet:</span>
                      <span className={canInteract ? "text-green-400" : "text-red-400"}>
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
              <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-6">
                <div className="flex items-start">
                  <InfoIcon className="h-5 w-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <h4 className="font-medium text-blue-300 mb-3">Creating Evermarks</h4>
                    <div className="text-blue-200 space-y-2">
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
      </div>

      {/* Help Modal */}
      <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
    </div>
  );
}