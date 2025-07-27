import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <Card>
        <CardHeader>
          <CardTitle className="text-6xl font-bold text-gray-400 mb-4">404</CardTitle>
          <CardTitle className="text-2xl text-gray-900">Page Not Found</CardTitle>
          <CardDescription className="text-lg">
            The page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            You might want to check the URL or return to the homepage to find what you're looking for.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild>
              <Link to="/">Go Home</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/tournaments">View Tournaments</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}