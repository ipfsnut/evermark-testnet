// src/components/meta/EvermarkMetaTags.tsx - Dynamic meta tags component
import React from 'react';
import { useEvermarkSharing, type EvermarkMetadata } from '../../utils/evermark-meta';

interface EvermarkMetaTagsProps {
  evermark: EvermarkMetadata;
}

export const EvermarkMetaTags: React.FC<EvermarkMetaTagsProps> = ({ evermark }) => {
  const { metaTags } = useEvermarkSharing(evermark);
  
  React.useEffect(() => {
    if (!metaTags) return;
    
    // Create a temporary div to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = metaTags;
    
    // Extract and apply meta tags
    const metaElements = tempDiv.querySelectorAll('meta, title, link');
    const head = document.head;
    
    // Store original tags to restore later
    const originalTags: Element[] = [];
    
    metaElements.forEach((element) => {
      const tagName = element.tagName.toLowerCase();
      
      if (tagName === 'title') {
        // Update title
        const originalTitle = document.title;
        document.title = element.textContent || '';
        originalTags.push({ tagName: 'title', content: originalTitle } as any);
      } else if (tagName === 'meta') {
        const metaEl = element as HTMLMetaElement;
        const name = metaEl.getAttribute('name');
        const property = metaEl.getAttribute('property');
        
        // Find existing meta tag
        let existingMeta: HTMLMetaElement | null = null;
        if (name) {
          existingMeta = head.querySelector(`meta[name="${name}"]`);
        } else if (property) {
          existingMeta = head.querySelector(`meta[property="${property}"]`);
        }
        
        if (existingMeta) {
          // Store original and update
          originalTags.push(existingMeta.cloneNode(true) as Element);
          existingMeta.setAttribute('content', metaEl.getAttribute('content') || '');
        } else {
          // Create new meta tag
          const newMeta = document.createElement('meta');
          if (name) newMeta.setAttribute('name', name);
          if (property) newMeta.setAttribute('property', property);
          newMeta.setAttribute('content', metaEl.getAttribute('content') || '');
          head.appendChild(newMeta);
          originalTags.push(newMeta);
        }
      } else if (tagName === 'link') {
        const linkEl = element as HTMLLinkElement;
        const rel = linkEl.getAttribute('rel');
        
        if (rel === 'canonical') {
          let existingCanonical = head.querySelector('link[rel="canonical"]');
          if (existingCanonical) {
            originalTags.push(existingCanonical.cloneNode(true) as Element);
            existingCanonical.setAttribute('href', linkEl.getAttribute('href') || '');
          } else {
            const newLink = document.createElement('link');
            newLink.setAttribute('rel', 'canonical');
            newLink.setAttribute('href', linkEl.getAttribute('href') || '');
            head.appendChild(newLink);
            originalTags.push(newLink);
          }
        }
      }
    });
    
    // Handle structured data
    const structuredDataMatch = metaTags.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
    let structuredDataScript: HTMLScriptElement | undefined;
    
    if (structuredDataMatch) {
      structuredDataScript = document.createElement('script');
      structuredDataScript.type = 'application/ld+json';
      structuredDataScript.textContent = structuredDataMatch[1];
      head.appendChild(structuredDataScript);
    }
    
    // Cleanup function
    return () => {
      // Restore original tags
      originalTags.forEach((tag) => {
        if (tag.tagName === 'title') {
          document.title = (tag as any).content;
        } else {
          const existing = head.querySelector(`${tag.tagName}[${tag.getAttribute('name') ? 'name' : 'property'}="${tag.getAttribute('name') || tag.getAttribute('property')}"]`);
          if (existing && tag.getAttribute('content')) {
            existing.setAttribute('content', tag.getAttribute('content') || '');
          }
        }
      });
      
      // Remove structured data
      if (structuredDataScript) {
        head.removeChild(structuredDataScript);
      }
    };
  }, [metaTags]);
  
  return null; // This component only manipulates the document head
};