import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useUserEvermarks } from '../hooks/useEvermarks';
import { 
  BookOpenIcon, 
  PlusIcon, 
  FolderIcon, 
  LockIcon,
  GlobeIcon,
  EditIcon,
  TrashIcon,
  ChevronRightIcon,
  GridIcon,
  ListIcon,
  ShareIcon,
  DownloadIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import PageContainer from '../components/layout/PageContainer';

interface Collection {
  id: string;
  name: string;
  description?: string;
  evermarkIds: string[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface DelegationRecord {
  evermarkId: string;
  amount: string;
  timestamp: Date;
}

const BookshelfPage: React.FC = () => {
  const { address, isConnected } = useWallet();
  const { evermarks } = useUserEvermarks(address);
  
  const [collections, setCollections] = useState<Collection[]>([]);
  const [delegationHistory, setDelegationHistory] = useState<DelegationRecord[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [newCollectionIsPublic, setNewCollectionIsPublic] = useState(false);
  const [editingCollection, setEditingCollection] = useState<string | null>(null);
  
  // Load collections from localStorage (in production, this would be from blockchain/database)
  useEffect(() => {
    if (address) {
      const savedCollections = localStorage.getItem(`collections_${address}`);
      if (savedCollections) {
        setCollections(JSON.parse(savedCollections));
      }
      
      // Load delegation history (mock data for now)
      const mockDelegations: DelegationRecord[] = [
        { evermarkId: '1', amount: '100', timestamp: new Date(Date.now() - 86400000) },
        { evermarkId: '2', amount: '50', timestamp: new Date(Date.now() - 172800000) },
      ];
      setDelegationHistory(mockDelegations);
    }
  }, [address]);
  
  // Save collections to localStorage
  const saveCollections = (updatedCollections: Collection[]) => {
    if (address) {
      localStorage.setItem(`collections_${address}`, JSON.stringify(updatedCollections));
      setCollections(updatedCollections);
    }
  };
  
  const createCollection = () => {
    if (!newCollectionName.trim()) return;
    
    const newCollection: Collection = {
      id: Date.now().toString(),
      name: newCollectionName,
      description: newCollectionDescription,
      evermarkIds: [],
      isPublic: newCollectionIsPublic,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    saveCollections([...collections, newCollection]);
    setNewCollectionName('');
    setNewCollectionDescription('');
    setNewCollectionIsPublic(false);
    setShowCreateModal(false);
  };
  
  const deleteCollection = (collectionId: string) => {
    if (confirm('Are you sure you want to delete this collection?')) {
      saveCollections(collections.filter(c => c.id !== collectionId));
      if (selectedCollection === collectionId) {
        setSelectedCollection(null);
      }
    }
  };
  
  const addToCollection = (collectionId: string, evermarkId: string) => {
    const collection = collections.find(c => c.id === collectionId);
    if (collection && !collection.evermarkIds.includes(evermarkId)) {
      const updated = collections.map(c => 
        c.id === collectionId 
          ? { ...c, evermarkIds: [...c.evermarkIds, evermarkId], updatedAt: new Date() }
          : c
      );
      saveCollections(updated);
    }
  };
  
  const removeFromCollection = (collectionId: string, evermarkId: string) => {
    const updated = collections.map(c => 
      c.id === collectionId 
        ? { ...c, evermarkIds: c.evermarkIds.filter(id => id !== evermarkId), updatedAt: new Date() }
        : c
    );
    saveCollections(updated);
  };
  
  const exportCollection = (collection: Collection) => {
    const data = {
      collection: {
        name: collection.name,
        description: collection.description,
        createdAt: collection.createdAt,
        evermarks: evermarks.filter(e => collection.evermarkIds.includes(e.id))
      }
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${collection.name.replace(/\s+/g, '_')}_collection.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Get supported evermarks from delegation history
  const supportedEvermarkIds = [...new Set(delegationHistory.map(d => d.evermarkId))];
  const supportedEvermarks = evermarks.filter(e => supportedEvermarkIds.includes(e.id));
  
  // Get staked/locked evermarks (mock data - in production from contract)
  const lockedEvermarkIds = ['3', '4']; // Mock staked NFT IDs
  const lockedEvermarks = evermarks.filter(e => lockedEvermarkIds.includes(e.id));
  
  if (!isConnected) {
    return (
      <PageContainer title="My Bookshelf">
        <div className="text-center py-12">
          <BookOpenIcon className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-600">Connect your wallet to view your bookshelf</p>
        </div>
      </PageContainer>
    );
  }
  
  return (
    <PageContainer title="My Bookshelf">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <p className="text-gray-600">Organize your Evermarks into collections</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {viewMode === 'grid' ? <ListIcon className="h-5 w-5" /> : <GridIcon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              New Collection
            </button>
          </div>
        </div>
        
        {/* Collections Grid */}
        <div className={`grid ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-4`}>
          {/* My Collections */}
          {collections.map(collection => (
            <div 
              key={collection.id} 
              className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:border-purple-300 transition-colors ${
                selectedCollection === collection.id ? 'border-purple-500' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <FolderIcon className="h-5 w-5 text-purple-600 mr-2" />
                  <h3 className="font-medium text-gray-900">{collection.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  {collection.isPublic ? (
                    <GlobeIcon className="h-4 w-4 text-green-600" aria-label="Public" />
                  ) : (
                    <LockIcon className="h-4 w-4 text-gray-400" aria-label="Private" />
                  )}
                </div>
              </div>
              
              {collection.description && (
                <p className="text-sm text-gray-600 mb-3">{collection.description}</p>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {collection.evermarkIds.length} items
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportCollection(collection)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    aria-label="Export"
                  >
                    <DownloadIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {/* TODO: Share functionality */}}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    aria-label="Share"
                  >
                    <ShareIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditingCollection(collection.id)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    aria-label="Edit"
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => deleteCollection(collection.id)}
                    className="p-1 text-red-500 hover:text-red-700"
                    aria-label="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {/* Supported Evermarks */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-sm border border-blue-200 p-4">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-blue-100 rounded-lg mr-3">
                <ChevronRightIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Supported</h3>
                <p className="text-sm text-gray-600">From your delegations</p>
              </div>
            </div>
            <div className="text-sm text-gray-700">
              <p className="font-medium">{supportedEvermarks.length} Evermarks</p>
              <Link 
                to="/my-evermarks?tab=supported" 
                className="text-blue-600 hover:text-blue-700 inline-flex items-center mt-2"
              >
                View all
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
          
          {/* Locked In Evermarks */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg shadow-sm border border-amber-200 p-4">
            <div className="flex items-center mb-3">
              <div className="p-2 bg-amber-100 rounded-lg mr-3">
                <LockIcon className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Locked In</h3>
                <p className="text-sm text-gray-600">Staked for rewards</p>
              </div>
            </div>
            <div className="text-sm text-gray-700">
              <p className="font-medium">{lockedEvermarks.length} Evermarks</p>
              <Link 
                to="/my-evermarks?tab=locked" 
                className="text-amber-600 hover:text-amber-700 inline-flex items-center mt-2"
              >
                View all
                <ChevronRightIcon className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>
        </div>
        
        {/* Create Collection Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">Create New Collection</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Collection Name *
                  </label>
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="My Reading List"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newCollectionDescription}
                    onChange={(e) => setNewCollectionDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="A collection of articles about..."
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={newCollectionIsPublic}
                    onChange={(e) => setNewCollectionIsPublic(e.target.checked)}
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPublic" className="ml-2 text-sm text-gray-700">
                    Make this collection public
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewCollectionName('');
                    setNewCollectionDescription('');
                    setNewCollectionIsPublic(false);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createCollection}
                  disabled={!newCollectionName.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Collection
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
};

export default BookshelfPage;