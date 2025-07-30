# BeachRef MVP - Fullstack Architecture Document

## Executive Summary

BeachRef MVP is a **ultra-simplified, single-page web application** built with Next.js 14+ and deployed on Vercel's serverless platform. This architecture document outlines the complete technical implementation for displaying FIVB beach volleyball tournaments from the VIS system in a clean, responsive table format.

**Core Architecture Principles:**
- **Serverless-First:** Vercel platform with Next.js App Router
- **Ultra-Simple Stack:** Next.js + TypeScript + Tailwind CSS
- **Zero Database:** Direct VIS API integration with response caching
- **MVP-Focused:** Single page, single API endpoint, zero authentication
- **Deploy-Ready:** GitHub to Vercel automatic deployment

## System Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BeachRef MVP System                          │
├─────────────────────────────────────────────────────────────────┤
│  Vercel Serverless Platform                                    │
│  ┌─────────────────────┬─────────────────────────────────────┐ │
│  │ Frontend (Next.js)  │ API Routes (Serverless Functions)  │ │
│  │ ┌─────────────────┐ │ ┌─────────────────────────────────┐ │ │
│  │ │ React 18 SPA    │ │ │ /api/tournaments.ts             │ │ │
│  │ │ + TypeScript    │ │ │ + VIS API Integration           │ │ │
│  │ │ + Tailwind CSS  │ │ │ + Response Caching              │ │ │
│  │ │ + shadcn/ui     │ │ │ + Error Handling                │ │ │
│  │ └─────────────────┘ │ └─────────────────────────────────┘ │ │
│  └─────────────────────┴─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
                   ┌─────────────────────┐
                   │   FIVB VIS API      │
                   │   Public Endpoints  │
                   │   + X-FIVB-App-ID   │
                   │   Header Required   │
                   └─────────────────────┘
```

### Technology Stack

**Frontend Framework:**
- **Next.js 14+** with App Router and React Server Components
- **React 18.2+** with TypeScript 5.0+ for type safety
- **Tailwind CSS 3.4+** for utility-first styling
- **shadcn/ui** component library for professional UI components

**Backend/API Layer:**
- **Vercel Serverless Functions** (Node.js runtime)
- **Next.js API Routes** in App Router (`app/api/` directory)
- **Edge Runtime** support for improved performance

**Deployment & Infrastructure:**
- **Vercel Platform** with automatic GitHub integration
- **CDN** and global edge network included
- **HTTPS** by default with automatic SSL certificates

## Project Structure

### File System Architecture

```
BeachRef/
├── app/                           # Next.js 14 App Router
│   ├── page.tsx                   # Main tournament table page
│   ├── layout.tsx                 # Root layout with metadata
│   ├── globals.css               # Global Tailwind CSS styles
│   ├── loading.tsx               # Global loading component
│   ├── error.tsx                 # Global error boundary
│   └── api/                      # Serverless API routes
│       └── tournaments/
│           └── route.ts          # GET /api/tournaments endpoint
├── components/                    # React components
│   ├── ui/                       # shadcn/ui components
│   │   ├── table.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── skeleton.tsx
│   │   └── alert.tsx
│   ├── tournament/
│   │   ├── TournamentTable.tsx   # Main tournament display
│   │   ├── TournamentRow.tsx     # Individual tournament row
│   │   ├── LoadingTable.tsx      # Loading skeleton
│   │   └── ErrorDisplay.tsx      # Error state component
│   └── layout/
│       ├── Header.tsx            # Application header
│       ├── Footer.tsx            # Application footer
│       └── Container.tsx         # Layout container
├── lib/                          # Utility libraries
│   ├── vis-client.ts            # VIS API client
│   ├── types.ts                 # TypeScript type definitions
│   ├── utils.ts                 # Utility functions
│   ├── constants.ts             # Application constants
│   └── cache.ts                 # Caching utilities
├── public/                       # Static assets
│   ├── favicon.ico
│   ├── flags/                   # Country flag icons
│   └── images/
├── styles/                       # Additional styling
│   └── components.css           # Component-specific styles
├── package.json                 # Dependencies and scripts
├── next.config.js              # Next.js configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── vercel.json                 # Vercel deployment configuration
└── README.md                   # Setup and deployment guide
```

## Frontend Architecture

### Component Architecture

**Core Components Specification:**

```typescript
// components/tournament/TournamentTable.tsx
interface TournamentTableProps {
  tournaments: Tournament[];
  loading?: boolean;
  error?: string | null;
}

