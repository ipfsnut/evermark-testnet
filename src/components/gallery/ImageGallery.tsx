// src/components/gallery/ImageGallery.tsx - Enhanced image viewing for Evermarks
import React, { useState, useEffect, useCallback } from 'react';
import { 
  XIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ZoomInIcon, 
  ZoomOutIcon,
  DownloadIcon,
  ExternalLinkIcon,
  ImageIcon
} from 'lucide-react';
import { UniversalImage } from '../layout/UniversalImage';
import { cn } from '../../utils/responsive';

interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
    title?: string;
    description?: string;
    evermarkId?: string;
  }>;
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  showControls?: boolean;
  allowDownload?: boolean;
}

interface ImageModalProps {
  src: string;
  alt: string;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
  showControls?: boolean;
  allowDownload?: boolean;
}

// Single image modal component
export const ImageModal: React.FC<ImageModalProps> = ({
  src,
  alt,
  title,
  isOpen,
  onClose,
  showControls = true,
  allowDownload = true
}) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setIsLoading(true);
      setHasError(false);
    }
  }, [isOpen, src]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 1.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 1.5, 0.5));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [zoom, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = title || alt || 'evermark-image';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  }, [src, title, alt]);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Backdrop */}
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative max-w-7xl max-h-screen w-full h-full flex flex-col">
        {/* Header */}
        {showControls && (
          <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
            <div className="flex items-center space-x-4">
              {title && (
                <h3 className="text-white font-medium truncate">{title}</h3>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Zoom Controls */}
              <button
                onClick={handleZoomOut}
                className="p-2 text-white hover:bg-white/20 rounded transition-colors"
                disabled={zoom <= 0.5}
              >
                <ZoomOutIcon className="h-5 w-5" />
              </button>
              
              <span className="text-white text-sm min-w-[4rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              
              <button
                onClick={handleZoomIn}
                className="p-2 text-white hover:bg-white/20 rounded transition-colors"
                disabled={zoom >= 5}
              >
                <ZoomInIcon className="h-5 w-5" />
              </button>

              <button
                onClick={handleReset}
                className="p-2 text-white hover:bg-white/20 rounded transition-colors text-sm"
              >
                Reset
              </button>

              {/* Download */}
              {allowDownload && !hasError && (
                <button
                  onClick={handleDownload}
                  className="p-2 text-white hover:bg-white/20 rounded transition-colors"
                >
                  <DownloadIcon className="h-5 w-5" />
                </button>
              )}

              {/* External Link */}
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-white hover:bg-white/20 rounded transition-colors"
              >
                <ExternalLinkIcon className="h-5 w-5" />
              </a>

              {/* Close */}
              <button
                onClick={onClose}
                className="p-2 text-white hover:bg-white/20 rounded transition-colors"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Image Container */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Loading image...</p>
              </div>
            </div>
          )}

          {hasError ? (
            <div className="text-white text-center">
              <ImageIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-lg mb-2">Failed to load image</p>
              <p className="text-gray-400 text-sm">{src}</p>
            </div>
          ) : (
            <img
              src={src}
              alt={alt}
              className={cn(
                'max-w-full max-h-full object-contain transition-transform duration-200',
                zoom > 1 ? 'cursor-grab' : 'cursor-zoom-in',
                isDragging && 'cursor-grabbing'
              )}
              style={{
                transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              }}
              onLoad={handleImageLoad}
              onError={handleImageError}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onClick={zoom === 1 ? handleZoomIn : undefined}
              draggable={false}
            />
          )}
        </div>

        {/* Footer Info */}
        {showControls && !isLoading && !hasError && (
          <div className="p-4 bg-black/50 backdrop-blur-sm">
            <div className="text-white text-sm text-center">
              {alt && <p className="opacity-70">{alt}</p>}
              {zoom > 1 && (
                <p className="text-xs opacity-50 mt-1">
                  Click and drag to pan • Scroll to zoom
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Full gallery component for multiple images
export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  initialIndex = 0,
  isOpen,
  onClose,
  showControls = true,
  allowDownload = true
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Update current index when initialIndex changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex]);

  const handlePrevious = useCallback(() => {
    setCurrentIndex(prev => prev > 0 ? prev - 1 : images.length - 1);
  }, [images.length]);

  const handleNext = useCallback(() => {
    setCurrentIndex(prev => prev < images.length - 1 ? prev + 1 : 0);
  }, [images.length]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex];
  const showNavigation = images.length > 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Backdrop */}
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />

      {/* Navigation - Previous */}
      {showNavigation && showControls && (
        <button
          onClick={handlePrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 text-white hover:bg-white/20 rounded-full transition-colors"
        >
          <ChevronLeftIcon className="h-8 w-8" />
        </button>
      )}

      {/* Navigation - Next */}
      {showNavigation && showControls && (
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 text-white hover:bg-white/20 rounded-full transition-colors"
        >
          <ChevronRightIcon className="h-8 w-8" />
        </button>
      )}

      {/* Image Modal */}
      <ImageModal
        src={currentImage.src}
        alt={currentImage.alt}
        title={currentImage.title}
        isOpen={isOpen}
        onClose={onClose}
        showControls={showControls}
        allowDownload={allowDownload}
      />

      {/* Thumbnail Strip */}
      {showNavigation && showControls && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 bg-black/50 backdrop-blur-sm rounded-lg p-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'relative w-16 h-16 rounded overflow-hidden border-2 transition-all',
                index === currentIndex 
                  ? 'border-white scale-110' 
                  : 'border-transparent opacity-60 hover:opacity-80'
              )}
            >
              <UniversalImage
                src={image.src}
                alt={image.alt}
                aspectRatio="square"
                rounded="none"
                className="w-full h-full"
              />
            </button>
          ))}
        </div>
      )}

      {/* Image Counter */}
      {showNavigation && showControls && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
          <span className="text-white text-sm">
            {currentIndex + 1} of {images.length}
          </span>
        </div>
      )}
    </div>
  );
};

export default ImageGallery;