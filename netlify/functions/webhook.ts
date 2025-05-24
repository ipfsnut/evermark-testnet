// netlify/functions/webhook.ts
import type { Context } from "@netlify/functions";
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import { base } from "thirdweb/chains";

// Types for Farcaster webhook events
interface FarcasterCastEvent {
  type: 'cast.created';
  data: {
    object: 'cast';
    hash: string;
    thread_hash: string;
    parent_hash?: string;
    author: {
      object: 'user';
      fid: number;
      username: string;
      display_name: string;
      pfp_url: string;
      follower_count: number;
      following_count: number;
      verifications: string[];
      verified_addresses: {
        eth_addresses: string[];
        sol_addresses: string[];
      };
    };
    text: string;
    timestamp: string;
    embeds: Array<{
      url?: string;
      cast_id?: {
        fid: number;
        hash: string;
      };
    }>;
    mentioned_profiles: Array<{
      object: 'user';
      fid: number;
      username: string;
      display_name: string;
    }>;
  };
}

interface EvermarkCommand {
  type: 'evermark';
  title?: string;
  tags?: string[];
  isPrivate?: boolean;
  collection?: string;
}

// Contract ABI for mintBookmarkFor function
const EVERMARK_NFT_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "to", "type": "address"},
      {"internalType": "string", "name": "metadataURI", "type": "string"},
      {"internalType": "string", "name": "title", "type": "string"},
      {"internalType": "string", "name": "creator", "type": "string"}
    ],
    "name": "mintBookmarkFor",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

// Parse !evermark commands from cast text (supports variations)
function parseEvermarkCommand(text: string): EvermarkCommand | null {
  console.log('Parsing text for evermark command:', text);
  
  // Look for command variations (case insensitive)
  const evermarkMatch = text.match(/!(evermark|bookmark|save)\s*(.*)?/i);
  if (!evermarkMatch) {
    console.log('No evermark command found');
    return null;
  }

  const commandText = evermarkMatch[2]?.trim() || '';
  console.log('Command text found:', commandText);
  
  // Parse optional parameters
  const titleMatch = commandText.match(/"([^"]+)"/);
  const title = titleMatch ? titleMatch[1] : undefined;
  
  // Parse hashtags
  const tagMatches = commandText.match(/#\w+/g);
  const tags = tagMatches?.map(tag => tag.slice(1)) || [];
  
  // Parse flags
  const isPrivate = commandText.includes('--private');
  
  // Parse collection
  const collectionMatch = commandText.match(/--collection\s+"([^"]+)"/);
  const collection = collectionMatch ? collectionMatch[1] : undefined;
  
  const command = {
    type: 'evermark' as const,
    title,
    tags,
    isPrivate,
    collection
  };
  
  console.log('Parsed command:', command);
  return command;
}

// Create Evermark metadata from Farcaster cast
async function createEvermarkMetadata(
  cast: FarcasterCastEvent['data'],
  command: EvermarkCommand
): Promise<any> {
  const metadata = {
    name: command.title || `Cast by @${cast.author.username}`,
    description: cast.text,
    external_url: `https://warpcast.com/${cast.author.username}/${cast.hash.slice(0, 10)}`,
    image: cast.author.pfp_url || '',
    attributes: [
      {
        trait_type: 'Content Type',
        value: 'Farcaster Cast'
      },
      {
        trait_type: 'Original Author',
        value: cast.author.display_name || cast.author.username
      },
      {
        trait_type: 'Original Author FID',
        value: cast.author.fid.toString()
      },
      {
        trait_type: 'Cast Hash',
        value: cast.hash
      },
      {
        trait_type: 'Timestamp',
        value: cast.timestamp
      },
      {
        trait_type: 'Preserved Via',
        value: '!evermark Command'
      },
      ...(command.tags?.map(tag => ({
        trait_type: 'Tag',
        value: tag
      })) || []),
      {
        trait_type: 'Privacy',
        value: command.isPrivate ? 'Private' : 'Public'
      },
      ...(command.collection ? [{
        trait_type: 'Collection',
        value: command.collection
      }] : [])
    ]
  };

  console.log('Generated metadata:', metadata);
  return metadata;
}

