'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function TournamentError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Tournament Error Boundary] Tournament page error:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      timestamp: new Date().toISOString()
    })
  }, [error])

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Tournaments</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Error</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Error display */}
      <Card className="text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Tournament Not Available</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            We encountered an error while loading the tournament details.
            This could be due to a network issue, server problem, or the tournament might not exist.
          </p>
          
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-left">
              <details className="text-red-800">
                <summary className="font-medium cursor-pointer">Developer Info</summary>
                <div className="mt-2 space-y-1">
                  <div><strong>Error:</strong> {error.message}</div>
                  {error.digest && <div><strong>Digest:</strong> {error.digest}</div>}
                </div>
              </details>
            </div>
          )}
          
          <div className="flex justify-center gap-4">
            <Button 
              onClick={reset}
              variant="default"
              className="min-h-[48px]"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button 
              variant="outline" 
              asChild
              className="min-h-[48px]"
            >
              <a href="/">Back to Tournaments</a>
            </Button>
          </div>
          
          {error.digest && (
            <p className="text-xs text-muted-foreground mt-4">
              Error ID: {error.digest}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}