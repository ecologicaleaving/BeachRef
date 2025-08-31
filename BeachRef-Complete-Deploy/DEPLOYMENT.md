# BeachRef WebApp - Complete Deployment Package

## 🚀 Ready-to-Deploy Web Application

This folder contains the **complete production-ready BeachRef web application** exported with Expo.

### Features Included
✅ **Individual Set Scores** - Live set-by-set scoring display  
✅ **Pull-to-Refresh** - Tournament data refresh with filter preservation  
✅ **Referee Dropdown** - Fully functional with proper z-index  
✅ **VIS API Integration** - Complete FIVB VIS API with XML parsing  
✅ **Responsive Design** - Mobile, tablet, and desktop optimized  
✅ **PWA Support** - Progressive Web App capabilities  
✅ **Static Site Generation** - Pre-rendered pages for performance  

## Deployment Options

### 1. Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from this folder
cd BeachRef-Complete-Deploy
vercel --prod
```

### 2. Netlify
- Drag and drop this entire folder to [Netlify Drop](https://app.netlify.com/drop)
- Or connect to Git repository

### 3. Static Hosting
Upload this entire folder to:
- **AWS S3 + CloudFront**
- **Google Cloud Storage**
- **GitHub Pages**
- **Firebase Hosting**

### 4. Local Testing
```bash
# Install serve globally
npm install -g serve

# Serve locally
cd BeachRef-Complete-Deploy
serve . -p 3000
```

## Environment Variables Required

Set these environment variables on your hosting platform:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
EXPO_PUBLIC_VIS_API_BASE_URL=https://www.fivb.org/Vis2009/XmlRequest.asmx
EXPO_PUBLIC_API_TIMEOUT=30000
EXPO_PUBLIC_ENABLE_DEBUG_LOGGING=false
EXPO_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=false
```

## File Structure

```
BeachRef-Complete-Deploy/
├── index.html                    # Main entry point
├── _expo/                        # Expo runtime and bundles
├── assets/                       # Images, fonts, icons
├── *.html                        # Pre-rendered static pages
├── favicon.ico                   # App icon
├── package.json                  # Deployment package info
└── DEPLOYMENT.md                 # This file
```

## Technical Specifications

- **Framework**: Expo + React Native Web
- **React Version**: 19.0.0
- **Bundle Size**: ~4.14 MB (optimized)
- **Routes**: 18 static routes with SSG
- **Browser Support**: Chrome 60+, Firefox 55+, Safari 11+
- **Mobile**: Fully responsive, PWA enabled

## Performance Features

- **Code Splitting**: Automatic bundle splitting
- **Static Generation**: Pre-rendered HTML for SEO
- **Asset Optimization**: Compressed images and fonts
- **Caching**: Service worker for offline support
- **Tree Shaking**: Unused code elimination

## Hosting Requirements

- **Static hosting** (no server required)
- **HTTPS** required for PWA features
- **Single Page Application** routing support
- **Environment variables** support (recommended)

## Support

This deployment package was generated on **August 29, 2025** with all latest features and optimizations.

Ready to deploy! 🏐