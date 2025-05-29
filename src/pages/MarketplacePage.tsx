// MarketplacePage.tsx - Correct Thirdweb v5.100.1 implementation

import * as React from "react";
import { useState } from "react";
import { 
  useActiveAccount, 
  useActiveWalletChain,
  useReadContract,
  useSendTransaction 
} from "thirdweb/react";
import { 
  getContract, 
  NATIVE_TOKEN_ADDRESS 
} from "thirdweb";
import { 
  getAllListings,
  createListing,
  buyFromListing,
  makeOffer,
  cancelListing 
} from "thirdweb/extensions/marketplace";
import { client } from "../lib/thirdweb";
import { CHAIN } from "../lib/contracts";
import PageContainer from "../components/layout/PageContainer";

const MARKETPLACE_CONTRACT_ADDRESS = import.meta.env.VITE_MARKETPLACE_ADDRESS || "";
const EVERMARK_NFT_ADDRESS = import.meta.env.VITE_EVERMARK_NFT_ADDRESS || "";

export function MarketplacePage() {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  const { mutateAsync: sendTransaction } = useSendTransaction();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createListingData, setCreateListingData] = useState({
    tokenId: "",
    price: "",
    quantity: 1,
  });

  // Get marketplace contract
  const contract = getContract({
    client,
    chain: activeChain || CHAIN,
    address: MARKETPLACE_CONTRACT_ADDRESS,
  });

  // Fetch listings using the CORRECT v5 pattern - extension as first parameter
  const { 
    data: allListingsData, 
    isLoading, 
    error,
    refetch: refetchListings 
  } = useReadContract(getAllListings, {
    contract,
    count: 100n,
    start: 0,
  });

  // Process listings data - filter to only EverMark NFTs
  const listings = React.useMemo(() => {
    if (!allListingsData || !Array.isArray(allListingsData)) {
      console.log("No listings data:", allListingsData);
      return [];
    }
    
    console.log("Raw listings from contract:", allListingsData);

    return allListingsData
      .map((listing: any, index: number) => {
        console.log(`Processing listing ${index}:`, listing);
        
        return {
          id: listing.listingId?.toString() || listing.id?.toString() || index.toString(),
          seller: listing.listingCreator || listing.seller || listing.creator || "",
          tokenId: listing.assetContract?.tokenId?.toString() || listing.tokenId?.toString() || "",
          assetContractAddress: listing.assetContract?.assetContract || listing.assetContract || "",
          price: listing.pricePerToken?.toString() || listing.buyoutPrice?.toString() || "0",
          quantity: listing.quantity?.toString() || "1",
          currencyAddress: listing.currency || listing.currencyContract || NATIVE_TOKEN_ADDRESS,
          startTime: listing.startTimestamp || listing.startTimeInSeconds || 0,
          endTime: listing.endTimestamp || listing.endTimeInSeconds || 0,
          asset: {
            name: listing.asset?.name || `EverMark #${listing.tokenId || listing.assetContract?.tokenId || 'Unknown'}`,
            image: listing.asset?.image || "",
            description: listing.asset?.description || "",
          }
        };
      })
      .filter(listing => 
        listing.assetContractAddress.toLowerCase() === EVERMARK_NFT_ADDRESS.toLowerCase()
      ); // Only show EverMark NFT listings
  }, [allListingsData]);

  // Filter user's listings
  const userListings = React.useMemo(() => {
    if (!account?.address) return [];
    return listings.filter(
      listing => listing.seller.toLowerCase() === account.address.toLowerCase()
    );
  }, [listings, account?.address]);

  // Create listing function
  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account?.address) {
      alert("Please connect your wallet");
      return;
    }

    try {
      console.log("Creating listing with data:", createListingData);
      
      const transaction = createListing({
        contract,
        assetContractAddress: EVERMARK_NFT_ADDRESS, // Fixed to EverMark NFTs only
        tokenId: BigInt(createListingData.tokenId),
        quantity: BigInt(createListingData.quantity),
        currencyContractAddress: NATIVE_TOKEN_ADDRESS, // currencyContractAddress instead of currency
        pricePerToken: createListingData.price,
        startTimestamp: new Date(), // Date object, not bigint
        endTimestamp: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000), // Date object, 1 week from now
      });

      console.log("Sending create listing transaction...");
      const result = await sendTransaction(transaction);
      console.log("Transaction result:", result);
      
      setShowCreateForm(false);
      setCreateListingData({
        tokenId: "",
        price: "",
        quantity: 1,
      });
      
      // Refetch listings after a short delay
      setTimeout(() => {
        console.log("Refetching listings...");
        refetchListings();
      }, 3000);
      
      alert("Listing created successfully!");
      
    } catch (error) {
      console.error("Failed to create listing:", error);
      alert(`Failed to create listing: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Buy item function
  const handleBuyItem = async (listingId: string, quantity: number = 1) => {
    if (!account?.address) {
      alert("Please connect your wallet");
      return;
    }

    try {
      console.log("Buying item:", { listingId, quantity });
      
      const transaction = buyFromListing({
        contract,
        listingId: BigInt(listingId),
        quantity: BigInt(quantity),
        recipient: account.address, // recipient instead of buyFor
      });

      console.log("Sending buy transaction...");
      const result = await sendTransaction(transaction);
      console.log("Buy transaction result:", result);
      
      setTimeout(() => {
        console.log("Refetching listings after purchase...");
        refetchListings();
      }, 3000);
      
      alert("Purchase successful!");
      
    } catch (error) {
      console.error("Failed to buy item:", error);
      alert(`Failed to buy item: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Make offer function
  const handleMakeOffer = async (listing: any) => {
    if (!account?.address) {
      alert("Please connect your wallet");
      return;
    }

    const price = prompt("Enter your offer price in ETH (e.g., 0.1):");
    if (!price) return;

    try {
      console.log("Making offer:", { listing, price });
      
      const transaction = makeOffer({
        contract,
        assetContractAddress: listing.assetContractAddress, // assetContractAddress instead of assetContract
        tokenId: BigInt(listing.tokenId),
        quantity: BigInt(1),
        currencyContractAddress: NATIVE_TOKEN_ADDRESS, // currencyContractAddress instead of currency
        totalOffer: price, // totalOffer instead of totalPrice
        offerExpiresAt: new Date(Date.now() + 60 * 60 * 24 * 7 * 1000), // Date object, 1 week
      });

      console.log("Sending offer transaction...");
      const result = await sendTransaction(transaction);
      console.log("Offer transaction result:", result);
      
      alert("Offer made successfully!");
      
    } catch (error) {
      console.error("Failed to make offer:", error);
      alert(`Failed to make offer: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Cancel listing function
  const handleCancelListing = async (listingId: string) => {
    if (!account?.address) {
      alert("Please connect your wallet");
      return;
    }

    try {
      console.log("Cancelling listing:", listingId);
      
      const transaction = cancelListing({
        contract,
        listingId: BigInt(listingId),
      });

      console.log("Sending cancel transaction...");
      const result = await sendTransaction(transaction);
      console.log("Cancel transaction result:", result);
      
      setTimeout(() => {
        console.log("Refetching listings after cancel...");
        refetchListings();
      }, 3000);
      
      alert("Listing cancelled successfully!");
      
    } catch (error) {
      console.error("Failed to cancel listing:", error);
      alert(`Failed to cancel listing: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Debug info
  React.useEffect(() => {
    console.log("EverMark Marketplace Debug Info:");
    console.log("- Marketplace contract:", MARKETPLACE_CONTRACT_ADDRESS);
    console.log("- EverMark NFT contract:", EVERMARK_NFT_ADDRESS);
    console.log("- Active chain:", activeChain?.name || activeChain?.id);
    console.log("- Account:", account?.address);
    console.log("- Loading:", isLoading);
    console.log("- Error:", error);
    console.log("- Raw data:", allListingsData);
    console.log("- Filtered EverMark listings:", listings);
  }, [MARKETPLACE_CONTRACT_ADDRESS, EVERMARK_NFT_ADDRESS, activeChain, account, isLoading, error, allListingsData, listings]);

  // Early return checks
  if (!MARKETPLACE_CONTRACT_ADDRESS) {
    return (
      <PageContainer>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">EverMark Marketplace</h1>
          <p className="text-red-600">Marketplace contract address not configured.</p>
          <p className="text-sm text-gray-600 mt-2">Please set VITE_MARKETPLACE_ADDRESS in your environment variables.</p>
        </div>
      </PageContainer>
    );
  }

  if (!EVERMARK_NFT_ADDRESS) {
    return (
      <PageContainer>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">EverMark Marketplace</h1>
          <p className="text-red-600">EverMark NFT contract address not configured.</p>
          <p className="text-sm text-gray-600 mt-2">Please set VITE_EVERMARK_NFT_ADDRESS in your environment variables.</p>
        </div>
      </PageContainer>
    );
  }

  if (!account?.address) {
    return (
      <PageContainer>
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">EverMark Marketplace</h1>
          <p className="text-gray-600">Please connect your wallet to use the marketplace.</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">EverMark Marketplace</h1>
          <button 
            onClick={() => {
              console.log("Manual refresh clicked");
              refetchListings();
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Refresh
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error instanceof Error ? error.message : String(error)}</p>
            <button 
              onClick={() => {
                console.log("Retry clicked");
                refetchListings();
              }}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Debug Info */}
        <div className="bg-gray-50 border rounded-lg p-4 text-sm">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <p>Marketplace Contract: {MARKETPLACE_CONTRACT_ADDRESS}</p>
          <p>EverMark NFT Contract: {EVERMARK_NFT_ADDRESS}</p>
          <p>Chain: {activeChain?.name || activeChain?.id || 'Unknown'}</p>
          <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
          <p>Raw listings count: {allListingsData?.length || 0}</p>
          <p>EverMark listings count: {listings.length}</p>
        </div>

        {/* Create Listing Button */}
        <div>
          <button 
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            {showCreateForm ? "Cancel" : "List Your EverMark"}
          </button>
        </div>

        {/* Create Listing Form */}
        {showCreateForm && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Create New EverMark Listing</h3>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>NFT Collection:</strong> EverMark NFTs ({EVERMARK_NFT_ADDRESS})
              </p>
              <p className="text-xs text-blue-600 mt-1">
                This marketplace is exclusive to EverMark NFTs from your collection.
              </p>
            </div>
            <form onSubmit={handleCreateListing} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  EverMark Token ID:
                </label>
                <input
                  type="text"
                  value={createListingData.tokenId}
                  onChange={(e) => setCreateListingData({
                    ...createListingData,
                    tokenId: e.target.value
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (ETH):
                </label>
                <input
                  type="text"
                  placeholder="0.1"
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
                Create EverMark Listing
              </button>
            </form>
          </div>
        )}

        {/* Your Listings */}
        {userListings.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Your EverMark Listings ({userListings.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userListings.map((listing) => (
                <div key={listing.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">{listing.asset.name}</h4>
                  {listing.asset.image && (
                    <img 
                      src={listing.asset.image} 
                      alt={listing.asset.name}
                      className="w-full h-48 object-cover rounded-lg mb-3"
                    />
                  )}
                  <p className="text-sm text-gray-600 mb-2">Price: {listing.price} ETH</p>
                  <p className="text-sm text-gray-600 mb-3">Quantity: {listing.quantity}</p>
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
            All EverMark Listings ({listings.length})
          </h2>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading EverMark listings...</p>
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No EverMark listings found. List the first one!</p>
              <p className="text-sm text-gray-500 mt-2">
                Check the debug info above for connection details.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => {
                const isOwnListing = listing.seller?.toLowerCase() === account.address?.toLowerCase();
                return (
                  <div 
                    key={listing.id} 
                    className={`border rounded-lg p-4 ${
                      isOwnListing ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'
                    }`}
                  >
                    <h4 className="font-medium text-gray-900 mb-2">{listing.asset.name}</h4>
                    {listing.asset.image && (
                      <img 
                        src={listing.asset.image} 
                        alt={listing.asset.name}
                        className="w-full h-48 object-cover rounded-lg mb-3"
                      />
                    )}
                    {listing.asset.description && (
                      <p className="text-sm text-gray-600 mb-2">{listing.asset.description}</p>
                    )}
                    <p className="text-sm text-gray-600 mb-2">Price: {listing.price} ETH</p>
                    <p className="text-sm text-gray-600 mb-2">Quantity: {listing.quantity}</p>
                    <p className="text-sm text-gray-600 mb-3">
                      Seller: {listing.seller ? `${listing.seller.slice(0, 6)}...${listing.seller.slice(-4)}` : 'Unknown'}
                    </p>
                    
                    {isOwnListing ? (
                      <p className="text-yellow-700 font-medium text-center">Your Listing</p>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBuyItem(listing.id, 1)}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Buy Now
                        </button>
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