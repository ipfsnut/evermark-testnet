import * as React from "react";
import { useState } from "react";
import { useMarketplace, MarketplaceButton } from "../hooks/useMarketplace"; 

const MARKETPLACE_CONTRACT_ADDRESS = import.meta.env.VITE_MARKETPLACE_ADDRESS || "";


export function MarketplacePage() {
  const {
    listings,
    userListings,
    isLoading,
    error,
    createListing,
    buyItem,
    makeOffer,
    cancelListing,
    refetchListings,
    address
  } = useMarketplace(MARKETPLACE_CONTRACT_ADDRESS);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createListingData, setCreateListingData] = useState({
    assetContractAddress: "",
    tokenId: "",
    price: "",
    currencyAddress: "",
    quantity: 1,
    secondsUntilEnd: 60 * 60 * 24 * 7 // 1 week default
  });

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
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
    try {
      await buyItem(listingId, quantity);
      alert("Purchase successful!");
    } catch (error) {
      console.error("Failed to buy item:", error);
      alert("Failed to buy item");
    }
  };

  const handleMakeOffer = async (listing: any) => {
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
      <div style={{ padding: "20px" }}>
        <h1>NFT Marketplace</h1>
        <p>Please connect your wallet to use the marketplace.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>NFT Marketplace</h1>
      
      {error && (
        <div style={{ color: "red", marginBottom: "20px" }}>
          Error: {error}
        </div>
      )}

      {/* Create Listing Button */}
      <div style={{ marginBottom: "30px" }}>
        <button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{ 
            padding: "10px 20px", 
            backgroundColor: "#0070f3", 
            color: "white", 
            border: "none", 
            borderRadius: "5px",
            cursor: "pointer"
          }}
        >
          {showCreateForm ? "Cancel" : "Create New Listing"}
        </button>
      </div>

      {/* Create Listing Form */}
      {showCreateForm && (
        <div style={{ 
          border: "1px solid #ccc", 
          padding: "20px", 
          borderRadius: "5px", 
          marginBottom: "30px" 
        }}>
          <h3>Create New Listing</h3>
          <form onSubmit={handleCreateListing}>
            <div style={{ marginBottom: "10px" }}>
              <label>NFT Contract Address:</label>
              <input
                type="text"
                value={createListingData.assetContractAddress}
                onChange={(e) => setCreateListingData({
                  ...createListingData,
                  assetContractAddress: e.target.value
                })}
                style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                required
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label>Token ID:</label>
              <input
                type="text"
                value={createListingData.tokenId}
                onChange={(e) => setCreateListingData({
                  ...createListingData,
                  tokenId: e.target.value
                })}
                style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                required
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label>Price (ETH):</label>
              <input
                type="text"
                placeholder="e.g., 0.1"
                value={createListingData.price}
                onChange={(e) => setCreateListingData({
                  ...createListingData,
                  price: e.target.value
                })}
                style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                required
              />
            </div>
            <div style={{ marginBottom: "10px" }}>
              <label>Quantity:</label>
              <input
                type="number"
                min="1"
                value={createListingData.quantity}
                onChange={(e) => setCreateListingData({
                  ...createListingData,
                  quantity: parseInt(e.target.value)
                })}
                style={{ width: "100%", padding: "8px", marginTop: "5px" }}
              />
            </div>
            <button 
              type="submit"
              style={{ 
                padding: "10px 20px", 
                backgroundColor: "#28a745", 
                color: "white", 
                border: "none", 
                borderRadius: "5px",
                cursor: "pointer"
              }}
            >
              Create Listing
            </button>
          </form>
        </div>
      )}

      {/* Your Listings */}
      {userListings.length > 0 && (
        <div style={{ marginBottom: "30px" }}>
          <h2>Your Listings ({userListings.length})</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
            {userListings.map((listing) => (
              <div key={listing.id} style={{ 
                border: "1px solid #ddd", 
                padding: "15px", 
                borderRadius: "5px",
                backgroundColor: "#f9f9f9"
              }}>
                <h4>{listing.asset.name || `Token #${listing.tokenId}`}</h4>
                {listing.asset.image && (
                  <img 
                    src={listing.asset.image} 
                    alt={listing.asset.name}
                    style={{ width: "100%", height: "200px", objectFit: "cover", marginBottom: "10px" }}
                  />
                )}
                <p>Price: {listing.buyoutCurrencyValuePerToken.displayValue} ETH</p>
                <p>Quantity: {listing.quantity}</p>
                <p>Listing ID: {listing.id}</p>
                <button
                  onClick={() => handleCancelListing(listing.id)}
                  style={{ 
                    padding: "8px 16px", 
                    backgroundColor: "#dc3545", 
                    color: "white", 
                    border: "none", 
                    borderRadius: "3px",
                    cursor: "pointer"
                  }}
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
        <h2>All Listings ({listings.length})</h2>
        {isLoading ? (
          <p>Loading listings...</p>
        ) : listings.length === 0 ? (
          <p>No listings found.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
            {listings.map((listing) => {
              const isOwnListing = listing.seller.toLowerCase() === address?.toLowerCase();
              return (
                <div key={listing.id} style={{ 
                  border: "1px solid #ddd", 
                  padding: "15px", 
                  borderRadius: "5px",
                  backgroundColor: isOwnListing ? "#fff3cd" : "white"
                }}>
                  <h4>{listing.asset.name || `Token #${listing.tokenId}`}</h4>
                  {listing.asset.image && (
                    <img 
                      src={listing.asset.image} 
                      alt={listing.asset.name}
                      style={{ width: "100%", height: "200px", objectFit: "cover", marginBottom: "10px" }}
                    />
                  )}
                  <p>{listing.asset.description}</p>
                  <p>Price: {listing.buyoutCurrencyValuePerToken.displayValue} ETH</p>
                  <p>Quantity: {listing.quantity}</p>
                  <p>Seller: {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</p>
                  <p>Listing ID: {listing.id}</p>
                  
                  {isOwnListing ? (
                    <p style={{ color: "#856404", fontWeight: "bold" }}>Your Listing</p>
                  ) : (
                    <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                      <MarketplaceButton
                        contractAddress={MARKETPLACE_CONTRACT_ADDRESS}
                        transaction={() => buyItem(listing.id, 1)}
                        onSuccess={() => alert("Purchase successful!")}
                        style={{ 
                          padding: "8px 16px", 
                          backgroundColor: "#28a745", 
                          color: "white", 
                          border: "none", 
                          borderRadius: "3px",
                          cursor: "pointer"
                        }}
                      >
                        Buy Now
                      </MarketplaceButton>
                      <button
                        onClick={() => handleMakeOffer(listing)}
                        style={{ 
                          padding: "8px 16px", 
                          backgroundColor: "#007bff", 
                          color: "white", 
                          border: "none", 
                          borderRadius: "3px",
                          cursor: "pointer"
                        }}
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
  );
}