import { NextRequest, NextResponse } from 'next/server';
import { ErrorReport } from '@/lib/error-logger';

interface ErrorLogEntry {
  timestamp: string;
  level: string;
  message: string;
  sessionId: string;
  url: string;
  userAgent: string;
  stack?: string;
  componentStack?: string;
  errorBoundary?: string;
  additionalData?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const errorReport: ErrorReport = await request.json();
    
    // Validate required fields
    if (!errorReport.id || !errorReport.message || !errorReport.context) {
      return NextResponse.json(
        { error: 'Invalid error report format' },
        { status: 400 }
      );
    }

    // Create structured log entry
    const logEntry: ErrorLogEntry = {
      timestamp: errorReport.context.timestamp,
      level: errorReport.level,
      message: errorReport.message,
      sessionId: errorReport.context.sessionId || 'unknown',
      url: errorReport.context.url,
      userAgent: errorReport.context.userAgent,
      stack: errorReport.stack,
      componentStack: errorReport.componentStack,
      errorBoundary: errorReport.errorBoundary,
      additionalData: errorReport.context.additionalData
    };

    // Log to server console (in production, this would go to proper logging service)
    console.error('[CLIENT ERROR]', {
      id: errorReport.id,
      ...logEntry
    });

    // In a production environment, you would:
    // 1. Send to error monitoring service (Sentry, LogRocket, etc.)
    // 2. Store in database for analysis
    // 3. Send alerts for critical errors
    // 4. Aggregate metrics for monitoring

    // Simulate error service processing
    const response = {
      success: true,
      errorId: errorReport.id,
      timestamp: new Date().toISOString(),
      status: 'logged'
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    // Even error logging can fail - handle gracefully
    console.error('Error logging endpoint failed:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process error report',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests for CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}