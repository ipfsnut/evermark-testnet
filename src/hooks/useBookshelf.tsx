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

const MAX_FAVORITES = 3;
const MAX_CURRENT_READING = 10;

export function useBookshelf(userAddress?: string) {
  const [bookshelfData, setBookshelfData] = useState<BookshelfData>({
    favorites: [],
    currentReading: []
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load bookshelf data from localStorage
  useEffect(() => {
    console.log('📚 useBookshelf: Loading data for address:', userAddress);
    
    if (!userAddress) {
      console.log('📚 useBookshelf: No user address, skipping load');
      setIsLoading(false);
      return;
    }

    try {
      const storageKey = `bookshelf_${userAddress}`;
      console.log('📚 useBookshelf: Loading from storage key:', storageKey);
      
      const savedData = localStorage.getItem(storageKey);
      console.log('📚 useBookshelf: Raw saved data:', savedData);
      
      if (savedData) {
        const parsed = JSON.parse(savedData);
        console.log('📚 useBookshelf: Parsed data:', parsed);
        
        // Convert date strings back to Date objects
        const processedData = {
          favorites: (parsed.favorites || []).map((item: any) => ({
            ...item,
            addedAt: new Date(item.addedAt)
          })),
          currentReading: (parsed.currentReading || []).map((item: any) => ({
            ...item,
            addedAt: new Date(item.addedAt)
          }))
        };
        
        console.log('📚 useBookshelf: Processed data:', processedData);
        console.log('📚 useBookshelf: Favorites count:', processedData.favorites.length);
        console.log('📚 useBookshelf: Current reading count:', processedData.currentReading.length);
        
        setBookshelfData(processedData);
      } else {
        console.log('📚 useBookshelf: No saved data found, using empty bookshelf');
        setBookshelfData({
          favorites: [],
          currentReading: []
        });
      }
    } catch (error) {
      console.error('📚 useBookshelf: Error loading bookshelf data:', error);
      // Reset to empty state on error
      setBookshelfData({
        favorites: [],
        currentReading: []
      });
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  // Save bookshelf data to localStorage
  const saveBookshelfData = useCallback((data: BookshelfData) => {
    if (!userAddress) {
      console.log('📚 useBookshelf: Cannot save - no user address');
      return;
    }
    
    try {
      const storageKey = `bookshelf_${userAddress}`;
      const dataToSave = JSON.stringify(data);
      
      console.log('📚 useBookshelf: Saving to storage key:', storageKey);
      console.log('📚 useBookshelf: Data to save:', dataToSave);
      
      localStorage.setItem(storageKey, dataToSave);
      setBookshelfData(data);
      
      console.log('📚 useBookshelf: Successfully saved bookshelf data');
      console.log('📚 useBookshelf: New favorites count:', data.favorites.length);
      console.log('📚 useBookshelf: New current reading count:', data.currentReading.length);
    } catch (error) {
      console.error('📚 useBookshelf: Error saving bookshelf data:', error);
    }
  }, [userAddress]);

  // Add to favorites
  const addToFavorites = useCallback((evermarkId: string, notes?: string) => {
    console.log('📚 useBookshelf: Adding to favorites:', evermarkId);
    
    if (!userAddress) {
      console.log('📚 useBookshelf: Cannot add to favorites - no user address');
      return { success: false, error: 'No user address' };
    }

    const currentFavorites = bookshelfData.favorites;
    console.log('📚 useBookshelf: Current favorites:', currentFavorites);
    
    // Check if already in favorites
    if (currentFavorites.some(item => item.evermarkId === evermarkId)) {
      console.log('📚 useBookshelf: Already in favorites');
      return { success: false, error: 'Already in favorites' };
    }

    // Check limit
    if (currentFavorites.length >= MAX_FAVORITES) {
      console.log('📚 useBookshelf: Favorites limit reached');
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

    console.log('📚 useBookshelf: Creating new favorite item:', newItem);

    const newData = {
      favorites: [...currentFavorites, newItem],
      currentReading: newCurrentReading
    };

    console.log('📚 useBookshelf: New bookshelf data:', newData);
    saveBookshelfData(newData);
    
    return { success: true };
  }, [bookshelfData, userAddress, saveBookshelfData]);

  // Add to current reading
  const addToCurrentReading = useCallback((evermarkId: string, notes?: string) => {
    console.log('📚 useBookshelf: Adding to current reading:', evermarkId);
    
    if (!userAddress) {
      console.log('📚 useBookshelf: Cannot add to current reading - no user address');
      return { success: false, error: 'No user address' };
    }

    const currentReading = bookshelfData.currentReading;
    console.log('📚 useBookshelf: Current reading list:', currentReading);
    
    // Check if already in current reading
    if (currentReading.some(item => item.evermarkId === evermarkId)) {
      console.log('📚 useBookshelf: Already in current reading');
      return { success: false, error: 'Already in current reading' };
    }

    // Check limit
    if (currentReading.length >= MAX_CURRENT_READING) {
      console.log('📚 useBookshelf: Current reading limit reached');
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

    console.log('📚 useBookshelf: Creating new current reading item:', newItem);

    const newData = {
      favorites: newFavorites,
      currentReading: [...currentReading, newItem]
    };

    console.log('📚 useBookshelf: New bookshelf data:', newData);
    saveBookshelfData(newData);
    
    return { success: true };
  }, [bookshelfData, userAddress, saveBookshelfData]);

  // Remove from bookshelf
  const removeFromBookshelf = useCallback((evermarkId: string) => {
    console.log('📚 useBookshelf: Removing from bookshelf:', evermarkId);
    
    if (!userAddress) {
      console.log('📚 useBookshelf: Cannot remove - no user address');
      return;
    }

    const newData = {
      favorites: bookshelfData.favorites.filter(item => item.evermarkId !== evermarkId),
      currentReading: bookshelfData.currentReading.filter(item => item.evermarkId !== evermarkId)
    };

    console.log('📚 useBookshelf: After removal:', newData);
    saveBookshelfData(newData);
  }, [bookshelfData, userAddress, saveBookshelfData]);

  // Update notes
  const updateNotes = useCallback((evermarkId: string, notes: string) => {
    console.log('📚 useBookshelf: Updating notes for:', evermarkId, 'Notes:', notes);
    
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
    
    const status = {
      isFavorite: !!inFavorites,
      isCurrentReading: !!inCurrentReading,
      item: inFavorites || inCurrentReading || null
    };
    
    // Only log if the item is actually in the bookshelf to avoid spam
    if (status.isFavorite || status.isCurrentReading) {
      console.log('📚 useBookshelf: Status for', evermarkId, ':', status);
    }
    
    return status;
  }, [bookshelfData]);

  // Get statistics
  const getStats = useCallback(() => {
    const stats = {
      totalFavorites: bookshelfData.favorites.length,
      totalCurrentReading: bookshelfData.currentReading.length,
      maxFavorites: MAX_FAVORITES,
      maxCurrentReading: MAX_CURRENT_READING,
      canAddFavorite: bookshelfData.favorites.length < MAX_FAVORITES,
      canAddCurrentReading: bookshelfData.currentReading.length < MAX_CURRENT_READING
    };
    
    console.log('📚 useBookshelf: Current stats:', stats);
    return stats;
  }, [bookshelfData]);

  // Debug log on every render
  console.log('📚 useBookshelf render:', {
    userAddress,
    isLoading,
    favoritesCount: bookshelfData.favorites.length,
    currentReadingCount: bookshelfData.currentReading.length,
    bookshelfData
  });

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