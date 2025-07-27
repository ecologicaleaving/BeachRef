import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="container mx-auto px-4 py-unit-2">
      {/* Hero Section */}
      <div className="text-center mb-unit-2">
        <h1>Welcome to VisConnect</h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
          Your gateway to FIVB volleyball tournament data. Access real-time tournament information, 
          match results, and comprehensive volleyball statistics.
        </p>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-unit-2 max-w-4xl mx-auto">
        <Card className="card-subtle">
          <CardHeader>
            <CardTitle className="text-xl">Tournament Data</CardTitle>
            <CardDescription>
              Browse current and upcoming volleyball tournaments from around the world
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full touch-target">
              <Link to="/tournaments">View Tournaments</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="card-subtle">
          <CardHeader>
            <CardTitle className="text-xl">Match Results</CardTitle>
            <CardDescription>
              Access detailed match results, scores, and referee information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full touch-target" disabled>
              Coming Soon
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Footer Info */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Data provided by the FIVB Volleyball Information System (VIS)</p>
      </div>
    </div>
  );
}