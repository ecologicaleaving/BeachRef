import { TournamentTable } from '@/components/tournament/TournamentTable';

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            2025 Beach Volleyball Tournaments
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Browse and explore FIVB beach volleyball tournaments scheduled for 2025. 
            Sort by tournament name, country, dates, gender category, and tournament type.
          </p>
        </div>
        
        <div className="mb-6">
          <TournamentTable className="w-full" />
        </div>
        
        <footer className="text-center text-sm text-gray-500 mt-8 pt-8 border-t border-gray-200">
          <p>
            Tournament data provided by FIVB VIS (Volleyball Information System)
          </p>
          <p className="mt-1">
            Data is updated every 5 minutes • Last updated: {new Date().toLocaleString()}
          </p>
        </footer>
      </div>
    </main>
  )
}