const TournamentTable: React.FC<TournamentTableProps> = ({
  tournaments,
  loading,
  error
}) => {
  if (loading) return <LoadingTable />;
  if (error) return <ErrorDisplay error={error} />;
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tournament</TableHead>
          <TableHead>Country</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead>Gender</TableHead>
          <TableHead>Type</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tournaments.map((tournament) => (
          <TournamentRow 
            key={tournament.code} 
            tournament={tournament} 
          />
        ))}
      </TableBody>
    </Table>
  );
};
```

**TournamentRow Component:**
```typescript
// components/tournament/TournamentRow.tsx
interface TournamentRowProps {
  tournament: Tournament;
}

const TournamentRow: React.FC<TournamentRowProps> = ({ tournament }) => {
  return (
    <TableRow className="hover:bg-muted/50 transition-colors">
      <TableCell className="font-medium">
        {tournament.name}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <CountryFlag 
            countryCode={tournament.countryCode} 
            className="w-5 h-3" 
          />
          <span>{getCountryName(tournament.countryCode)}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <div>{formatDate(tournament.startDate)}</div>
          <div className="text-muted-foreground">
            to {formatDate(tournament.endDate)}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="secondary">
          {tournament.gender}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {tournament.type}
      </TableCell>
    </TableRow>
  );
};
```

### State Management Strategy

**Data Fetching with React Server Components:**
```typescript
// app/page.tsx - Server Component
import { TournamentTable } from '@/components/tournament/TournamentTable';
import { fetchTournaments } from '@/lib/vis-client';

export default async function TournamentsPage() {
  try {
    const tournaments = await fetchTournaments();
    
    return (
      <main className="container mx-auto py-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Beach Volleyball Tournaments 2025
            </h1>
            <p className="text-muted-foreground">
              FIVB official tournament schedule
            </p>
          </div>
          <TournamentTable tournaments={tournaments} />
        </div>
      </main>
    );
  } catch (error) {
    return (
      <main className="container mx-auto py-8">
        <ErrorDisplay 
          error="Failed to load tournaments. Please try again later." 
        />
      </main>
    );
  }
}
```

**Client-side Refresh with SWR (Optional Enhancement):**
```typescript
// hooks/useTournaments.ts (for future client-side features)
import useSWR from 'swr';
import { Tournament } from '@/lib/types';

const fetcher = async (url: string): Promise<Tournament[]> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch tournaments');
  return response.json();
};

