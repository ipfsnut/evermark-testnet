// src/hooks/useModal.ts
import { useState } from 'react';

export interface ModalOptions {
  autoExpandDelegation?: boolean;
  initialExpandedSection?: 'delegation' | 'rewards' | 'history';
}

interface ModalState {
  isOpen: boolean;
  evermarkId: string;
  options: ModalOptions;
}

export const useModal = () => {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    evermarkId: '',
    options: {}
  });

  const openModal = (evermarkId: string, options: ModalOptions = {}) => {
    setModalState({
      isOpen: true,
      evermarkId,
      options
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      evermarkId: '',
      options: {}
    });
  };

  return {
    modalState,
    openModal,
    closeModal
  };
};