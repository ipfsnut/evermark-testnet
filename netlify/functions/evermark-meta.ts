// netlify/functions/evermark-meta.ts - Server-side meta tags for Farcaster
import type { Context } from '@netlify/functions';

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const evermarkId = pathParts[pathParts.length - 1];

  if (!evermarkId) {
    return new Response('Evermark ID required', { status: 400 });
  }

  try {
    // Fetch evermark data from your API/database
    // You'll need to implement this based on your data source
    const evermarkData = await fetchEvermarkData(evermarkId);
    
    if (!evermarkData) {
      return new Response('Evermark not found', { status: 404 });
    }

    // Generate meta tags
    const metaTags = generateMetaTags(evermarkData);
    
    // Return HTML with meta tags
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${metaTags}
</head>
<body>
  <script>
    // Redirect to the actual app
    window.location.replace('https://evermarks.net/evermark/${evermarkId}');
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0; url=https://evermarks.net/evermark/${evermarkId}">
  </noscript>
</body>
</html>
    `;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });
  } catch (error) {
    console.error('Error generating meta tags:', error);
    return new Response('Internal server error', { status: 500 });
  }
};

// You'll need to implement this function based on your data source
async function fetchEvermarkData(evermarkId: string) {
  // This should fetch from your Supabase or blockchain
  // For now, returning a mock response
  return {
    id: evermarkId,
    title: 'Sample Evermark',
    author: 'Test Author',
    description: 'This is a sample Evermark for testing',
    image: 'https://evermarks.net/og-image.png',
    creationTime: Date.now()
  };
}

function generateMetaTags(evermark: any) {
  const baseUrl = 'https://evermarks.net';
  const evermarkUrl = `${baseUrl}/evermark/${evermark.id}`;
  const imageUrl = evermark.image || `${baseUrl}/.netlify/functions/og-image?title=${encodeURIComponent(evermark.title)}&author=${encodeURIComponent(evermark.author)}`;
  
  return `
    <!-- Basic Meta Tags -->
    <title>${evermark.title} | Evermark</title>
    <meta name="description" content="${evermark.description}" />
    <meta name="author" content="${evermark.author}" />
    
    <!-- Open Graph Tags -->
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${evermark.title}" />
    <meta property="og:description" content="${evermark.description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${evermarkUrl}" />
    <meta property="og:site_name" content="Evermark" />
    
    <!-- Twitter Card Tags -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${evermark.title}" />
    <meta name="twitter:description" content="${evermark.description}" />
    <meta name="twitter:image" content="${imageUrl}" />
    
    <!-- Farcaster Frame Tags -->
    <meta property="fc:frame" content="vNext" />
    <meta property="fc:frame:image" content="${imageUrl}" />
    <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
    <meta property="fc:frame:button:1" content="View Evermark" />
    <meta property="fc:frame:button:1:action" content="link" />
    <meta property="fc:frame:button:1:target" content="${evermarkUrl}" />
    
    <!-- Farcaster Mini App -->
    <meta property="fc:miniapp:manifest" content="${baseUrl}/.well-known/farcaster.json" />
    <meta property="fc:miniapp:url" content="${evermarkUrl}" />
    <meta property="fc:miniapp:name" content="Evermark" />
  `;
}