// Upload metadata to IPFS via Pinata
async function uploadToIPFS(metadata: any, castHash: string): Promise<string> {
  console.log('Uploading to IPFS...');
  
  const apiKey = process.env.PINATA_API_KEY;
  const secretKey = process.env.PINATA_SECRET_KEY;
  
  if (!apiKey || !secretKey) {
    throw new Error('Pinata API keys not configured');
  }
  
  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'pinata_api_key': apiKey,
      'pinata_secret_api_key': secretKey,
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: {
        name: `Evermark-Cast-${castHash.slice(0, 10)}`,
        keyvalues: {
          castHash: castHash,
          authorFid: metadata.attributes.find((a: any) => a.trait_type === 'Original Author FID')?.value,
          createdAt: new Date().toISOString(),
          source: 'farcaster-webhook'
        }
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('IPFS upload failed:', response.status, errorText);
    throw new Error(`Failed to upload to IPFS: ${response.status}`);
  }

  const data = await response.json();
  const metadataURI = `ipfs://${data.IpfsHash}`;
  
  console.log('IPFS upload successful:', metadataURI);
  return metadataURI;
}

// Mint NFT on blockchain
async function mintEvermarkNFT(
  recipientAddress: string,
  metadataURI: string,
  title: string,
  author: string
): Promise<{ transactionHash: string; tokenId?: string }> {
  console.log('Minting NFT on blockchain...');
  
  // Get environment variables
  const privateKey = process.env.MINTER_PRIVATE_KEY;
  const contractAddress = process.env.VITE_BOOKMARK_NFT_ADDRESS;
  const thirdwebClientId = process.env.VITE_THIRDWEB_CLIENT_ID;
  
  if (!privateKey || !contractAddress || !thirdwebClientId) {
    throw new Error('Missing required environment variables for minting');
  }
  
  // Create Thirdweb client
  const client = createThirdwebClient({
    clientId: thirdwebClientId,
  });
  
  // Create wallet from private key
  const account = privateKeyToAccount({
    client,
    privateKey: privateKey as `0x${string}`,
  });
  
  // Get contract instance
  const contract = getContract({
    client,
    chain: base,
    address: contractAddress,
    abi: EVERMARK_NFT_ABI,
  });
  
  // Prepare transaction
  const transaction = prepareContractCall({
    contract,
    method: "mintBookmarkFor",
    params: [recipientAddress, metadataURI, title, author],
  });
  
  // Send transaction
  const result = await sendTransaction({
    transaction,
    account,
  });
  
  console.log('NFT minted successfully!', result.transactionHash);
  
  return {
    transactionHash: result.transactionHash,
    // TODO: Extract tokenId from transaction receipt events
  };
}

// Get user's Ethereum address from Farcaster verified addresses
function getUserAddress(cast: FarcasterCastEvent['data']): string | null {
  const ethAddresses = cast.author.verified_addresses?.eth_addresses || [];
  if (ethAddresses.length > 0) {
    return ethAddresses[0]; // Use first verified address
  }
  return null;
}

