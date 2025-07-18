// src/hooks/useModal.tsx - Unified modal management for Evermark interactions
import { useState, useCallback } from 'react';

export interface ModalOptions {
  autoExpandDelegation?: boolean;
  initialExpandedSection?: 'delegation' | 'rewards' | 'history';
}

export interface ModalState {
  isOpen: boolean;
  evermarkId: string;
  options: ModalOptions;
}

interface UseModalResult {
  modalState: ModalState;
  openModal: (evermarkId: string, options?: ModalOptions) => void;
  closeModal: () => void;
  updateOptions: (options: Partial<ModalOptions>) => void;
}

const initialModalState: ModalState = {
  isOpen: false,
  evermarkId: '',
  options: {}
};

export function useModal(): UseModalResult {
  const [modalState, setModalState] = useState<ModalState>(initialModalState);

  const openModal = useCallback((evermarkId: string, options: ModalOptions = {}) => {
    console.log('🔍 Opening modal for Evermark:', evermarkId, 'with options:', options);
    
    setModalState({
      isOpen: true,
      evermarkId,
      options
    });

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }, []);

  const closeModal = useCallback(() => {
    console.log('❌ Closing modal');
    
    setModalState(initialModalState);
    
    // Restore body scroll
    document.body.style.overflow = 'unset';
  }, []);

  const updateOptions = useCallback((newOptions: Partial<ModalOptions>) => {
    setModalState(prev => ({
      ...prev,
      options: {
        ...prev.options,
        ...newOptions
      }
    }));
  }, []);

  return {
    modalState,
    openModal,
    closeModal,
    updateOptions
  };
}

// Hook for managing multiple modal types
export interface MultiModalState {
  evermarkModal: ModalState;
  confirmModal: {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  };
  imageModal: {
    isOpen: boolean;
    src: string;
    alt: string;
  };
}

export function useMultiModal() {
  const [state, setState] = useState<MultiModalState>({
    evermarkModal: initialModalState,
    confirmModal: {
      isOpen: false,
      title: '',
      message: '',
      onConfirm: () => {},
      onCancel: () => {}
    },
    imageModal: {
      isOpen: false,
      src: '',
      alt: ''
    }
  });

  const openEvermarkModal = useCallback((evermarkId: string, options: ModalOptions = {}) => {
    setState(prev => ({
      ...prev,
      evermarkModal: {
        isOpen: true,
        evermarkId,
        options
      }
    }));
    document.body.style.overflow = 'hidden';
  }, []);

  const closeEvermarkModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      evermarkModal: initialModalState
    }));
    document.body.style.overflow = 'unset';
  }, []);

  const openConfirmModal = useCallback((
    title: string, 
    message: string, 
    onConfirm: () => void,
    onCancel: () => void = () => {}
  ) => {
    setState(prev => ({
      ...prev,
      confirmModal: {
        isOpen: true,
        title,
        message,
        onConfirm,
        onCancel
      }
    }));
  }, []);

  const closeConfirmModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      confirmModal: {
        ...prev.confirmModal,
        isOpen: false
      }
    }));
  }, []);

  const openImageModal = useCallback((src: string, alt: string) => {
    setState(prev => ({
      ...prev,
      imageModal: {
        isOpen: true,
        src,
        alt
      }
    }));
    document.body.style.overflow = 'hidden';
  }, []);

  const closeImageModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      imageModal: {
        isOpen: false,
        src: '',
        alt: ''
      }
    }));
    document.body.style.overflow = 'unset';
  }, []);

  const closeAllModals = useCallback(() => {
    setState({
      evermarkModal: initialModalState,
      confirmModal: {
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: () => {}
      },
      imageModal: {
        isOpen: false,
        src: '',
        alt: ''
      }
    });
    document.body.style.overflow = 'unset';
  }, []);

  return {
    state,
    openEvermarkModal,
    closeEvermarkModal,
    openConfirmModal,
    closeConfirmModal,
    openImageModal,
    closeImageModal,
    closeAllModals
  };
}

// Hook for managing loading states in modals
export function useModalLoading() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((key: string, isLoading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: isLoading
    }));
  }, []);

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const clearLoading = useCallback(() => {
    setLoadingStates({});
  }, []);

  return {
    setLoading,
    isLoading,
    clearLoading
  };
}