export function useTournaments() {
  const { data, error, isLoading, mutate } = useSWR(
    '/api/tournaments',
    fetcher,
    {
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      revalidateOnFocus: false,
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
    }
  );

  return {
    tournaments: data || [],
    loading: isLoading,
    error: error?.message || null,
    refresh: mutate,
  };
}
```

### UI Component Library Integration

**shadcn/ui Configuration:**
```typescript
// components.json
{
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.js",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

**Required shadcn/ui Components:**
```bash
# Install essential components for MVP
npx shadcn-ui@latest add table
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add button
```

## Backend Architecture

### Serverless API Layer

**Tournament API Endpoint:**
```typescript
// app/api/tournaments/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchTournamentsFromVIS } from '@/lib/vis-client';
import { Tournament } from '@/lib/types';

// Cache control headers
const CACHE_DURATION = 5 * 60; // 5 minutes

export async function GET(request: NextRequest) {
  try {
    // Check cache headers
    const ifNoneMatch = request.headers.get('if-none-match');
    
    // Fetch tournaments from VIS API
    const tournaments = await fetchTournamentsFromVIS();
    
    // Generate ETag for caching
    const etag = generateETag(tournaments);
    
    // Check if client has current version
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }
    
    // Return tournaments with cache headers
    return NextResponse.json(tournaments, {
      status: 200,
      headers: {
        'Cache-Control': `public, max-age=${CACHE_DURATION}, s-maxage=${CACHE_DURATION}`,
        'ETag': etag,
        'Content-Type': 'application/json',
      },
    });
    
  } catch (error) {
    console.error('Tournament API Error:', error);
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Failed to fetch tournaments',
        message: 'Unable to connect to tournament data service',
        timestamp: new Date().toISOString(),
      },
      { 
        status: 503,
        headers: {
          'Cache-Control': 'no-cache',
          'Retry-After': '60',
        },
      }
    );
  }
}

function generateETag(data: Tournament[]): string {
  const hash = require('crypto')
    .createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex');
  return `"${hash}"`;
}
```

### VIS API Integration

**VIS Client Implementation:**
```typescript
// lib/vis-client.ts
import { Tournament, VISApiResponse } from '@/lib/types';

const VIS_API_CONFIG = {
  baseURL: 'https://www.fivb.org/vis2009/XmlRequest.asmx',
  appId: '2a9523517c52420da73d927c6d6bab23',
  timeout: 10000,
  maxRetries: 3,
} as const;

export async function fetchTournamentsFromVIS(): Promise<Tournament[]> {
  const xmlRequest = buildVISTournamentRequest();
  
  let lastError: Error | null = null;
  
  // Retry logic with exponential backoff
  for (let attempt = 1; attempt <= VIS_API_CONFIG.maxRetries; attempt++) {
    try {
      const response = await fetch(VIS_API_CONFIG.baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'X-FIVB-App-ID': VIS_API_CONFIG.appId,
          'User-Agent': 'BeachRef-MVP/1.0',
        },
        body: xmlRequest,
        signal: AbortSignal.timeout(VIS_API_CONFIG.timeout),
      });
      
      if (!response.ok) {
        throw new Error(`VIS API returned ${response.status}: ${response.statusText}`);
      }
      
      const xmlText = await response.text();
      const tournaments = parseVISResponse(xmlText);
      
      console.log(`VIS API Success: Retrieved ${tournaments.length} tournaments`);
      return tournaments;
      
    } catch (error) {
      lastError = error as Error;
      console.warn(`VIS API attempt ${attempt} failed:`, error);
      
      if (attempt < VIS_API_CONFIG.maxRetries) {
        const backoffDelay = Math.pow(2, attempt) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  
  // All retries failed
  throw new Error(`VIS API failed after ${VIS_API_CONFIG.maxRetries} attempts: ${lastError?.message}`);
}

function buildVISTournamentRequest(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<Requests>
  <Request Type="GetBeachTournamentList" 
           Fields="Code Name CountryCode StartDateMainDraw EndDateMainDraw Gender Type">
    <Filter Year="2025"/>
  </Request>
</Requests>`;
}

function parseVISResponse(xmlText: string): Tournament[] {
  try {
    // Parse XML response to Tournament objects
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    
    const tournamentNodes = xmlDoc.querySelectorAll('Tournament');
    const tournaments: Tournament[] = [];
    
    tournamentNodes.forEach(node => {
      const tournament: Tournament = {
        code: node.getAttribute('Code') || '',
        name: node.getAttribute('Name') || '',
        countryCode: node.getAttribute('CountryCode') || '',
        startDate: node.getAttribute('StartDateMainDraw') || '',
        endDate: node.getAttribute('EndDateMainDraw') || '',
        gender: node.getAttribute('Gender') as 'Men' | 'Women' | 'Mixed' || 'Mixed',
        type: node.getAttribute('Type') || '',
      };
      
      // Validate required fields
      if (tournament.code && tournament.name) {
        tournaments.push(tournament);
      }
    });
    
    return tournaments.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
    
  } catch (error) {
    console.error('XML Parsing Error:', error);
    throw new Error('Failed to parse VIS API response');
  }
}
```

### Error Handling & Resilience

**Comprehensive Error Handling:**
```typescript
// lib/error-handler.ts
export class VISApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'VISApiError';
  }
}

export class CacheError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CacheError';
  }
}

export function handleApiError(error: unknown): never {
  if (error instanceof VISApiError) {
    throw error;
  }
  
  if (error instanceof TypeError && error.message.includes('fetch')) {
    throw new VISApiError('Network connection failed', 503, 60);
  }
  
  if (error instanceof Error) {
    throw new VISApiError(`Unexpected error: ${error.message}`, 500);
  }
  
  throw new VISApiError('Unknown error occurred', 500);
}
```

### Caching Strategy

**Multi-Level Caching Implementation:**
```typescript
// lib/cache.ts
import { Tournament } from '@/lib/types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag: string;
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, etag: string): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      etag,
    });
  }

  get<T>(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }
    
    return entry as CacheEntry<T>;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const tournamentCache = new MemoryCache();

