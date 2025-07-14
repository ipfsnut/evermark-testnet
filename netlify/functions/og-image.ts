// netlify/functions/og-image.ts - Dynamic OG Image Generation
import type { Context } from '@netlify/functions';

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const params = url.searchParams;
  
  // Extract parameters
  const title = params.get('title') || 'Untitled Evermark';
  const author = params.get('author') || 'Anonymous';
  const type = params.get('type') || 'evermark'; // 'farcaster' or 'evermark'
  const category = params.get('category') || 'general';
  const likes = parseInt(params.get('likes') || '0');
  const recasts = parseInt(params.get('recasts') || '0');
  const quality = parseInt(params.get('quality') || '0');
  
  // Brand colors
  const colors = {
    primary: '#8B5CF6', // Purple-600
    secondary: '#06B6D4', // Cyan-500
    dark: '#1F2937', // Gray-800
    light: '#F9FAFB', // Gray-50
    accent: '#EC4899' // Pink-500
  };
  
  // Determine theme based on type
  const isFarcaster = type === 'farcaster';
  const bgColor = isFarcaster ? '#6366F1' : colors.primary; // Indigo for Farcaster
  
  // Create SVG
  const svg = `
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Gradient Background -->
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors.dark};stop-opacity:1" />
        </linearGradient>
        
        <!-- Card Background -->
        <linearGradient id="cardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.light};stop-opacity:0.95" />
          <stop offset="100%" style="stop-color:white;stop-opacity:0.9" />
        </linearGradient>
        
        <!-- Text Shadow Filter -->
        <filter id="textShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
        
        <!-- Glow Effect -->
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <!-- Background -->
      <rect width="1200" height="630" fill="url(#bgGradient)"/>
      
      <!-- Decorative Elements -->
      <circle cx="100" cy="100" r="80" fill="${colors.secondary}" opacity="0.1"/>
      <circle cx="1100" cy="530" r="120" fill="${colors.accent}" opacity="0.1"/>
      <rect x="0" y="0" width="1200" height="8" fill="${colors.secondary}"/>
      
      <!-- Main Content Card -->
      <rect x="80" y="120" width="1040" height="390" rx="20" fill="url(#cardGradient)" stroke="${colors.primary}" stroke-width="2"/>
      
      <!-- Evermark Logo/Icon Area -->
      <rect x="120" y="160" width="80" height="80" rx="40" fill="${bgColor}"/>
      <text x="160" y="215" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="36" font-weight="bold">📚</text>
      
      <!-- Platform Badge -->
      ${isFarcaster ? `
        <rect x="1000" y="140" width="100" height="32" rx="16" fill="#6366F1"/>
        <text x="1050" y="160" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">Farcaster</text>
      ` : `
        <rect x="1000" y="140" width="100" height="32" rx="16" fill="${colors.primary}"/>
        <text x="1050" y="160" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="14" font-weight="bold">Evermark</text>
      `}
      
      <!-- Title -->
      <text x="220" y="200" fill="${colors.dark}" font-family="Georgia, serif" font-size="48" font-weight="bold" filter="url(#textShadow)">
        ${escapeXml(truncateText(title, 35))}
      </text>
      
      <!-- Author -->
      <text x="220" y="240" fill="${colors.dark}" font-family="Arial, sans-serif" font-size="24" opacity="0.8">
        by ${escapeXml(truncateText(author, 25))}
      </text>
      
      <!-- Category Badge -->
      <rect x="220" y="265" width="${Math.max(category.length * 12 + 20, 80)}" height="28" rx="14" fill="${colors.secondary}" opacity="0.2"/>
      <text x="${220 + Math.max(category.length * 6 + 10, 40)}" y="283" text-anchor="middle" fill="${colors.dark}" font-family="Arial, sans-serif" font-size="16" font-weight="500">
        #${escapeXml(category)}
      </text>
      
      <!-- Engagement Stats (for Farcaster) -->
      ${isFarcaster && (likes > 0 || recasts > 0) ? `
        <g transform="translate(220, 320)">
          <!-- Likes -->
          <circle cx="0" cy="0" r="16" fill="${colors.accent}" opacity="0.2"/>
          <text x="0" y="6" text-anchor="middle" fill="${colors.accent}" font-family="Arial, sans-serif" font-size="18">❤️</text>
          <text x="30" y="6" fill="${colors.dark}" font-family="Arial, sans-serif" font-size="20" font-weight="600">${formatCount(likes)}</text>
          
          <!-- Recasts -->
          <circle cx="120" cy="0" r="16" fill="${colors.secondary}" opacity="0.2"/>
          <text x="120" y="6" text-anchor="middle" fill="${colors.secondary}" font-family="Arial, sans-serif" font-size="18">🔄</text>
          <text x="150" y="6" fill="${colors.dark}" font-family="Arial, sans-serif" font-size="20" font-weight="600">${formatCount(recasts)}</text>
          
          <!-- Quality Score -->
          ${quality > 0 ? `
            <rect x="250" y="-14" width="120" height="28" rx="14" fill="${colors.primary}" opacity="0.1"/>
            <text x="310" y="6" text-anchor="middle" fill="${colors.primary}" font-family="Arial, sans-serif" font-size="16" font-weight="600">
              Quality: ${quality}
            </text>
          ` : ''}
        </g>
      ` : ''}
      
      <!-- Branding Footer -->
      <text x="120" y="570" fill="white" font-family="Arial, sans-serif" font-size="20" font-weight="bold" filter="url(#glow)">
        Evermark
      </text>
      <text x="220" y="570" fill="white" font-family="Arial, sans-serif" font-size="16" opacity="0.8">
        Preserve & Share Knowledge Forever
      </text>
      
      <!-- QR Code placeholder (could be actual QR in future) -->
      <rect x="1020" y="460" width="60" height="60" rx="8" fill="white" opacity="0.9"/>
      <rect x="1030" y="470" width="40" height="40" rx="4" fill="${bgColor}"/>
      <text x="1050" y="495" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="24">📱</text>
      
      <!-- Decorative corner elements -->
      <path d="M 0 0 L 40 0 L 0 40 Z" fill="${colors.secondary}" opacity="0.3"/>
      <path d="M 1200 630 L 1160 630 L 1200 590 Z" fill="${colors.accent}" opacity="0.3"/>
    </svg>
  `;
  
  // Convert SVG to PNG using a simple approach
  // In production, you might want to use a proper image generation library
  const response = new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Vary': 'Accept-Encoding',
    },
  });
  
  return response;
};

// Utility functions
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

function formatCount(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
}

export const config = {
  path: "/og-image"
};