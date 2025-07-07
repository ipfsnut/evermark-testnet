import { useState, useEffect, useMemo, useCallback } from 'react';
import { getContract, readContract } from "thirdweb";
import { client } from "../lib/thirdweb";
import { CHAIN, CONTRACTS, EVERMARK_NFT_ABI } from "../lib/contracts";

export interface Evermark {
  id: string;
  title: string;
  author: string;
  description?: string;
  sourceUrl?: string;
  image?: string;
  metadataURI: string;
  creator: string;
  creationTime: number;
  votes?: number;
}

// Helper function to fetch IPFS metadata with proper error handling
const fetchIPFSMetadata = async (metadataURI: string) => {
  // Default empty values
  const defaultReturn = { description: "", sourceUrl: "", image: "" };
  
  if (!metadataURI || !metadataURI.startsWith('ipfs://')) {
    return defaultReturn;
  }

  try {
    const ipfsHash = metadataURI.replace('ipfs://', '');
    
    // Basic validation - IPFS hashes should be at least 40 characters
    if (ipfsHash.length < 40) {
      console.log('Invalid IPFS hash format:', ipfsHash);
      return defaultReturn;
    }
    
    const ipfsGatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
    
    // Add timeout and proper error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    console.log('Fetching IPFS metadata from:', ipfsGatewayUrl);
    
    const response = await fetch(ipfsGatewayUrl, { 
      signal: controller.signal,
      cache: 'force-cache', // Use browser cache to reduce requests
      headers: {
        'Accept': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn(`IPFS fetch failed with status ${response.status} for hash: ${ipfsHash}`);
      return defaultReturn;
    }
    
    const ipfsData = await response.json();
    console.log('IPFS data fetched successfully:', ipfsData);
    
    return {
      description: ipfsData.description || "",
      sourceUrl: ipfsData.external_url || "",
      image: ipfsData.image 
        ? ipfsData.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') 
        : ""
    };
  } catch (error: unknown) {
    // Properly type the error and handle it
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    
    // Don't spam console with errors for expected failures
    if (errorName !== 'AbortError') {
      console.warn("Error fetching IPFS metadata:", errorMessage);
    }
    return defaultReturn;
  }
};

export function useEvermarks() {
  const [evermarks, setEvermarks] = useState<Evermark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Memoize contract to prevent recreation
  const contract = useMemo(() => {
    return getContract({
      client,
      chain: CHAIN,
      address: CONTRACTS.EVERMARK_NFT,
      abi: EVERMARK_NFT_ABI,
    });
  }, []);

  // Memoize the fetch function to prevent recreation
  const fetchEvermarks = useCallback(async () => {
    // Prevent refetching too frequently (max once per 30 seconds)
    const now = Date.now();
    if (now - lastFetch < 30000 && evermarks.length > 0) {
      console.log('Skipping fetch - too recent');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setLastFetch(now);
      
      console.log('Fetching evermarks...');
      
      const totalSupply = await readContract({
        contract,
        method: "totalSupply",
        params: [],
      });
      
      if (Number(totalSupply) === 0) {
        setEvermarks([]);
        setIsLoading(false);
        return;
      }
      
      const fetchedEvermarks: Evermark[] = [];
      const startId = Number(totalSupply);
      const endId = Math.max(1, startId - 10);
      
      for (let i = startId; i >= endId; i--) {
        try {
          const exists = await readContract({
            contract,
            method: "exists",
            params: [BigInt(i)],
          });
          
          if (!exists) continue;
          
          // ✅ FIXED: Use correct method name from ABI
          const evermarkData = await readContract({
            contract,
            method: "evermarkData",
            params: [BigInt(i)],
          });
          
          // ✅ FIXED: Extract fields from evermarkData tuple
          const [title, creator, metadataURI, creationTime, minter, referrer] = evermarkData;

          // Fetch IPFS metadata including image (with proper error handling)
          const { description, sourceUrl, image } = await fetchIPFSMetadata(metadataURI);
          
          fetchedEvermarks.push({
            id: i.toString(),
            title,
            author: creator, // Using creator field from evermarkData
            description,
            sourceUrl,
            image,
            metadataURI,
            creator: minter, // The minter address
            creationTime: Number(creationTime) * 1000,
          });
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          console.error(`Error fetching token ${i}:`, errorMessage);
        }
      }
      
      setEvermarks(fetchedEvermarks);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error("Error fetching evermarks:", errorMessage);
      setError(errorMessage || "Failed to load evermarks");
    } finally {
      setIsLoading(false);
    }
  }, [contract, lastFetch, evermarks.length]);

  // Only fetch once on mount, not on every render
  useEffect(() => {
    let isMounted = true;
    
    const runFetch = async () => {
      if (isMounted) {
        await fetchEvermarks();
      }
    };
    
    // Only fetch if we don't have data or it's been a while
    if (evermarks.length === 0 || Date.now() - lastFetch > 60000) {
      runFetch();
    }

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  // Provide a manual refresh function
  const refresh = useCallback(() => {
    setLastFetch(0); // Reset last fetch time to allow immediate refresh
    fetchEvermarks();
  }, [fetchEvermarks]);

  return { evermarks, isLoading, error, refresh };
}

export function useEvermarkDetail(id: string) {
  const [evermark, setEvermark] = useState<Evermark | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const contract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.EVERMARK_NFT,
    abi: EVERMARK_NFT_ABI,
  }), []);

  useEffect(() => {
    let isMounted = true;

    const fetchEvermarkDetail = async () => {
      if (!id || !isMounted) return;

      if (id === "new") {
        if (isMounted) {
          setError("Your Evermark is being created. Please check your collection once the transaction is confirmed.");
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        let tokenId;
        try {
          tokenId = BigInt(id);
        } catch (e) {
          if (isMounted) {
            setError(`Invalid Evermark ID format: ${id}`);
            setIsLoading(false);
          }
          return;
        }

        const exists = await readContract({
          contract,
          method: "exists",
          params: [tokenId],
        });

        if (!exists) {
          if (isMounted) {
            setError("Evermark not found");
            setIsLoading(false);
          }
          return;
        }

        // ✅ FIXED: Use correct method name from ABI
        const evermarkData = await readContract({
          contract,
          method: "evermarkData",
          params: [tokenId],
        });

        // ✅ FIXED: Extract fields from evermarkData tuple
        const [title, creator, metadataURI, creationTime, minter, referrer] = evermarkData;

        // Fetch IPFS metadata including image (with proper error handling)
        const { description, sourceUrl, image } = await fetchIPFSMetadata(metadataURI);

        if (isMounted) {
          setEvermark({
            id,
            title,
            author: creator,
            description,
            sourceUrl,
            image,
            metadataURI,
            creator: minter,
            creationTime: Number(creationTime) * 1000,
          });
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error("Error fetching Evermark:", errorMessage);
        if (isMounted) {
          setError(errorMessage || "Failed to load Evermark details");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchEvermarkDetail();

    return () => {
      isMounted = false;
    };
  }, [id, contract]);

  return { evermark, isLoading, error };
}

export function useUserEvermarks(userAddress?: string) {
  const [evermarks, setEvermarks] = useState<Evermark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const contract = useMemo(() => getContract({
    client,
    chain: CHAIN,
    address: CONTRACTS.EVERMARK_NFT,
    abi: EVERMARK_NFT_ABI,
  }), []);

  useEffect(() => {
    let isMounted = true;

    const fetchUserEvermarksOnce = async () => {
      if (!userAddress) {
        console.log('❌ No userAddress provided to useUserEvermarks');
        if (isMounted) {
          setEvermarks([]);
          setIsLoading(false);
          setError(null);
        }
        return;
      }

      console.log('🔍 useUserEvermarks starting fetch for:', userAddress);

      try {
        setIsLoading(true);
        setError(null);

        console.log('📞 Calling totalSupply...');
        const totalSupply = await readContract({
          contract,
          method: "totalSupply",
          params: [],
        });
        
        console.log('✅ Total supply:', totalSupply.toString());
        
        if (Number(totalSupply) === 0) {
          console.log('📭 No tokens minted yet');
          if (isMounted) {
            setEvermarks([]);
            setIsLoading(false);
          }
          return;
        }

        console.log('📞 Calling balanceOf for user...');
        const balance = await readContract({
          contract,
          method: "balanceOf",
          params: [userAddress],
        });
        
        console.log('✅ User balance:', balance.toString());

        if (Number(balance) === 0) {
          console.log('📭 User has no tokens');
          if (isMounted) {
            setEvermarks([]);
            setIsLoading(false);
          }
          return;
        }

        console.log('🔄 Starting to fetch individual tokens...');
        const userTokens: Evermark[] = [];
        
        for (let i = 1; i <= Number(totalSupply) && userTokens.length < Number(balance); i++) {
          if (!isMounted) {
            console.log('🛑 Component unmounted, stopping fetch');
            break;
          }

          try {
            console.log(`🔍 Checking token ${i}...`);
            
            const exists = await readContract({
              contract,
              method: "exists",
              params: [BigInt(i)],
            });
            
            if (!exists) {
              console.log(`❌ Token ${i} does not exist`);
              continue;
            }
            
            const owner = await readContract({
              contract,
              method: "ownerOf",
              params: [BigInt(i)],
            });
            
            if (owner.toLowerCase() !== userAddress.toLowerCase()) {
              console.log(`❌ Token ${i} not owned by user (owned by ${owner})`);
              continue;
            }

            console.log(`✅ Token ${i} is owned by user, fetching metadata...`);

            // ✅ FIXED: Use correct method name from ABI
            const evermarkData = await readContract({
              contract,
              method: "evermarkData",
              params: [BigInt(i)],
            });

            // ✅ FIXED: Extract fields from evermarkData tuple
            const [title, creator, metadataURI, creationTime, minter, referrer] = evermarkData;

            console.log(`📖 Token ${i} metadata:`, { title, creator, metadataURI });

            const { description, sourceUrl, image } = await fetchIPFSMetadata(metadataURI);

            const evermark: Evermark = {
              id: i.toString(),
              title: title || `Evermark #${i}`,
              author: creator || "Unknown",
              description,
              sourceUrl,
              image,
              metadataURI,
              creator: minter,
              creationTime: Number(creationTime) * 1000,
            };

            userTokens.push(evermark);
            console.log(`✅ Added token ${i} to userTokens. Total so far: ${userTokens.length}`);
            
          } catch (tokenError) {
            console.warn(`⚠️ Error fetching token ${i}:`, tokenError);
          }
        }
        
        console.log(`🎉 Final result: Found ${userTokens.length} tokens for user`);
        console.log('📋 User tokens:', userTokens.map(t => ({ id: t.id, title: t.title })));
        
        if (isMounted) {
          console.log('💾 Setting evermarks state with:', userTokens.length, 'items');
          setEvermarks(userTokens);
          setIsLoading(false);
        } else {
          console.log('🛑 Component unmounted, not setting state');
        }

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error("❌ Error in useUserEvermarks:", errorMessage, err);
        if (isMounted) {
          setError(errorMessage);
          setEvermarks([]);
          setIsLoading(false);
        }
      }
    };

    // Always fetch when userAddress changes
    fetchUserEvermarksOnce();

    return () => {
      console.log('🧹 useUserEvermarks cleanup for:', userAddress);
      isMounted = false;
    };
  }, [userAddress, contract]); // Removed dependencies that might cause unnecessary re-runs

  // 🐛 DEBUG: Log state changes
  useEffect(() => {
    console.log('🔄 useUserEvermarks state changed:', {
      userAddress,
      isLoading,
      error,
      evermarksCount: evermarks.length,
      evermarks: evermarks.map(e => ({ id: e.id, title: e.title }))
    });
  }, [userAddress, isLoading, error, evermarks]);

  return { evermarks, isLoading, error };
}