// src/hooks/useBookshelf.ts
import { useState, useEffect, useCallback } from 'react';

export interface BookshelfItem {
  evermarkId: string;
  category: 'favorite' | 'currentReading';
  addedAt: Date;
  notes?: string;
}

export interface BookshelfData {
  favorites: BookshelfItem[];
  currentReading: BookshelfItem[];
}

const MAX_FAVORITES = 6;
const MAX_CURRENT_READING = 4;

export function useBookshelf(userAddress?: string) {
  const [bookshelfData, setBookshelfData] = useState<BookshelfData>({
    favorites: [],
    currentReading: []
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load bookshelf data from localStorage
  useEffect(() => {
    if (!userAddress) {
      setIsLoading(false);
      return;
    }

    try {
      const savedData = localStorage.getItem(`bookshelf_${userAddress}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        // Convert date strings back to Date objects
        const processedData = {
          favorites: parsed.favorites?.map((item: any) => ({
            ...item,
            addedAt: new Date(item.addedAt)
          })) || [],
          currentReading: parsed.currentReading?.map((item: any) => ({
            ...item,
            addedAt: new Date(item.addedAt)
          })) || []
        };
        setBookshelfData(processedData);
      }
    } catch (error) {
      console.error('Error loading bookshelf data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  // Save bookshelf data to localStorage
  const saveBookshelfData = useCallback((data: BookshelfData) => {
    if (!userAddress) return;
    
    try {
      localStorage.setItem(`bookshelf_${userAddress}`, JSON.stringify(data));
      setBookshelfData(data);
    } catch (error) {
      console.error('Error saving bookshelf data:', error);
    }
  }, [userAddress]);

  // Add to favorites
  const addToFavorites = useCallback((evermarkId: string, notes?: string) => {
    if (!userAddress) return { success: false, error: 'No user address' };

    const currentFavorites = bookshelfData.favorites;
    
    // Check if already in favorites
    if (currentFavorites.some(item => item.evermarkId === evermarkId)) {
      return { success: false, error: 'Already in favorites' };
    }

    // Check limit
    if (currentFavorites.length >= MAX_FAVORITES) {
      return { success: false, error: `Maximum ${MAX_FAVORITES} favorites allowed` };
    }

    // Remove from current reading if it's there
    const newCurrentReading = bookshelfData.currentReading.filter(
      item => item.evermarkId !== evermarkId
    );

    const newItem: BookshelfItem = {
      evermarkId,
      category: 'favorite',
      addedAt: new Date(),
      notes
    };

    const newData = {
      favorites: [...currentFavorites, newItem],
      currentReading: newCurrentReading
    };

    saveBookshelfData(newData);
    return { success: true };
  }, [bookshelfData, userAddress, saveBookshelfData]);

  // Add to current reading
  const addToCurrentReading = useCallback((evermarkId: string, notes?: string) => {
    if (!userAddress) return { success: false, error: 'No user address' };

    const currentReading = bookshelfData.currentReading;
    
    // Check if already in current reading
    if (currentReading.some(item => item.evermarkId === evermarkId)) {
      return { success: false, error: 'Already in current reading' };
    }

    // Check limit
    if (currentReading.length >= MAX_CURRENT_READING) {
      return { success: false, error: `Maximum ${MAX_CURRENT_READING} current reading allowed` };
    }

    // Remove from favorites if it's there
    const newFavorites = bookshelfData.favorites.filter(
      item => item.evermarkId !== evermarkId
    );

    const newItem: BookshelfItem = {
      evermarkId,
      category: 'currentReading',
      addedAt: new Date(),
      notes
    };

    const newData = {
      favorites: newFavorites,
      currentReading: [...currentReading, newItem]
    };

    saveBookshelfData(newData);
    return { success: true };
  }, [bookshelfData, userAddress, saveBookshelfData]);

  // Remove from bookshelf
  const removeFromBookshelf = useCallback((evermarkId: string) => {
    if (!userAddress) return;

    const newData = {
      favorites: bookshelfData.favorites.filter(item => item.evermarkId !== evermarkId),
      currentReading: bookshelfData.currentReading.filter(item => item.evermarkId !== evermarkId)
    };

    saveBookshelfData(newData);
  }, [bookshelfData, userAddress, saveBookshelfData]);

  // Update notes
  const updateNotes = useCallback((evermarkId: string, notes: string) => {
    if (!userAddress) return;

    const updateItems = (items: BookshelfItem[]) =>
      items.map(item => 
        item.evermarkId === evermarkId 
          ? { ...item, notes } 
          : item
      );

    const newData = {
      favorites: updateItems(bookshelfData.favorites),
      currentReading: updateItems(bookshelfData.currentReading)
    };

    saveBookshelfData(newData);
  }, [bookshelfData, userAddress, saveBookshelfData]);

  // Check if evermark is in bookshelf
  const getBookshelfStatus = useCallback((evermarkId: string) => {
    const inFavorites = bookshelfData.favorites.find(item => item.evermarkId === evermarkId);
    const inCurrentReading = bookshelfData.currentReading.find(item => item.evermarkId === evermarkId);
    
    return {
      isFavorite: !!inFavorites,
      isCurrentReading: !!inCurrentReading,
      item: inFavorites || inCurrentReading || null
    };
  }, [bookshelfData]);

  // Get statistics
  const getStats = useCallback(() => ({
    totalFavorites: bookshelfData.favorites.length,
    totalCurrentReading: bookshelfData.currentReading.length,
    maxFavorites: MAX_FAVORITES,
    maxCurrentReading: MAX_CURRENT_READING,
    canAddFavorite: bookshelfData.favorites.length < MAX_FAVORITES,
    canAddCurrentReading: bookshelfData.currentReading.length < MAX_CURRENT_READING
  }), [bookshelfData]);

  return {
    bookshelfData,
    isLoading,
    addToFavorites,
    addToCurrentReading,
    removeFromBookshelf,
    updateNotes,
    getBookshelfStatus,
    getStats
  };
}