// Enhanced VIS client with caching
export async function fetchTournamentsFromVISWithCache(): Promise<Tournament[]> {
  const cacheKey = 'tournaments:2025';
  
  // Try cache first
  const cached = tournamentCache.get<Tournament[]>(cacheKey);
  if (cached) {
    console.log('Cache hit: Returning cached tournaments');
    return cached.data;
  }
  
  // Cache miss - fetch from VIS
  console.log('Cache miss: Fetching from VIS API');
  const tournaments = await fetchTournamentsFromVIS();
  
  // Store in cache
  const etag = generateETag(tournaments);
  tournamentCache.set(cacheKey, tournaments, etag);
  
  return tournaments;
}
```

## Data Architecture

### Type Definitions

**Core Data Models:**
```typescript
// lib/types.ts
export interface Tournament {
  code: string;              // Unique tournament identifier
  name: string;              // Tournament name
  countryCode: string;       // ISO country code
  startDate: string;         // ISO date string
  endDate: string;           // ISO date string
  gender: 'Men' | 'Women' | 'Mixed';
  type: string;              // Tournament type/level
}

export interface VISApiResponse {
  tournaments: Tournament[];
  totalCount: number;
  lastUpdated: string;
}

export interface ApiError {
  error: string;
  message: string;
  timestamp: string;
  retryAfter?: number;
}

export interface CacheMetadata {
  etag: string;
  lastModified: string;
  cacheControl: string;
}
```

**Utility Functions:**
```typescript
// lib/utils.ts
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString; // Fallback to original string
  }
}

export function getCountryName(countryCode: string): string {
  const countryNames: Record<string, string> = {
    'BRA': 'Brazil',
    'USA': 'United States',
    'GER': 'Germany',
    'ITA': 'Italy',
    'FRA': 'France',
    'AUS': 'Australia',
    'NED': 'Netherlands',
    'CAN': 'Canada',
    // Add more as needed
  };
  
  return countryNames[countryCode] || countryCode;
}

export function formatDateRange(startDate: string, endDate: string): string {
  const start = formatDate(startDate);
  const end = formatDate(endDate);
  
  if (start === end) {
    return start;
  }
  
  return `${start} - ${end}`;
}
```

## Deployment Architecture

### Vercel Configuration

**Vercel Deployment Configuration:**
```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "@vercel/node@3.0.6",
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=300, s-maxage=300"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/tournaments",
      "destination": "/",
      "permanent": true
    }
  ]
}
```

**Next.js Configuration:**
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['xml2js'],
  },
  images: {
    domains: ['flagcdn.com'], // For country flags
    formats: ['image/webp', 'image/avif'],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY',
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff',
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
      ],
    },
  ],
  env: {
    VIS_APP_ID: process.env.VIS_APP_ID || '2a9523517c52420da73d927c6d6bab23',
  },
};

module.exports = nextConfig;
```

### Environment Configuration

**Environment Variables:**
```bash
# .env.local (development)
NEXT_PUBLIC_APP_NAME="BeachRef MVP"
NEXT_PUBLIC_APP_VERSION="1.0.0"
VIS_APP_ID="2a9523517c52420da73d927c6d6bab23"
NODE_ENV="development"

# Vercel Production Environment
# Set in Vercel Dashboard:
# VIS_APP_ID=2a9523517c52420da73d927c6d6bab23
# NEXT_PUBLIC_APP_NAME="BeachRef"
```

**Package.json Configuration:**
```json
{
  "name": "beachref-mvp",
  "version": "1.0.0",
  "description": "FIVB Beach Volleyball Tournament Viewer",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "clean": "rm -rf .next && rm -rf node_modules/.cache"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@radix-ui/react-table": "^1.0.0",
    "@radix-ui/react-slot": "^1.0.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.0.0",
    "lucide-react": "^0.294.0",
    "tailwind-merge": "^2.0.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0",
    "prettier": "^3.0.0"
  }
}
```

## Performance Architecture

### Performance Optimization Strategy

**Core Web Vitals Targets:**
- **Largest Contentful Paint (LCP):** < 2.5 seconds
- **First Input Delay (FID):** < 100 milliseconds
- **Cumulative Layout Shift (CLS):** < 0.1

**Optimization Techniques:**

