import { TournamentTableWithPagination } from '@/components/tournament/TournamentTableWithPagination';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { fetchPaginatedTournaments } from '@/lib/tournament-api';
import { PaginatedTournamentResponse } from '@/lib/types';

interface PageProps {
  searchParams: {
    year?: string;
    page?: string;
    limit?: string;
  };
}

export default async function Home({ searchParams }: PageProps) {
  // Parse URL parameters for initial state
  const year = parseInt(searchParams.year || '2025');
  const page = parseInt(searchParams.page || '1');
  const limit = parseInt(searchParams.limit || '20');
  
  // Initialize with null to indicate SSR data fetching is needed
  let initialData: PaginatedTournamentResponse | null = null;
  let error: string | null = null;
  
  try {
    // Server-side data fetching for initial page load
    initialData = await fetchPaginatedTournaments({ year, page, limit });
  } catch (err) {
    console.error('Failed to fetch initial tournament data:', err);
    error = err instanceof Error ? err.message : 'Failed to load tournaments';
  }
  
  return (
    <main className="container mx-auto mobile-padding tablet-padding desktop-padding py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with theme toggle */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-4">
              Beach Volleyball Tournaments {year}
            </h1>
          </div>
          <div className="flex-shrink-0 ml-4">
            <ThemeToggle showLabel={false} />
          </div>
        </div>
        
        {/* Description with responsive text */}
        <div className="text-center mb-6 sm:mb-8">
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
            Browse and explore FIVB beach volleyball tournaments for {year}. 
            Navigate through pages, filter by year, and sort tournaments by various criteria.
          </p>
          {initialData && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing {initialData.tournaments.length} of {initialData.pagination.totalTournaments} tournaments
            </p>
          )}
        </div>
        
        {error ? (
          <div className="mb-6 p-6 border border-destructive/50 bg-destructive/10 rounded-lg text-center">
            <div className="text-destructive font-medium mb-2">
              Failed to load tournaments
            </div>
            <div className="text-sm text-muted-foreground">
              {error}
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <TournamentTableWithPagination 
              className="w-full"
              initialData={initialData}
              initialYear={year}
              initialPage={page}
            />
          </div>
        )}
        
        <footer className="text-center text-xs sm:text-sm text-muted-foreground mt-8 pt-6 sm:pt-8 border-t border-border">
          <p className="mb-2">
            Tournament data provided by FIVB VIS (Volleyball Information System)
          </p>
          <p className="text-xs text-muted-foreground/75">
            Data is updated every 5 minutes • Last updated: {new Date().toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground/50 mt-2">
            Optimized for tournament referee usage • Mobile-first design
          </p>
        </footer>
      </div>
    </main>
  )
}

// Enable dynamic rendering to support search params
export const dynamic = 'force-dynamic'

// Generate metadata for SEO
export async function generateMetadata({ searchParams }: PageProps) {
  const year = parseInt(searchParams.year || '2025');
  const page = parseInt(searchParams.page || '1');
  
  let title = `Beach Volleyball Tournaments ${year}`;
  let description = `Browse FIVB beach volleyball tournaments for ${year}. Official tournament schedule with dates, locations, and categories.`;
  
  if (page > 1) {
    title += ` - Page ${page}`;
    description += ` Page ${page} of tournament listings.`;
  }
  
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}