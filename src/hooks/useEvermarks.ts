// src/hooks/useEvermarks.ts - ✅ SIMPLIFIED using core utilities
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useReadContract } from "thirdweb/react";
import { readContract } from "thirdweb";
import { useContracts } from './core/useContracts';
import { useMetadataUtils } from './core/useMetadataUtils';

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

export function useEvermarks() {
  const [evermarks, setEvermarks] = useState<Evermark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  // ✅ Use core infrastructure
  const { evermarkNFT } = useContracts();
  const { fetchEvermarkDataBatch } = useMetadataUtils();

  // ✅ Simplified fetch function using core utilities
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
      
      // ✅ FIXED: Use correct ThirdWeb v5 syntax
      const totalSupply = await readContract({
        contract: evermarkNFT,
        method: "function totalSupply() view returns (uint256)",
        params: [],
      });
      
      if (Number(totalSupply) === 0) {
        setEvermarks([]);
        setIsLoading(false);
        return;
      }
      
      // Get recent token IDs (last 10)
      const startId = Number(totalSupply);
      const endId = Math.max(1, startId - 10);
      const tokenIds = Array.from(
        { length: startId - endId + 1 }, 
        (_, i) => BigInt(startId - i)
      );
      
      // ✅ Use core batch fetching with concurrency control
      const evermarkData = await fetchEvermarkDataBatch(tokenIds, 3);
      
      // Convert to Evermark interface, filtering out nulls
      const fetchedEvermarks: Evermark[] = evermarkData
        .filter(data => data !== null)
        .map(data => ({
          id: data!.id,
          title: data!.title,
          author: data!.author,
          description: data!.description,
          sourceUrl: data!.sourceUrl,
          image: data!.image,
          metadataURI: data!.metadataURI,
          creator: data!.creator,
          creationTime: data!.creationTime,
        }));
      
      setEvermarks(fetchedEvermarks);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error("Error fetching evermarks:", errorMessage);
      setError(errorMessage || "Failed to load evermarks");
    } finally {
      setIsLoading(false);
    }
  }, [evermarkNFT, fetchEvermarkDataBatch, lastFetch, evermarks.length]);

  // Only fetch once on mount
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

  // ✅ Use core infrastructure
  const { fetchEvermarkData } = useMetadataUtils();

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

        // ✅ Use core utility for fetching
        const evermarkData = await fetchEvermarkData(tokenId);

        if (!evermarkData) {
          if (isMounted) {
            setError("Evermark not found");
            setIsLoading(false);
          }
          return;
        }

        if (isMounted) {
          setEvermark({
            id: evermarkData.id,
            title: evermarkData.title,
            author: evermarkData.author,
            description: evermarkData.description,
            sourceUrl: evermarkData.sourceUrl,
            image: evermarkData.image,
            metadataURI: evermarkData.metadataURI,
            creator: evermarkData.creator,
            creationTime: evermarkData.creationTime,
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
  }, [id, fetchEvermarkData]);

  return { evermark, isLoading, error };
}

export function useUserEvermarks(userAddress?: string) {
  const [evermarks, setEvermarks] = useState<Evermark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Use core infrastructure
  const { evermarkNFT } = useContracts();
  const { fetchEvermarkData } = useMetadataUtils();

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
        // ✅ FIXED: Use correct ThirdWeb v5 syntax
        const totalSupply = await readContract({
          contract: evermarkNFT,
          method: "function totalSupply() view returns (uint256)",
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
        // ✅ FIXED: Use correct ThirdWeb v5 syntax
        const balance = await readContract({
          contract: evermarkNFT,
          method: "function balanceOf(address) view returns (uint256)",
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
            
            // ✅ FIXED: Use correct ThirdWeb v5 syntax
            const exists = await readContract({
              contract: evermarkNFT,
              method: "function exists(uint256) view returns (bool)",
              params: [BigInt(i)],
            });
            
            if (!exists) {
              console.log(`❌ Token ${i} does not exist`);
              continue;
            }
            
            // ✅ FIXED: Use correct ThirdWeb v5 syntax
            const owner = await readContract({
              contract: evermarkNFT,
              method: "function ownerOf(uint256) view returns (address)",
              params: [BigInt(i)],
            });
            
            if (owner.toLowerCase() !== userAddress.toLowerCase()) {
              console.log(`❌ Token ${i} not owned by user (owned by ${owner})`);
              continue;
            }

            console.log(`✅ Token ${i} is owned by user, fetching metadata...`);

            // ✅ Use core utility for fetching complete data
            const evermarkData = await fetchEvermarkData(BigInt(i));

            if (evermarkData) {
              const evermark: Evermark = {
                id: evermarkData.id,
                title: evermarkData.title,
                author: evermarkData.author,
                description: evermarkData.description,
                sourceUrl: evermarkData.sourceUrl,
                image: evermarkData.image,
                metadataURI: evermarkData.metadataURI,
                creator: evermarkData.creator,
                creationTime: evermarkData.creationTime,
              };

              userTokens.push(evermark);
              console.log(`✅ Added token ${i} to userTokens. Total so far: ${userTokens.length}`);
            }
            
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
  }, [userAddress, evermarkNFT, fetchEvermarkData]);

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