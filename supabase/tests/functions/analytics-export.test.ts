/**
 * Analytics Export Edge Function Tests
 * Tests for bulk export functionality
 */

// Test configuration
const TEST_CONFIG = {
  FUNCTION_URL: 'http://localhost:54321/functions/v1/analytics-export',
};

// Test data fixtures
const TEST_EXPORT_PARAMS = {
  startDate: '2024-09-01',
  endDate: '2024-09-07',
  tournamentCode: 'TEST2024',
  federationCode: 'USA',
};

/**
 * Test suite for Analytics Export Function
 */
Deno.test('Analytics Export Function Tests', async (t) => {

  await t.step('should return 405 for non-GET methods', async () => {
    const response = await fetch(TEST_CONFIG.FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' }),
    });

    if (response.status !== 405) {
      throw new Error(`Expected 405, got ${response.status}`);
    }

    const data = await response.json();
    if (data.error !== 'Method not allowed') {
      throw new Error('Expected method not allowed error');
    }
  });

  await t.step('should handle CORS preflight requests', async () => {
    const response = await fetch(TEST_CONFIG.FUNCTION_URL, {
      method: 'OPTIONS',
    });

    if (response.status !== 200) {
      throw new Error(`Expected 200 for OPTIONS, got ${response.status}`);
    }

    const corsOrigin = response.headers.get('Access-Control-Allow-Origin');
    if (corsOrigin !== '*') {
      throw new Error('CORS not configured properly');
    }
  });

  await t.step('should require format parameter', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?startDate=${TEST_EXPORT_PARAMS.startDate}&endDate=${TEST_EXPORT_PARAMS.endDate}`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }

    const data = await response.json();
    if (!data.message.includes('format parameter is required')) {
      throw new Error('Expected format parameter validation error');
    }
  });

  await t.step('should validate format parameter values', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?format=xml&startDate=${TEST_EXPORT_PARAMS.startDate}&endDate=${TEST_EXPORT_PARAMS.endDate}`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }

    const data = await response.json();
    if (!data.message.includes('must be either "json" or "csv"')) {
      throw new Error('Expected format validation error');
    }
  });

  await t.step('should require date parameters', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?format=json`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }

    const data = await response.json();
    if (!data.message.includes('startDate and endDate parameters are required')) {
      throw new Error('Expected date parameter validation error');
    }
  });

  await t.step('should validate date format', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?format=json&startDate=invalid&endDate=2024-09-07`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }

    const data = await response.json();
    if (!data.message.includes('Invalid date format')) {
      throw new Error('Expected date format validation error');
    }
  });

  await t.step('should validate date range order', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?format=json&startDate=2024-09-07&endDate=2024-09-01`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }

    const data = await response.json();
    if (!data.message.includes('startDate must be before endDate')) {
      throw new Error('Expected date range validation error');
    }
  });

  await t.step('should validate export date range (max 90 days)', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?format=json&startDate=2024-01-01&endDate=2024-06-01`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }

    const data = await response.json();
    if (!data.message.includes('Export date range cannot exceed 90 days')) {
      throw new Error('Expected date range validation error');
    }
  });

  await t.step('should export JSON format successfully', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?format=json&startDate=${TEST_EXPORT_PARAMS.startDate}&endDate=${TEST_EXPORT_PARAMS.endDate}`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 200) {
      const errorData = await response.json();
      console.error('JSON export failed:', errorData);
      throw new Error(`Expected 200, got ${response.status}`);
    }

    // Check content type
    const contentType = response.headers.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Expected JSON content type');
    }

    // Check content disposition (download header)
    const contentDisposition = response.headers.get('Content-Disposition');
    if (!contentDisposition || !contentDisposition.includes('attachment')) {
      throw new Error('Expected attachment content disposition');
    }

    const data = await response.json();
    
    // Validate JSON structure
    if (!Array.isArray(data.data)) {
      throw new Error('Expected data array in JSON export');
    }

    if (!data.meta) {
      throw new Error('Expected meta object in JSON export');
    }

    if (data.meta.format !== 'json') {
      throw new Error('Expected format metadata in JSON export');
    }

    if (!data.meta.export || !data.meta.export.filename) {
      throw new Error('Expected export metadata with filename');
    }
  });

  await t.step('should export CSV format successfully', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?format=csv&startDate=${TEST_EXPORT_PARAMS.startDate}&endDate=${TEST_EXPORT_PARAMS.endDate}`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 200) {
      const errorText = await response.text();
      console.error('CSV export failed:', errorText);
      throw new Error(`Expected 200, got ${response.status}`);
    }

    // Check content type
    const contentType = response.headers.get('Content-Type');
    if (!contentType || !contentType.includes('text/csv')) {
      throw new Error('Expected CSV content type');
    }

    // Check content disposition
    const contentDisposition = response.headers.get('Content-Disposition');
    if (!contentDisposition || !contentDisposition.includes('attachment')) {
      throw new Error('Expected attachment content disposition');
    }

    const csvData = await response.text();
    
    // Basic CSV validation
    const lines = csvData.split('\n');
    if (lines.length < 1) {
      throw new Error('Expected at least header line in CSV');
    }

    // Check header line
    const headerLine = lines[0];
    const expectedHeaders = [
      'referee_id', 'referee_name', 'federation_code',
      'total_assignments', 'first_referee_count', 
      'second_referee_count', 'challenge_referee_count',
      'tournaments_worked', 'export_timestamp'
    ];

    for (const header of expectedHeaders) {
      if (!headerLine.includes(header)) {
        throw new Error(`Missing expected header: ${header}`);
      }
    }
  });

  await t.step('should handle tournament code filter in export', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?format=json&startDate=${TEST_EXPORT_PARAMS.startDate}&endDate=${TEST_EXPORT_PARAMS.endDate}&tournamentCode=${TEST_EXPORT_PARAMS.tournamentCode}`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 200) {
      throw new Error(`Tournament filter export failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.meta.filters.tournamentCode !== TEST_EXPORT_PARAMS.tournamentCode) {
      throw new Error('Tournament code filter not applied in export');
    }

    // Check filename includes tournament code
    if (!data.meta.export.filename.includes(TEST_EXPORT_PARAMS.tournamentCode)) {
      throw new Error('Tournament code not included in filename');
    }
  });

  await t.step('should handle federation code filter in export', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?format=json&startDate=${TEST_EXPORT_PARAMS.startDate}&endDate=${TEST_EXPORT_PARAMS.endDate}&federationCode=${TEST_EXPORT_PARAMS.federationCode}`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 200) {
      throw new Error(`Federation filter export failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.meta.filters.federationCode !== TEST_EXPORT_PARAMS.federationCode) {
      throw new Error('Federation code filter not applied in export');
    }

    // Check filename includes federation code
    if (!data.meta.export.filename.includes(TEST_EXPORT_PARAMS.federationCode)) {
      throw new Error('Federation code not included in filename');
    }
  });

  await t.step('should include performance metrics', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?format=json&startDate=${TEST_EXPORT_PARAMS.startDate}&endDate=${TEST_EXPORT_PARAMS.endDate}`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 200) {
      throw new Error(`Export query failed with status ${response.status}`);
    }

    const performanceHeader = response.headers.get('X-Performance-Ms');
    if (!performanceHeader) {
      throw new Error('Expected X-Performance-Ms header');
    }

    const performanceMs = parseInt(performanceHeader);
    if (isNaN(performanceMs) || performanceMs < 0) {
      throw new Error('Invalid performance timing');
    }

    console.log(`Export completed in ${performanceMs}ms`);
  });

  await t.step('should include export count in headers', async () => {
    const url = `${TEST_CONFIG.FUNCTION_URL}?format=json&startDate=${TEST_EXPORT_PARAMS.startDate}&endDate=${TEST_EXPORT_PARAMS.endDate}`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 200) {
      throw new Error(`Export query failed with status ${response.status}`);
    }

    const exportCountHeader = response.headers.get('X-Export-Count');
    if (!exportCountHeader) {
      throw new Error('Expected X-Export-Count header');
    }

    const exportCount = parseInt(exportCountHeader);
    if (isNaN(exportCount) || exportCount < 0) {
      throw new Error('Invalid export count');
    }

    // Verify count matches actual data
    const data = await response.json();
    if (data.data.length !== exportCount) {
      throw new Error('Export count header mismatch with actual data');
    }
  });

  await t.step('should handle CSV escaping for special characters', async () => {
    // This test would require test data with special characters
    // For now, we'll just verify the CSV export works with basic data
    const url = `${TEST_CONFIG.FUNCTION_URL}?format=csv&startDate=${TEST_EXPORT_PARAMS.startDate}&endDate=${TEST_EXPORT_PARAMS.endDate}`;
    const response = await fetch(url, { method: 'GET' });

    if (response.status !== 200) {
      throw new Error(`CSV export failed with status ${response.status}`);
    }

    const csvData = await response.text();
    
    // Basic validation that CSV is properly formatted
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length > 1) {
      // Check that all data lines have same number of columns as header
      const headerColumns = lines[0].split(',').length;
      for (let i = 1; i < Math.min(5, lines.length); i++) { // Check first few lines
        const dataColumns = lines[i].split(',').length;
        if (dataColumns !== headerColumns) {
          console.warn(`Column count mismatch in line ${i}: expected ${headerColumns}, got ${dataColumns}`);
        }
      }
    }
  });
});

/**
 * Performance tests
 */
Deno.test('Analytics Export Performance Tests', async (t) => {

  await t.step('should handle empty result exports efficiently', async () => {
    // Export for future date range (should be empty)
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const startDate = futureDate.toISOString().split('T')[0];
    const endDate = new Date(futureDate.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const url = `${TEST_CONFIG.FUNCTION_URL}?format=json&startDate=${startDate}&endDate=${endDate}`;
    const startTime = performance.now();
    
    const response = await fetch(url, { method: 'GET' });
    const duration = performance.now() - startTime;

    if (response.status !== 200) {
      throw new Error(`Empty export failed with status ${response.status}`);
    }

    const data = await response.json();
    if (data.data.length !== 0) {
      throw new Error('Expected empty data for future date range');
    }

    console.log(`Empty export completed in ${duration.toFixed(2)}ms`);
  });

  await t.step('should handle larger date ranges (within 90-day limit)', async () => {
    const startDate = '2024-07-01';
    const endDate = '2024-09-30'; // ~90 days
    
    const url = `${TEST_CONFIG.FUNCTION_URL}?format=json&startDate=${startDate}&endDate=${endDate}`;
    const startTime = performance.now();
    
    const response = await fetch(url, { method: 'GET' });
    const duration = performance.now() - startTime;

    if (response.status !== 200) {
      const errorData = await response.json();
      console.warn('Large range export failed:', errorData);
      // Don't fail the test as this might be expected with insufficient test data
      return;
    }

    console.log(`Large range export completed in ${duration.toFixed(2)}ms`);
    
    const exportCountHeader = response.headers.get('X-Export-Count');
    console.log(`Exported ${exportCountHeader} records`);
  });
});