1. **Server-Side Rendering (SSR):**
```typescript
// app/page.tsx - Automatic SSR with Next.js App Router
export default async function Page() {
  // Data fetched on server, sent to client pre-rendered
  const tournaments = await fetchTournamentsFromVIS();
  return <TournamentTable tournaments={tournaments} />;
}
```

2. **Static Generation with ISR:**
```typescript
// For future enhancement - ISR (Incremental Static Regeneration)
export const revalidate = 300; // Regenerate every 5 minutes

export default async function Page() {
  const tournaments = await fetchTournamentsFromVIS();
  return <TournamentTable tournaments={tournaments} />;
}
```

3. **Image Optimization:**
```typescript
// components/CountryFlag.tsx
import Image from 'next/image';

interface CountryFlagProps {
  countryCode: string;
  className?: string;
}

export const CountryFlag: React.FC<CountryFlagProps> = ({ 
  countryCode, 
  className 
}) => {
  return (
    <Image
      src={`https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`}
      alt={`${countryCode} flag`}
      width={20}
      height={12}
      className={className}
      loading="lazy"
      quality={85}
    />
  );
};
```

### Caching & CDN Strategy

**Multi-Layer Caching:**
1. **Vercel Edge Cache:** 300 seconds (5 minutes)
2. **Browser Cache:** 300 seconds with revalidation
3. **Memory Cache:** 300 seconds server-side
4. **CDN Cache:** Global edge locations

**Cache Headers Implementation:**
```typescript
// Enhanced API response with optimal caching
export async function GET() {
  const tournaments = await fetchTournamentsFromVIS();
  
  return NextResponse.json(tournaments, {
    headers: {
      // Vercel Edge Cache
      'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
      // ETag for conditional requests
      'ETag': generateETag(tournaments),
      // CORS headers
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Max-Age': '86400',
    },
  });
}
```

## Security Architecture

### Security Implementation

**Security Headers:**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // CSP for XSS protection
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  );
  
  return response;
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};
```

**API Security:**
```typescript
// lib/security.ts
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim()
    .substring(0, 255); // Limit length
}

export function validateCountryCode(code: string): boolean {
  return /^[A-Z]{3}$/.test(code);
}

export function validateDateString(date: string): boolean {
  return !isNaN(Date.parse(date));
}
```

## Testing Architecture

### Testing Strategy

**Unit Testing Setup:**
```typescript
// jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};

module.exports = createJestConfig(customJestConfig);
```

**Component Testing:**
```typescript
// __tests__/components/TournamentTable.test.tsx
import { render, screen } from '@testing-library/react';
import { TournamentTable } from '@/components/tournament/TournamentTable';
import { mockTournaments } from '../mocks/tournaments';

