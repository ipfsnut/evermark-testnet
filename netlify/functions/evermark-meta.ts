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

// Fetch real Evermark data from your API
async function fetchEvermarkData(evermarkId: string) {
  try {
    // Try to fetch from your Supabase API first
    const supabaseResponse = await fetch(`https://evermarks.net/api/evermarks/${evermarkId}`);
    if (supabaseResponse.ok) {
      const data = await supabaseResponse.json();
      return {
        id: data.id,
        title: data.title,
        author: data.author,
        description: data.description,
        image: data.image,
        creationTime: data.creationTime
      };
    }
    
    // Fallback to blockchain if needed
    console.log('Supabase failed, using fallback data for evermark:', evermarkId);
    return {
      id: evermarkId,
      title: `Evermark #${evermarkId}`,
      author: 'Evermark Creator',
      description: 'A permanently preserved piece of content on the blockchain',
      image: null, // Will use generated OG image
      creationTime: Date.now()
    };
  } catch (error) {
    console.error('Error fetching evermark data:', error);
    // Return fallback data
    return {
      id: evermarkId,
      title: `Evermark #${evermarkId}`,
      author: 'Evermark Creator',
      description: 'A permanently preserved piece of content on the blockchain',
      image: null,
      creationTime: Date.now()
    };
  }
}

function generateMetaTags(evermark: any) {
  const baseUrl = 'https://evermarks.net';
  const evermarkUrl = `${baseUrl}/evermark/${evermark.id}`;
  const imageUrl = evermark.image || `${baseUrl}/.netlify/functions/og-image?title=${encodeURIComponent(evermark.title)}&author=${encodeURIComponent(evermark.author)}`;
  
  // Create Mini App embed JSON
  const miniAppEmbed = {
    version: "1",
    imageUrl: imageUrl,
    button: {
      title: "📖 View Evermark",
      action: {
        type: "launch_miniapp",
        url: evermarkUrl,
        name: "Evermark",
        splashImageUrl: "https://evermarks.net/icon.png",
        splashBackgroundColor: "#7c3aed"
      }
    }
  };

  // For backward compatibility, also create frame version
  const frameEmbed = {
    ...miniAppEmbed,
    button: {
      ...miniAppEmbed.button,
      action: {
        ...miniAppEmbed.button.action,
        type: "launch_frame" // For backward compatibility
      }
    }
  };
  
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
    
    <!-- Farcaster Mini App Embed -->
    <meta name="fc:miniapp" content='${JSON.stringify(miniAppEmbed)}' />
    <!-- For backward compatibility -->
    <meta name="fc:frame" content='${JSON.stringify(frameEmbed)}' />
  `;
}
