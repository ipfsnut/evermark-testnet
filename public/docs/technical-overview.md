# Technical Overview

Evermark Protocol is built on modern blockchain infrastructure to ensure permanence, decentralization, and scalability.

## Core Infrastructure

### Blockchain Layer
- **Base Network**: Layer 2 solution built on Ethereum
- **Low Fees**: Cost-effective transactions for all users
- **Fast Finality**: Quick confirmation times
- **Ethereum Security**: Inherits base layer security guarantees

### Storage Layer  
- **IPFS**: Decentralized storage for Evermark metadata
- **Pinata**: Reliable pinning service for content availability
- **Content Addressing**: Cryptographic hashes ensure data integrity
- **Gateway Access**: Multiple access points for redundancy

## Smart Contract System

### Core Contracts

**EvermarkNFT**
- Creates and manages Evermark NFT tokens
- Stores metadata references to IPFS content
- Handles ownership and transfer functionality

**CardCatalog** 
- Manages EMARK ↔ wEMARK token wrapping
- Implements 7-day unbonding period for unstaking
- Calculates voting power for governance

**Voting**
- Manages weekly voting cycles
- Processes vote delegation and tallying
- Maintains leaderboard rankings

**Rewards**
- Distributes ETH and EMARK rewards
- Applies participation multipliers
- Handles reward claiming

## Content Support

### Supported Content Types
- **Farcaster Casts**: Automatic metadata extraction from cast URLs
- **Web URLs**: Any online content with custom metadata
- **Academic Papers**: DOI support for scholarly content
- **Books**: ISBN support for published works

### Metadata Structure
All Evermarks store comprehensive metadata including:
- Title and description
- Author information  
- Source URL and content type
- Custom fields and tags
- Creation timestamp and creator address

## User Features

### Personal Bookshelf
- **Favorites**: Curate up to 3 favorite Evermarks
- **Reading List**: Maintain up to 10 current reading items
- **Personal Notes**: Add private notes to bookmarked content
- **Quick Access**: Easy browsing of your curated content

### Social Discovery
- **Leaderboards**: View weekly top-voted content
- **Browse Collections**: Explore other users' Evermarks
- **Community Trends**: Discover popular and trending content

## Integration Layers

### Farcaster Integration
- **Native Frames**: Works within Farcaster client apps
- **Cast Processing**: Automatic metadata extraction from Farcaster URLs
- **User Context**: Leverages Farcaster user profiles when available

### Web3 Wallet Support
- **Multiple Wallets**: Support for various wallet providers
- **Farcaster Wallets**: Native integration with Farcaster wallet functionality
- **Desktop Wallets**: Traditional Web3 wallet compatibility

## Frontend Technology

### Modern Web Stack
- **React 18**: Component-based user interface
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Vite**: Fast development and build tooling

### Web3 Integration
- **ThirdWeb v5**: Smart contract interaction layer
- **Wagmi**: Ethereum integration for React
- **Farcaster SDK**: Frame support and social features