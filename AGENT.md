# AGENT.md - Evermark Mini Testnet

## Commands
- `npm run dev` - Start development server (Vite)
- `npm run build` - Build for production (TypeScript + Vite)
- `npm run lint` - Lint and format with Biome
- `npm run type-check` - TypeScript type checking without emit
- `npm run preview` - Preview production build

## Architecture
- **Frontend**: React 18 + TypeScript + Vite + TailwindCSS
- **State**: React Query + Context providers
- **Blockchain**: Thirdweb SDK + Wagmi + Viem
- **Backend**: Netlify Functions (serverless)
- **Database**: Supabase
- **Social**: Farcaster Frame SDK integration
- **Routing**: React Router DOM v7

## Code Style (Biome)
- **Formatting**: 2 spaces, 120 line width
- **Imports**: Auto-organize imports enabled
- **TypeScript**: Strict mode, no unused locals/parameters
- **Components**: PascalCase, prefer function components
- **Files**: camelCase for utils, PascalCase for components
- **Exports**: Named exports preferred, default for pages/main components