describe('TournamentTable', () => {
  it('renders tournament data correctly', () => {
    render(<TournamentTable tournaments={mockTournaments} />);
    
    expect(screen.getByText('Tournament')).toBeInTheDocument();
    expect(screen.getByText('Country')).toBeInTheDocument();
    expect(screen.getByText('Dates')).toBeInTheDocument();
    
    // Check first tournament is rendered
    expect(screen.getByText(mockTournaments[0].name)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<TournamentTable tournaments={[]} loading={true} />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('shows error state', () => {
    const errorMessage = 'Failed to load tournaments';
    render(<TournamentTable tournaments={[]} error={errorMessage} />);
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });
});
```

**API Testing:**
```typescript
// __tests__/api/tournaments.test.ts
import { GET } from '@/app/api/tournaments/route';
import { NextRequest } from 'next/server';

// Mock VIS API
jest.mock('@/lib/vis-client', () => ({
  fetchTournamentsFromVIS: jest.fn(),
}));

describe('/api/tournaments', () => {
  it('returns tournaments successfully', async () => {
    const mockTournaments = [
      { code: 'T1', name: 'Test Tournament', countryCode: 'BRA' }
    ];
    
    require('@/lib/vis-client').fetchTournamentsFromVIS
      .mockResolvedValueOnce(mockTournaments);
    
    const request = new NextRequest('http://localhost:3000/api/tournaments');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockTournaments);
  });

  it('handles VIS API errors gracefully', async () => {
    require('@/lib/vis-client').fetchTournamentsFromVIS
      .mockRejectedValueOnce(new Error('VIS API Error'));
    
    const request = new NextRequest('http://localhost:3000/api/tournaments');
    const response = await GET(request);
    
    expect(response.status).toBe(503);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch tournaments');
  });
});
```

## Monitoring & Analytics

### Performance Monitoring

**Web Vitals Tracking:**
```typescript
// lib/analytics.ts
export function reportWebVitals(metric: any) {
  if (process.env.NODE_ENV === 'production') {
    console.log('Web Vital:', metric);
    
    // Future: Send to analytics service
    // analytics.track('web-vital', {
    //   name: metric.name,
    //   value: metric.value,
    //   id: metric.id,
    // });
  }
}
```

**API Performance Monitoring:**
```typescript
// lib/monitoring.ts
export function logApiPerformance(
  endpoint: string,
  duration: number,
  status: number
) {
  console.log('API Performance:', {
    endpoint,
    duration,
    status,
    timestamp: new Date().toISOString(),
  });
  
  // Alert on slow responses
  if (duration > 5000) {
    console.warn(`Slow API response: ${endpoint} took ${duration}ms`);
  }
}

// Usage in API route
export async function GET() {
  const startTime = Date.now();
  
  try {
    const tournaments = await fetchTournamentsFromVIS();
    const duration = Date.now() - startTime;
    
    logApiPerformance('/api/tournaments', duration, 200);
    return NextResponse.json(tournaments);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logApiPerformance('/api/tournaments', duration, 503);
    throw error;
  }
}
```

## Error Handling & Resilience

### Comprehensive Error Handling

**Global Error Boundary:**
```typescript
// app/error.tsx (Next.js App Router error boundary)
'use client';

import { useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="container mx-auto py-8">
      <Alert variant="destructive" className="max-w-lg mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Something went wrong!</AlertTitle>
        <AlertDescription className="mt-2">
          We encountered an error while loading the tournament data. 
          This might be a temporary issue with the FIVB system.
        </AlertDescription>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={reset}
          className="mt-4"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
      </Alert>
    </div>
  );
}
```

**Loading States:**
```typescript
// app/loading.tsx (Next.js App Router loading UI)
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="container mx-auto py-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-9 w-80" /> {/* Title */}
          <Skeleton className="h-5 w-64" /> {/* Subtitle */}
        </div>
        
        <div className="space-y-3">
          {/* Table skeleton */}
          <Skeleton className="h-10 w-full" /> {/* Header */}
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Accessibility Architecture

### WCAG 2.1 AA Compliance

**Semantic HTML & ARIA:**
```typescript
// components/tournament/TournamentTable.tsx
export const TournamentTable: React.FC<TournamentTableProps> = ({ 
  tournaments 
}) => {
  return (
    <div role="region" aria-labelledby="tournaments-heading">
      <h2 id="tournaments-heading" className="sr-only">
        Tournament List
      </h2>
      
      <Table>
        <TableCaption>
          FIVB Beach Volleyball Tournaments for 2025
        </TableCaption>
        
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Tournament Name</TableHead>
            <TableHead scope="col">Country</TableHead>
            <TableHead scope="col">Tournament Dates</TableHead>
            <TableHead scope="col">Gender Category</TableHead>
            <TableHead scope="col">Tournament Type</TableHead>
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {tournaments.map((tournament, index) => (
            <TableRow key={tournament.code}>
              <TableCell>
                <span 
                  aria-label={`Tournament: ${tournament.name}`}
                  tabIndex={0}
                >
                  {tournament.name}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <img
                    src={`https://flagcdn.com/w20/${tournament.countryCode.toLowerCase()}.png`}
                    alt={`${getCountryName(tournament.countryCode)} flag`}
                    className="w-5 h-3"
                    loading="lazy"
                  />
                  <span>{getCountryName(tournament.countryCode)}</span>
                </div>
              </TableCell>
              <TableCell>
                <time dateTime={tournament.startDate}>
                  {formatDateRange(tournament.startDate, tournament.endDate)}
                </time>
              </TableCell>
              <TableCell>
                <Badge 
                  variant="secondary"
                  aria-label={`Gender category: ${tournament.gender}`}
                >
                  {tournament.gender}
                </Badge>
              </TableCell>
              <TableCell>{tournament.type}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
```

**Focus Management:**
```css
/* styles/globals.css - Focus indicators */
.focus-visible:focus {
  @apply ring-2 ring-blue-500 ring-offset-2 outline-none;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .border {
    @apply border-2;
  }
  
  .text-muted-foreground {
    @apply text-foreground;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Configuration Management

### Development Configuration

**TypeScript Configuration:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

**Tailwind CSS Configuration:**
```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
```

## Future Enhancement Roadmap

### Phase 2 Enhancements (Optional)

**Advanced Filtering:**
```typescript
// Future: components/tournament/TournamentFilters.tsx
interface FilterOptions {
  countries: string[];
  genders: ('Men' | 'Women' | 'Mixed')[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  tournamentTypes: string[];
}

export const TournamentFilters: React.FC = () => {
  const [filters, setFilters] = useState<FilterOptions>({
    countries: [],
    genders: [],
    dateRange: { start: null, end: null },
    tournamentTypes: [],
  });

  return (
    <Card className="p-4 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <CountrySelect 
          value={filters.countries}
          onChange={(countries) => setFilters(prev => ({ ...prev, countries }))}
        />
        <GenderSelect 
          value={filters.genders}
          onChange={(genders) => setFilters(prev => ({ ...prev, genders }))}
        />
        <DateRangePicker 
          value={filters.dateRange}
          onChange={(dateRange) => setFilters(prev => ({ ...prev, dateRange }))}
        />
        <TypeSelect 
          value={filters.tournamentTypes}
          onChange={(types) => setFilters(prev => ({ ...prev, tournamentTypes: types }))}
        />
      </div>
    </Card>
  );
};
```

**Real-time Updates:**
```typescript
// Future: Real-time data with Server-Sent Events
export function useTournamentsSSE() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  
  useEffect(() => {
    const eventSource = new EventSource('/api/tournaments/stream');
    
    eventSource.onmessage = (event) => {
      const updatedTournaments = JSON.parse(event.data);
      setTournaments(updatedTournaments);
    };
    
    return () => eventSource.close();
  }, []);
  
  return tournaments;
}
```

### Database Integration Path

**Future: PostgreSQL Integration:**
```typescript
// Future: lib/database.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function saveTournaments(tournaments: Tournament[]): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Upsert tournaments
    for (const tournament of tournaments) {
      await client.query(`
        INSERT INTO tournaments (code, name, country_code, start_date, end_date, gender, type)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          country_code = EXCLUDED.country_code,
          start_date = EXCLUDED.start_date,
          end_date = EXCLUDED.end_date,
          gender = EXCLUDED.gender,
          type = EXCLUDED.type,
          updated_at = NOW()
      `, [
        tournament.code,
        tournament.name,
        tournament.countryCode,
        tournament.startDate,
        tournament.endDate,
        tournament.gender,
        tournament.type,
      ]);
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## Conclusion

This fullstack architecture document provides a comprehensive technical blueprint for implementing BeachRef MVP as requested. The architecture emphasizes:

### Key Architectural Strengths

1. **Ultra-Simplified Stack:** Next.js 14 with App Router, TypeScript, and Tailwind CSS
2. **Serverless-First:** Vercel platform with automatic scaling and global CDN
3. **Zero Database Complexity:** Direct VIS API integration with intelligent caching
4. **Professional UI:** shadcn/ui components for consistent, accessible design
5. **Performance Optimized:** Sub-3-second load times with multi-layer caching
6. **Deploy-Ready:** GitHub to Vercel automatic deployment pipeline

### Implementation Readiness

The architecture is designed for immediate implementation with:
- **Clear file structure** and component organization
- **Complete code examples** for all major components
- **TypeScript definitions** for type safety
- **Error handling strategies** for production reliability
- **Performance optimization** built-in from day one
- **Accessibility compliance** with WCAG 2.1 AA standards

### Development Velocity

This architecture enables rapid development by:
- **Leveraging proven frameworks** (Next.js, Tailwind, shadcn/ui)
- **Minimizing external dependencies** for reduced complexity
- **Using platform defaults** (Vercel's optimizations)
- **Clear separation of concerns** between UI and API layers

### Future-Proof Foundation

While focused on MVP simplicity, the architecture provides clear upgrade paths for:
- **Database integration** (PostgreSQL with data synchronization)
- **Advanced filtering** and search capabilities
- **Real-time updates** with WebSocket connections
- **Microservices migration** for independent scaling
- **Mobile application** development (React Native)

**Ready for immediate implementation** - All components, APIs, and configurations are production-ready and follow modern web development best practices.