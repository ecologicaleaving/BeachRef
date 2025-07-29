import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'not_applicable',
        external_apis: 'operational'
      }
    };

    return NextResponse.json(healthCheck, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 503 }
    );
  }
}