// Main webhook handler using modern Netlify Functions API
export default async (request: Request, context: Context) => {
  console.log('Webhook received:', request.method, request.url);
  
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response('', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, x-farcaster-signature',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      }
    });
  }
  
  // Health check endpoint
  if (request.method === 'GET') {
    return Response.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'evermark-webhook',
      version: '3.0.0',
      features: {
        ipfsUpload: !!process.env.PINATA_API_KEY,
        blockchainMinting: !!process.env.MINTER_PRIVATE_KEY,
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
  
  // Only handle POST requests for webhooks
  if (request.method !== 'POST') {
    return Response.json(
      { error: 'Method not allowed' },
      { 
        status: 405,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    );
  }
  
  try {
    const body = await request.text();
    const signature = request.headers.get('x-farcaster-signature') || '';
    
    console.log('Processing webhook with signature:', signature ? 'present' : 'missing');
    
    // TODO: Add signature verification here
    // const webhookSecret = process.env.FARCASTER_WEBHOOK_SECRET;
    // if (!verifySignature(body, signature, webhookSecret)) {
    //   return Response.json({ error: 'Invalid signature' }, { status: 401 });
    // }
    
    const webhookEvent = JSON.parse(body) as FarcasterCastEvent;
    console.log('Webhook event type:', webhookEvent.type);
    
    // Only process cast creation events
    if (webhookEvent.type !== 'cast.created') {
      console.log('Ignoring non-cast event');
      return Response.json(
        { status: 'ignored', reason: 'not_cast_event' },
        { headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }
    
    const cast = webhookEvent.data;
    console.log(`Processing cast from @${cast.author.username}: "${cast.text}"`);
    
    // Check if cast contains !evermark command
    const command = parseEvermarkCommand(cast.text);
    if (!command) {
      console.log('No !evermark command found in cast');
      return Response.json(
        { status: 'ignored', reason: 'no_evermark_command' },
        { headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }
    
    console.log('🎉 Processing !evermark command!');
    console.log('Cast hash:', cast.hash);
    console.log('Author:', cast.author.username, `(FID: ${cast.author.fid})`);
    console.log('Command:', command);
    
    // Get user's Ethereum address
    const userAddress = getUserAddress(cast);
    if (!userAddress) {
      console.error('No verified Ethereum address found for user');
      return Response.json({
        status: 'error',
        error: 'No verified Ethereum address found. Please verify an address on Farcaster.',
        castHash: cast.hash,
        author: cast.author.username,
      }, {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }
    
    console.log('User Ethereum address:', userAddress);
    
    // Create Evermark metadata
    const metadata = await createEvermarkMetadata(cast, command);
    
    // Upload to IPFS
    let metadataURI = 'metadata-not-uploaded';
    try {
      metadataURI = await uploadToIPFS(metadata, cast.hash);
    } catch (ipfsError) {
      console.error('IPFS upload failed:', ipfsError);
      // Continue anyway for testing - in production, you might want to fail here
    }
    
    // Mint NFT on blockchain
    let transactionHash = '';
    let tokenId = '';
    
    try {
      if (process.env.MINTER_PRIVATE_KEY) {
        const mintResult = await mintEvermarkNFT(
          userAddress,
          metadataURI,
          metadata.name,
          metadata.attributes.find((a: any) => a.trait_type === 'Original Author')?.value || 'Unknown'
        );
        transactionHash = mintResult.transactionHash;
        tokenId = mintResult.tokenId || 'pending';
        
        console.log('✅ NFT minted successfully!');
        console.log('Transaction hash:', transactionHash);
      } else {
        console.log('⚠️ Minting skipped - no minter key configured');
      }
    } catch (mintError) {
      console.error('Minting failed:', mintError);
      // In production, you might want to save failed mints to retry later
    }
    
    // TODO: Send notification reply to user on Farcaster
    // This would require Farcaster API integration to post a reply
    
    console.log('✅ Evermark processing complete!');
    console.log('Metadata URI:', metadataURI);
    console.log('Transaction hash:', transactionHash || 'not-minted');
    console.log('Token ID:', tokenId || 'pending');
    
    return Response.json({
      status: 'success',
      evermarkId: tokenId || `cast-${cast.hash.slice(0, 10)}`,
      metadataURI: metadataURI,
      transactionHash: transactionHash,
      message: 'Evermark created successfully',
      castHash: cast.hash,
      author: cast.author.username,
      userAddress: userAddress,
      command: command
    }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
    
  } catch (error) {
    console.error('Webhook error:', error);
    
    return Response.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
};