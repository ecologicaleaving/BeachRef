import { TournamentTable } from '@/components/tournament/TournamentTable';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function Home() {
  return (
    <main className="container mx-auto mobile-padding tablet-padding desktop-padding py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with theme toggle */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2 sm:mb-4">
              2025 Beach Volleyball Tournaments
            </h1>
          </div>
          <div className="flex-shrink-0 ml-4">
            <ThemeToggle showLabel={false} />
          </div>
        </div>
        
        {/* Description with responsive text */}
        <div className="text-center mb-6 sm:mb-8">
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
            Browse and explore FIVB beach volleyball tournaments scheduled for 2025. 
            Sort by tournament name, country, dates, gender category, and tournament type.
          </p>
        </div>
        
        <div className="mb-6">
          <TournamentTable className="w-full" />
        </div>
        
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