import { NextResponse } from 'next/server';

export async function GET() {
  const start = Date.now();
  
  try {
    // Simulate variable response times for connection quality testing
    const randomDelay = Math.random() * 50; // 0-50ms random delay
    if (randomDelay > 25) {
      await new Promise(resolve => setTimeout(resolve, randomDelay));
    }
    
    const responseTime = Date.now() - start;
    
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime,
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'unknown',
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: 'not_applicable',
        external_apis: 'operational',
        tournament_data: 'available'
      },
      connectionQuality: responseTime < 100 ? 'fast' : responseTime < 500 ? 'normal' : 'slow'
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
        responseTime: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 503 }
    );
  }
}

// Lightweight HEAD endpoint for connection testing
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  });
}