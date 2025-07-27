# VisConnect

A professional web application for viewing and analyzing FIVB beach volleyball tournament data through the VIS API.

## Project Structure

```
├── frontend/          # React + TypeScript frontend
├── backend/           # Node.js + Express backend
├── docs/             # Project documentation
├── docker-compose.yml # Development environment
├── Dockerfile        # Production deployment
└── package.json      # Root workspace configuration
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd VisConnect
```

2. Install all dependencies:
```bash
npm run install:all
```

3. Set up environment variables:
```bash
# Copy environment templates
cp backend/.env.template backend/.env.development
cp frontend/.env.template frontend/.env.development
```

4. Configure your VIS API key in `backend/.env.development`:
```bash
VIS_API_KEY=your_actual_api_key_here
```

### Development

Start both frontend and backend in development mode:
```bash
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Individual Commands

```bash
# Frontend only
cd frontend && npm run dev

# Backend only  
cd backend && npm run dev

# Build everything
npm run build

# Lint and format
npm run lint
npm run format
```

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **shadcn/ui** component library
- **Tailwind CSS** for styling
- **React Router v6** for routing
- **TanStack Query** for API state management
- **Lucide React** for icons

### Backend
- **Node.js 18+** with TypeScript
- **Express.js** web framework
- **Axios** for HTTP requests to VIS API
- **Winston** for logging
- **Node-cache** for in-memory caching
- **Express-rate-limit** for API rate limiting

## Environment Configuration

### Development
- Server runs on port 3001
- Frontend runs on port 3000
- CORS enabled for localhost
- Debug logging enabled

### Production
- Configurable port (default 3001)
- Environment-based CORS origin
- Info-level logging
- PM2 process management

## Deployment

### Using PM2 (Recommended)
```bash
npm run build
cd backend && npm run start:pm2
```

### Using Docker
```bash
docker build -t visconnect .
docker run -p 3001:3001 visconnect
```

### Using Docker Compose (Development)
```bash
docker-compose up -d
```

## API Integration

The application integrates with the FIVB VIS API:
- Base URL: https://vis-api.fivb.com/api/v1
- Requires valid API key
- Implements caching and rate limiting
- Error handling and retry logic

## Contributing

1. Follow the existing code style
2. Use TypeScript throughout
3. Add tests for new features
4. Run linting before commits:
   ```bash
   npm run lint:fix
   npm run format
   ```

## Architecture

This is a monolithic application with clear separation between frontend and backend:

- **Frontend**: React SPA with professional UI components
- **Backend**: RESTful API that proxies and caches VIS API data
- **Data Flow**: Frontend → Backend → VIS API
- **Deployment**: Single-server deployment with PM2

For detailed architecture documentation, see `docs/fullstack-architecture/`.

## License

[Add your license information here]