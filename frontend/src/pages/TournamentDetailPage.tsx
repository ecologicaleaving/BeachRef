import { useParams, useNavigate } from 'react-router-dom';
import { useTournamentDetail } from '@/hooks/useTournamentDetail';
import { TournamentDetail } from '@/components/tournament/TournamentDetail';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader } from '@/components/ui/card';
import { ChevronLeft } from 'lucide-react';
import { useEffect } from 'react';

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: tournamentDetail, isLoading, error } = useTournamentDetail(id);

  // Set page title when tournament data loads
  useEffect(() => {
    if (tournamentDetail) {
      document.title = `${tournamentDetail.tournament.name} - VisConnect`;
    }
    return () => {
      document.title = 'VisConnect';
    };
  }, [tournamentDetail]);

  const handleBackClick = () => {
    navigate('/tournaments');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8" data-testid="loading-skeleton">
        {/* Breadcrumb Skeleton */}
        <div className="mb-6">
          <Skeleton className="h-5 w-64" />
        </div>

        {/* Tournament Header Skeleton */}
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
        </Card>

        {/* Match List Skeleton */}
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/tournaments">Tournaments</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Error</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Alert variant="destructive">
          <AlertDescription>
            {error.message.includes('not found') 
              ? 'Tournament not found. Please check the URL and try again.'
              : 'Failed to load tournament details. Please try again.'}
          </AlertDescription>
        </Alert>

        <div className="mt-4">
          <Button onClick={handleBackClick} variant="outline">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Tournaments
          </Button>
        </div>
      </div>
    );
  }

  if (!tournamentDetail) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Tournament not found.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb Navigation */}
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/tournaments">Tournaments</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{tournamentDetail.tournament.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Back Button */}
      <div className="mb-6">
        <Button onClick={handleBackClick} variant="outline" size="sm">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Tournaments
        </Button>
      </div>

      {/* Tournament Detail Content */}
      <TournamentDetail tournamentDetail={tournamentDetail} />
    </div>
  );
}