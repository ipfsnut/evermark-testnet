import type { Context } from "@netlify/functions";
import { createThirdwebClient } from "thirdweb";
import { getContract, readContract } from "thirdweb";
import { defineChain } from "thirdweb/chains";

// Import your existing ABI and contracts
import { EVERMARK_NFT_ABI } from "../../src/lib/abis/index";
import { EVERMARK_CONFIG } from "../../src/lib/abis/evermark-config";

// Create thirdweb client
const client = createThirdwebClient({
  clientId: process.env.VITE_THIRDWEB_CLIENT_ID!,
});

const CHAIN = defineChain(EVERMARK_CONFIG.chainId);

const fetchEvermarkData = async (id: string) => {
  try {
    const contract = getContract({
      client,
      chain: CHAIN,
      address: EVERMARK_CONFIG.contracts.evermarkNFT,
      abi: EVERMARK_NFT_ABI, // Use your full ABI
    });

    const [title, creator, metadataURI] = await readContract({
      contract,
      method: "getEvermarkMetadata",
      params: [BigInt(id)],
    });

    // Fetch IPFS metadata
    let description = "";
    let image = "";
    
    if (metadataURI) {
      try {
        const fetchUrl = metadataURI.startsWith('ipfs://') 
          ? metadataURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')
          : metadataURI;
        
        const response = await fetch(fetchUrl);
        if (response.ok) {
          const ipfsData = await response.json();
          description = ipfsData.description || "";
          image = ipfsData.image 
            ? ipfsData.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') 
            : "";
        }
      } catch (error) {
        console.error('Error fetching IPFS metadata:', error);
      }
    }

    return {
      title,
      creator,
      description,
      image,
      metadataURI
    };
  } catch (error) {
    console.error('Error fetching evermark data:', error);
    throw error;
  }
};

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  
  // Extract evermark ID from /share/evermark/123
  const evermarkId = pathParts[pathParts.length - 1];
  
  if (!evermarkId || isNaN(Number(evermarkId))) {
    return new Response('Invalid Evermark ID', { status: 400 });
  }

  try {
    // Fetch evermark data
    const evermark = await fetchEvermarkData(evermarkId);
    
    // Get UTM parameters for tracking
    const utmSource = url.searchParams.get('utm_source') || 'direct';
    const utmMedium = url.searchParams.get('utm_medium') || 'social';
    const utmCampaign = url.searchParams.get('utm_campaign') || 'evermark_share';
    
    // Build the final redirect URL (to your React app)
    const redirectUrl = `${url.origin}/evermark/${evermarkId}?utm_source=${utmSource}&utm_medium=${utmMedium}&utm_campaign=${utmCampaign}`;
    
    // Create HTML with proper meta tags
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          
          <!-- Basic meta tags -->
          <title>${evermark.title} by ${evermark.creator} | Evermark</title>
          <meta name="description" content="${evermark.description || 'Preserved content on the blockchain via Evermark'}" />
          
          <!-- Open Graph meta tags for social sharing -->
          <meta property="og:title" content="${evermark.title} by ${evermark.creator}" />
          <meta property="og:description" content="${evermark.description || 'Preserved content on the blockchain via Evermark'}" />
          <meta property="og:url" content="${redirectUrl}" />
          <meta property="og:type" content="article" />
          <meta property="og:site_name" content="Evermark" />
          ${evermark.image ? `
          <meta property="og:image" content="${evermark.image}" />
          <meta property="og:image:width" content="1200" />
          <meta property="og:image:height" content="630" />
          <meta property="og:image:alt" content="${evermark.title}" />
          ` : ''}
          
          <!-- Twitter Card meta tags -->
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="${evermark.title} by ${evermark.creator}" />
          <meta name="twitter:description" content="${evermark.description || 'Preserved content on the blockchain via Evermark'}" />
          ${evermark.image ? `<meta name="twitter:image" content="${evermark.image}" />` : ''}
          
          <!-- Farcaster Frame meta tags -->
          <meta property="fc:frame" content="vNext" />
          <meta property="fc:frame:image" content="${evermark.image || `${url.origin}/default-share-image.png`}" />
          <meta property="fc:frame:button:1" content="View on Evermark" />
          <meta property="fc:frame:button:1:action" content="link" />
          <meta property="fc:frame:button:1:target" content="${redirectUrl}" />
          
          <!-- Immediate redirect for users -->
          <script>
            // Track the share access
            fetch('/api/shares', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                evermarkId: '${evermarkId}',
                platform: '${utmSource}',
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                referrer: document.referrer,
                utm_source: '${utmSource}',
                utm_medium: '${utmMedium}',
                utm_campaign: '${utmCampaign}'
              })
            }).catch(console.error);
            
            // Redirect after a brief delay
            setTimeout(() => {
              window.location.href = '${redirectUrl}';
            }, 100);
          </script>
          
          <!-- Fallback for no-JS -->
          <noscript>
            <meta http-equiv="refresh" content="0; url=${redirectUrl}" />
          </noscript>
        </head>
        <body>
          <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
            <h1>${evermark.title}</h1>
            <p>by ${evermark.creator}</p>
            <p>Taking you to Evermark...</p>
            <a href="${redirectUrl}">Click here if you're not redirected automatically</a>
          </div>
        </body>
      </html>
    `;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    });

  } catch (error) {
    console.error('Error generating share page:', error);
    
    // Fallback redirect to main app
    const fallbackUrl = `${url.origin}/evermark/${evermarkId}`;
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Evermark</title>
          <script>window.location.href = '${fallbackUrl}';</script>
          <noscript><meta http-equiv="refresh" content="0; url=${fallbackUrl}" /></noscript>
        </head>
        <body>
          <p>Redirecting to Evermark...</p>
        </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    });
  }
};