import * as React from "react";
import { useState } from "react";
import { useMarketplace, MarketplaceButton } from "../hooks/useMarketplace"; 
import { useActiveAccount } from "thirdweb/react";
import PageContainer from "../components/layout/PageContainer";

const MARKETPLACE_CONTRACT_ADDRESS = import.meta.env.VITE_MARKETPLACE_ADDRESS || "";

export function MarketplacePage() {
  const account = useActiveAccount();
  const address = account?.address;

  // Only initialize marketplace hook if we have an address and contract
  const marketplaceHook = useMarketplace(MARKETPLACE_CONTRACT_ADDRESS);
  
  // Safely destructure with fallbacks
  const {
    listings = [],
    userListings = [],
    isLoading = false,
    error = null,
    createListing,
    buyItem,
    makeOffer,
    cancelListing,
    refetchListings
  } = marketplaceHook || {};

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createListingData, setCreateListingData] = useState({
    assetContractAddress: "",
    tokenId: "",
    price: "",
    currencyAddress: "",
    quantity: 1,
    secondsUntilEnd: 60 * 60 * 24 * 7 // 1 week default
  });

  // Early return if no marketplace contract address
  if (!MARKETPLACE_CONTRACT_ADDRESS) {
    return (
      <PageContainer>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">NFT Marketplace</h1>
          <p className="text-red-600">Marketplace contract address not configured.</p>
          <p className="text-sm text-gray-600 mt-2">Please set VITE_MARKETPLACE_ADDRESS in your environment variables.</p>
        </div>
      </PageContainer>
    );
  }

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createListing) {
      alert("Marketplace not available");
      return;
    }

    try {
      await createListing(createListingData);
      setShowCreateForm(false);
      setCreateListingData({
        assetContractAddress: "",
        tokenId: "",
        price: "",
        currencyAddress: "",
        quantity: 1,
        secondsUntilEnd: 60 * 60 * 24 * 7
      });
      alert("Listing created successfully!");
    } catch (error) {
      console.error("Failed to create listing:", error);
      alert("Failed to create listing");
    }
  };

  const handleBuyItem = async (listingId: string, quantity: number = 1) => {
    if (!buyItem) {
      alert("Marketplace not available");
      return;
    }

    try {
      await buyItem(listingId, quantity);
      alert("Purchase successful!");
    } catch (error) {
      console.error("Failed to buy item:", error);
      alert("Failed to buy item");
    }
  };

  const handleMakeOffer = async (listing: any) => {
    if (!makeOffer) {
      alert("Marketplace not available");
      return;
    }

    const price = prompt("Enter your offer price in ETH (e.g., 0.1):");
    if (!price) return;

    try {
      await makeOffer({
        listingId: listing.id,
        price,
        quantity: 1,
        assetContractAddress: listing.assetContractAddress,
        tokenId: listing.tokenId
      });
      alert("Offer made successfully!");
    } catch (error) {
      console.error("Failed to make offer:", error);
      alert("Failed to make offer");
    }
  };

  const handleCancelListing = async (listingId: string) => {
    if (!cancelListing) {
      alert("Marketplace not available");
      return;
    }

    try {
      await cancelListing(listingId);
      alert("Listing cancelled successfully!");
    } catch (error) {
      console.error("Failed to cancel listing:", error);
      alert("Failed to cancel listing");
    }
  };

  if (!address) {
    return (
      <PageContainer>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">NFT Marketplace</h1>
          <p className="text-gray-600">Please connect your wallet to use the marketplace.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">NFT Marketplace</h1>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {/* Create Listing Button */}
        <div>
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            {showCreateForm ? "Cancel" : "Create New Listing"}
          </button>
        </div>

        {/* Create Listing Form */}
        {showCreateForm && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Create New Listing</h3>
            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NFT Contract Address:
                </label>
                <input
                  type="text"
                  value={createListingData.assetContractAddress}
                  onChange={(e) => setCreateListingData({
                    ...createListingData,
                    assetContractAddress: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Token ID:
                </label>
                <input
                  type="text"
                  value={createListingData.tokenId}
                  onChange={(e) => setCreateListingData({
                    ...createListingData,
                    tokenId: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (ETH):
                </label>
                <input
                  type="text"
                  placeholder="e.g., 0.1"
                  value={createListingData.price}
                  onChange={(e) => setCreateListingData({
                    ...createListingData,
                    price: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity:
                </label>
                <input
                  type="number"
                  min="1"
                  value={createListingData.quantity}
                  onChange={(e) => setCreateListingData({
                    ...createListingData,
                    quantity: parseInt(e.target.value) || 1
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <button 
                type="submit"
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Create Listing
              </button>
            </form>
          </div>
        )}

        {/* Your Listings */}
        {userListings.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Your Listings ({userListings.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userListings.map((listing) => (
                <div key={listing.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">
                    {listing.asset?.name || `Token #${listing.tokenId}`}
                  </h4>
                  {listing.asset?.image && (
                    <img 
                      src={listing.asset.image} 
                      alt={listing.asset.name || 'NFT'}
                      className="w-full h-48 object-cover rounded-lg mb-3"
                    />
                  )}
                  <p className="text-sm text-gray-600 mb-2">
                    Price: {listing.buyoutCurrencyValuePerToken?.displayValue || 'N/A'} ETH
                  </p>
                  <p className="text-sm text-gray-600 mb-3">
                    Quantity: {listing.quantity || 'N/A'}
                  </p>
                  <button
                    onClick={() => handleCancelListing(listing.id)}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Cancel Listing
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Marketplace Listings */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            All Listings ({listings.length})
          </h2>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading listings...</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No listings found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => {
                const isOwnListing = listing.seller?.toLowerCase() === address?.toLowerCase();
                return (
                  <div 
                    key={listing.id} 
                    className={`border rounded-lg p-4 ${
                      isOwnListing ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <h4 className="font-medium text-gray-900 mb-2">
                      {listing.asset?.name || `Token #${listing.tokenId}`}
                    </h4>
                    {listing.asset?.image && (
                      <img 
                        src={listing.asset.image} 
                        alt={listing.asset.name || 'NFT'}
                        className="w-full h-48 object-cover rounded-lg mb-3"
                      />
                    )}
                    {listing.asset?.description && (
                      <p className="text-sm text-gray-600 mb-2">{listing.asset.description}</p>
                    )}
                    <p className="text-sm text-gray-600 mb-2">
                      Price: {listing.buyoutCurrencyValuePerToken?.displayValue || 'N/A'} ETH
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      Quantity: {listing.quantity || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      Seller: {listing.seller ? `${listing.seller.slice(0, 6)}...${listing.seller.slice(-4)}` : 'Unknown'}
                    </p>
                    
                    {isOwnListing ? (
                      <p className="text-yellow-700 font-medium text-center">Your Listing</p>
                    ) : (
                      <div className="flex gap-2">
                        {MarketplaceButton && (
                          <MarketplaceButton
                            contractAddress={MARKETPLACE_CONTRACT_ADDRESS}
                            transaction={() => buyItem && buyItem(listing.id, 1)}
                            onSuccess={() => alert("Purchase successful!")}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                          >
                            Buy Now
                          </MarketplaceButton>
                        )}
                        <button
                          onClick={() => handleMakeOffer(listing)}
                          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Make Offer
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}