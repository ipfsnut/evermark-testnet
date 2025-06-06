# Evermark Mini - Farcaster Sharing Integration ToDo

## Current Situation

### Project Structure Analysis
- **Main App**: React + TypeScript + Vite setup in root
- **Netlify Functions**: Separate package.json in `netlify/functions/` directory
- **Frontend Dependencies**: 
  - Farcaster Frame SDK (`@farcaster/frame-sdk: ^0.0.53`)
  - Farcaster Frame Wagmi Connector (`@farcaster/frame-wagmi-connector: ^0.0.42`)
  - Supabase client for data persistence
  - React Router for navigation
  - Thirdweb for Web3 functionality
- **Backend Dependencies**: 
  - Netlify Functions runtime
  - Supabase client (older version in functions)
  - Thirdweb (in devDependencies - needs review)

### Current Sharing Implementation
- ✅ Basic ShareButton component with multiple platforms
- ✅ Share tracking via Netlify function (`shares.ts`)
- ✅ Analytics hooks for share data
- ✅ In-memory storage for demo (not persistent)
- ⚠️ API calls to `/api/shares` but function is at `/.netlify/functions/shares`
- ⚠️ No Farcaster Frame integration yet
- ⚠️ No dynamic URL population for Farcaster Mini Apps

## Goals for This Build

### Primary Objectives
1. **Integrate Farcaster's New Dynamic URL Capabilities**
   - Implement Farcaster Frames for rich sharing experience
   - Support Farcaster Mini App URLs
   - Enable dynamic content population in shared links

2. **Fix Current Sharing Stack Issues**
   - Correct API endpoint paths
   - Ensure proper error handling
   - Add persistent storage (Supabase integration)

3. **Enhance User Experience**
   - Interactive Farcaster Frames with buttons
   - Real-time share analytics
   - Better mobile sharing experience

### Technical Implementation Plan

#### Phase 1: Fix Current Issues ⚠️
- [ ] Fix API endpoint mismatch (`/api/shares` → `/.netlify/functions/shares`)
- [ ] Update Supabase version consistency between main app and functions
- [ ] Review and fix package.json dependencies
- [ ] Test current sharing functionality

#### Phase 2: Farcaster Frame Integration 🎯
- [ ] Create Farcaster Frame endpoint (`/.netlify/functions/frames-evermark`)
- [ ] Implement dynamic image generation for frames
- [ ] Add Frame interaction handling (buttons, actions)
- [ ] Integrate with existing share tracking

#### Phase 3: Dynamic URL Enhancement 🔗
- [ ] Implement Farcaster Mini App URL structure
- [ ] Add dynamic meta tag generation for social platforms
- [ ] Create share redirect pages with proper OG tags
- [ ] Add UTM parameter tracking

#### Phase 4: Analytics & Persistence 📊
- [ ] Migrate from in-memory to Supabase storage
- [ ] Enhance share analytics with Farcaster-specific metrics
- [ ] Add real-time share tracking dashboard
- [ ] Implement share performance insights

## Technical Considerations

### Farcaster Integration Challenges
- **Frame Validation**: Ensure frames meet Farcaster's requirements
- **Image Generation**: Dynamic images for frame previews
- **Button Actions**: Handle post vs link actions properly
- **Mini App URLs**: Proper routing for Farcaster Mini App context

### Architecture Decisions Needed
- **Storage**: Supabase vs in-memory for share tracking
- **Image Generation**: Server-side rendering vs static images
- **Caching**: Frame response caching strategy
- **Error Handling**: Graceful fallbacks for failed shares

### Dependencies to Review
```json
// Main app - package.json
"@farcaster/frame-sdk": "^0.0.53",           // ✅ Latest
"@farcaster/frame-wagmi-connector": "^0.0.42", // ✅ Latest
"@supabase/supabase-js": "^2.49.8",          // ✅ Latest

// Functions - netlify/functions/package.json  
"@supabase/supabase-js": "^2.39.0",          // ⚠️ Outdated
"thirdweb": "^5.100.1"                       // ⚠️ In devDependencies
```

## Implementation Strategy

### Step-by-Step Approach
1. **Audit & Fix** - Review current code, fix obvious issues
2. **Plan & Design** - Design Farcaster Frame user flow
3. **Build & Test** - Implement incrementally with testing
4. **Deploy & Monitor** - Deploy with proper monitoring

### Success Metrics
- [ ] Farcaster shares generate interactive frames
- [ ] Share tracking works across all platforms
- [ ] Analytics show Farcaster-specific engagement
- [ ] Mini App URLs work properly in Farcaster context
- [ ] Error rates < 5% for sharing functionality

## Questions to Resolve

### Technical Questions
1. Should we use server-side image generation for frames or pre-generated static images?
2. How do we handle Evermark data fetching in the frame endpoint?
3. What's the best caching strategy for frame responses?
4. Should we migrate all share tracking to Supabase immediately?

### UX Questions  
1. What frame interactions provide the most value to users?
2. How do we handle users who don't have Farcaster?
3. What fallback experience should we provide?
4. How do we track frame engagement vs regular shares?

## Next Steps
1. Review and discuss this plan
2. Fix immediate issues in current sharing implementation
3. Design Farcaster Frame user experience
4. Begin incremental implementation

---

*Last Updated: [Current Date]*
*Status: Planning Phase*
```

Now let's take a closer look at the current ShareButton implementation and identify the specific issues:

```bash
grep -r "/api/shares" src/
```

```bash
grep -r "\.netlify/functions" netlify/