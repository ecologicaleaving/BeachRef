import { GET } from '../../app/api/health/route';

// Mock NextResponse for testing
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
      headers: new Map(Object.entries(init?.headers || {}))
    }))
  }
}));

describe('/api/health', () => {
  it('should return healthy status with proper structure', async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('uptime');
    expect(data).toHaveProperty('environment');
    expect(data).toHaveProperty('version');
    expect(data).toHaveProperty('services');
    expect(data.services).toHaveProperty('database', 'not_applicable');
    expect(data.services).toHaveProperty('external_apis', 'operational');
  });

  it('should return proper cache headers', async () => {
    const response = await GET();
    const headers = response.headers;

    expect(headers.get('Cache-Control')).toBe('no-cache, no-store, must-revalidate');
    expect(headers.get('Pragma')).toBe('no-cache');
    expect(headers.get('Expires')).toBe('0');
  });

  it('should include timestamp in ISO format', async () => {
    const response = await GET();
    const data = await response.json();

    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should include uptime as a number', async () => {
    const response = await GET();
    const data = await response.json();

    expect(typeof data.uptime).toBe('number');
    expect(data.uptime).toBeGreaterThanOrEqual(0);
  });
});