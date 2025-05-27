// src/hooks/useMultiWalletEvermarks.ts
import { useState, useEffect, useMemo } from 'react';
import { useUserEvermarks } from './useEvermarks';
import { useWalletLinking } from './useWalletLinking';

export interface WalletEvermarkCollection {
  walletAddress: string;
  walletLabel: string;
  walletType: 'connected' | 'farcaster-verified' | 'manually-added';
  evermarks: any[];
  isLoading: boolean;
  error: string | null;
}

export interface AggregatedEvermarks {
  allEvermarks: any[];
  walletCollections: WalletEvermarkCollection[];
  totalCount: number;
  isLoading: boolean;
  hasErrors: boolean;
  errors: string[];
}

// Custom hook for each wallet's evermarks
function useWalletEvermarks(address: string, label: string, type: string) {
  const { evermarks, isLoading, error } = useUserEvermarks(address);
  
  return useMemo((): WalletEvermarkCollection => ({
    walletAddress: address,
    walletLabel: label,
    walletType: type as any,
    evermarks: evermarks.map(evermark => ({
      ...evermark,
      // Add wallet context to each evermark
      sourceWallet: address,
      sourceWalletLabel: label,
      sourceWalletType: type,
    })),
    isLoading,
    error,
  }), [address, label, type, evermarks, isLoading, error]);
}

export function useMultiWalletEvermarks() {
  const { linkedWallets, isLoading: isLoadingWallets, getWalletDisplayInfo } = useWalletLinking();
  const [refreshKey, setRefreshKey] = useState(0);

  // Create hooks for each wallet (React hooks rules require this to be deterministic)
  // We'll use a maximum reasonable number of wallets
  const maxWallets = 10;
  const walletHooks = Array.from({ length: maxWallets }, (_, index) => {
    const wallet = linkedWallets[index];
    const displayInfo = wallet ? getWalletDisplayInfo(wallet.address) : null;
    
    return useWalletEvermarks(
      wallet?.address || `dummy-${index}`,
      displayInfo?.label || `Wallet ${index}`,
      wallet?.type || 'connected'
    );
  });

  // Filter out dummy wallets and aggregate results
  const aggregatedData = useMemo((): AggregatedEvermarks => {
    if (isLoadingWallets) {
      return {
        allEvermarks: [],
        walletCollections: [],
        totalCount: 0,
        isLoading: true,
        hasErrors: false,
        errors: [],
      };
    }

    // Get active wallet collections (not dummy ones)
    const activeCollections = walletHooks
      .slice(0, linkedWallets.length)
      .filter((_, index) => linkedWallets[index]); // Only include real wallets

    // Aggregate all evermarks
    const allEvermarks = activeCollections
      .flatMap(collection => collection.evermarks)
      .sort((a, b) => b.creationTime - a.creationTime); // Sort by creation time, newest first

    // Remove duplicates based on ID (in case same NFT appears in multiple wallets)
    const uniqueEvermarks = allEvermarks.filter((evermark, index, array) => 
      array.findIndex(e => e.id === evermark.id) === index
    );

    // Collect errors
    const errors = activeCollections
      .filter(collection => collection.error)
      .map(collection => `${collection.walletLabel}: ${collection.error}`);

    const isLoading = activeCollections.some(collection => collection.isLoading);

    return {
      allEvermarks: uniqueEvermarks,
      walletCollections: activeCollections,
      totalCount: uniqueEvermarks.length,
      isLoading,
      hasErrors: errors.length > 0,
      errors,
    };
  }, [linkedWallets, walletHooks, isLoadingWallets, refreshKey]);

  // Group evermarks by various criteria
  const groupByWallet = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    
    aggregatedData.walletCollections.forEach(collection => {
      if (collection.evermarks.length > 0) {
        grouped[collection.walletAddress] = collection.evermarks;
      }
    });
    
    return grouped;
  }, [aggregatedData.walletCollections]);

  const groupByCreator = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    
    aggregatedData.allEvermarks.forEach(evermark => {
      const creator = evermark.creator || 'Unknown';
      if (!grouped[creator]) {
        grouped[creator] = [];
      }
      grouped[creator].push(evermark);
    });
    
    return grouped;
  }, [aggregatedData.allEvermarks]);

  const groupByTimeframe = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;
    
    const grouped = {
      today: [] as any[],
      thisWeek: [] as any[],
      thisMonth: [] as any[],
      older: [] as any[],
    };
    
    aggregatedData.allEvermarks.forEach(evermark => {
      const age = now - evermark.creationTime;
      
      if (age < oneDay) {
        grouped.today.push(evermark);
      } else if (age < oneWeek) {
        grouped.thisWeek.push(evermark);
      } else if (age < oneMonth) {
        grouped.thisMonth.push(evermark);
      } else {
        grouped.older.push(evermark);
      }
    });
    
    return grouped;
  }, [aggregatedData.allEvermarks]);

  // Statistics
  const statistics = useMemo(() => {
    const walletStats = aggregatedData.walletCollections.map(collection => ({
      walletAddress: collection.walletAddress,
      walletLabel: collection.walletLabel,
      count: collection.evermarks.length,
      hasError: !!collection.error,
    }));

    const creatorStats = Object.entries(groupByCreator).map(([creator, evermarks]) => ({
      creator,
      count: evermarks.length,
      isYou: aggregatedData.walletCollections.some(collection => 
        collection.walletAddress.toLowerCase() === creator.toLowerCase()
      ),
    }));

    return {
      totalWallets: linkedWallets.length,
      walletsWithContent: walletStats.filter(w => w.count > 0).length,
      totalEvermarks: aggregatedData.totalCount,
      uniqueCreators: creatorStats.length,
      walletStats,
      creatorStats: creatorStats.sort((a, b) => b.count - a.count),
    };
  }, [aggregatedData, groupByCreator, linkedWallets.length]);

  // Search and filter functions
  const searchEvermarks = (query: string) => {
    if (!query.trim()) return aggregatedData.allEvermarks;
    
    const lowercaseQuery = query.toLowerCase();
    return aggregatedData.allEvermarks.filter(evermark =>
      evermark.title?.toLowerCase().includes(lowercaseQuery) ||
      evermark.author?.toLowerCase().includes(lowercaseQuery) ||
      evermark.description?.toLowerCase().includes(lowercaseQuery)
    );
  };

  const filterEvermarksByWallet = (walletAddress: string) => {
    return aggregatedData.allEvermarks.filter(evermark => 
      evermark.sourceWallet?.toLowerCase() === walletAddress.toLowerCase()
    );
  };

  const filterEvermarksByCreator = (creatorAddress: string) => {
    return aggregatedData.allEvermarks.filter(evermark => 
      evermark.creator?.toLowerCase() === creatorAddress.toLowerCase()
    );
  };

  // Refresh function
  const refresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return {
    // Core data
    ...aggregatedData,
    
    // Grouped data
    groupByWallet,
    groupByCreator,
    groupByTimeframe,
    
    // Statistics
    statistics,
    
    // Utility functions
    searchEvermarks,
    filterEvermarksByWallet,
    filterEvermarksByCreator,
    refresh,
    
    // Convenience getters
    getWalletCollection: (address: string) => 
      aggregatedData.walletCollections.find(c => 
        c.walletAddress.toLowerCase() === address.toLowerCase()
      ),
    
    hasMultipleWallets: linkedWallets.length > 1,
    isEmpty: aggregatedData.totalCount === 0,
    isFullyLoaded: !aggregatedData.isLoading && linkedWallets.length > 0,
  };
}