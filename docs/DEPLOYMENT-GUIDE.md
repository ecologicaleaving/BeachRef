# BeachRef Deployment Guide - Vercel

## Overview
This guide explains how to deploy the BeachRef application (frontend + backend) to Vercel with mock data enabled.

## Architecture
- **Frontend**: React app served from `/`
- **Backend API**: Serverless functions at `/api/*`
- **Mock Data**: Enabled by default (no VIS API credentials required)

## Deployment Structure
```
/
├── api/                    # Vercel serverless functions
│   ├── tournaments/
│   │   ├── index.ts       # GET /api/tournaments
│   │   └── [id].ts        # GET /api/tournaments/:id
│   └── health/
│       └── index.ts       # GET /api/health
├── frontend/              # React application
│   └── dist/             # Built frontend files
└── backend/              # Backend source code (used by API routes)
```

## Environment Variables

### Local Development
- `frontend/.env.development`: `VITE_API_URL=http://localhost:3001`
- `backend/.env.development`: `DEMO_MODE=true`

### Production (Vercel)
- `frontend/.env.production`: `VITE_API_URL=/api`
- Set in Vercel Dashboard:
  - `DEMO_MODE=true`
  - `NODE_ENV=production`

## Deployment Steps

### 1. Install Vercel CLI (Optional)
```bash
npm i -g vercel
```

### 2. Deploy via GitHub Integration (Recommended)
1. Push your code to GitHub
2. Import project in Vercel Dashboard
3. Configure:
   - Framework Preset: Other
   - Build Command: `cd frontend && npm install && npm run build`
   - Output Directory: `frontend/dist`
   - Install Command: `cd backend && npm install && cd ../frontend && npm install`

### 3. Deploy via CLI
```bash
vercel --prod
```

### 4. Set Environment Variables in Vercel
1. Go to Project Settings → Environment Variables
2. Add:
   - `DEMO_MODE`: `true`
   - `NODE_ENV`: `production`

## API Endpoints

### Health Check
```
GET https://your-app.vercel.app/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-11-27T10:00:00.000Z",
  "service": "VisConnect API",
  "version": "1.0.0",
  "environment": "production",
  "demoMode": true
}
```

### Get Tournaments
```
GET https://your-app.vercel.app/api/tournaments?page=1&limit=10
```

### Get Tournament Details
```
GET https://your-app.vercel.app/api/tournaments/mock-001
```

## Vercel Configuration Details

### vercel.json
```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist",
  "installCommand": "cd backend && npm install && cd ../frontend && npm install",
  "framework": null,
  "functions": {
    "api/**/*.ts": {
      "runtime": "@vercel/node@3.0.7"
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Mock Data Features
- 6 tournaments with different statuses (ongoing, completed, upcoming)
- Dynamic dates relative to current date
- Sample matches with scores
- No external API dependencies

## Troubleshooting

### API Routes Not Working
- Check Vercel Functions logs
- Verify environment variables are set
- Ensure `api/` folder structure is correct

### CORS Issues
- API routes include CORS headers
- Check browser console for specific errors

### Build Failures
- Check Node.js version compatibility
- Verify all dependencies are installed
- Review build logs in Vercel dashboard

## Future Enhancements

### Phase 2 - Database Integration
- Integrate Supabase for persistent data storage
- Implement authentication with Supabase Auth
- Store tournament and referee data
- Real-time updates with Supabase subscriptions

### Phase 3 - VIS API Integration
- Add VIS API credentials to environment
- Set `DEMO_MODE=false` for production
- Implement caching strategy
- Add webhook support for real-time updates

## Monitoring
- Use Vercel Analytics for performance monitoring
- Check Function logs for API errors
- Monitor deployment status in Vercel dashboard

## Support
- Vercel Documentation: https://vercel.com/docs
- Project Repository: https://github.com/ecologicaleaving/BeachRef
- Create issues for bugs or feature requests