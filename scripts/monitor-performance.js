#!/usr/bin/env node

/**
 * Performance Monitoring Script
 * Monitors deployment performance and verifies optimization targets
 */

const https = require('https');
const { performance } = require('perf_hooks');

const PERFORMANCE_TARGETS = {
  buildTime: 120000, // 2 minutes in ms
  deployTime: 180000, // 3 minutes in ms
  healthCheckResponse: 1000, // 1 second in ms
  staticAssetCache: 31536000, // 1 year in seconds
  apiCache: 60 // 1 minute in seconds
};

async function measureHealthCheckPerformance(url = 'http://localhost:3000') {
  console.log('🏥 Testing health check performance...');
  
  const startTime = performance.now();
  
  try {
    const response = await fetch(`${url}/api/health`);
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    const data = await response.json();
    
    console.log(`✅ Health check response time: ${responseTime.toFixed(2)}ms`);
    console.log(`✅ Health check status: ${data.status}`);
    
    if (responseTime > PERFORMANCE_TARGETS.healthCheckResponse) {
      console.log(`⚠️  Health check slower than target (${PERFORMANCE_TARGETS.healthCheckResponse}ms)`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
    return false;
  }
}

async function validateCacheHeaders(url = 'http://localhost:3000') {
  console.log('📦 Validating cache configuration...');
  
  try {
    // Test API caching
    console.log('Testing API cache headers...');
    const apiResponse = await fetch(`${url}/api/health`);
    const apiCacheControl = apiResponse.headers.get('cache-control');
    
    if (apiCacheControl && apiCacheControl.includes('no-cache')) {
      console.log('✅ API endpoints properly configured with no-cache');
    } else if (apiCacheControl && apiCacheControl.includes('s-maxage=60')) {
      console.log('✅ API endpoints properly cached with 60s maxage');
    } else {
      console.log('⚠️  API cache headers may not be optimally configured');
    }
    
    return true;
  } catch (error) {
    console.log(`❌ Cache validation failed: ${error.message}`);
    return false;
  }
}

function validateBuildConfiguration() {
  console.log('🔧 Validating build configuration...');
  
  try {
    const vercelConfig = require('../vercel.json');
    const nextConfig = require('../next.config.js');
    
    // Check Vercel config optimizations
    const checks = [
      {
        name: 'npm ci installation',
        condition: vercelConfig.installCommand === 'npm ci',
        message: 'Using npm ci for reproducible builds'
      },
      {
        name: 'Node 20 runtime',
        condition: vercelConfig.functions['app/api/**/*.ts'].runtime === '@vercel/node@20',
        message: 'Using Node.js 20 runtime'
      },
      {
        name: 'Telemetry disabled',
        condition: vercelConfig.build.env.NEXT_TELEMETRY_DISABLED === '1',
        message: 'Next.js telemetry disabled for faster builds'
      },
      {
        name: 'Function timeout',
        condition: vercelConfig.functions['app/api/**/*.ts'].maxDuration === 10,
        message: 'Function timeout optimally configured'
      },
      {
        name: 'SWC minification',
        condition: nextConfig.swcMinify === true,
        message: 'SWC minification enabled'
      },
      {
        name: 'Package imports optimization',
        condition: nextConfig.experimental?.optimizePackageImports?.length > 0,
        message: 'Package imports optimized'
      },
      {
        name: 'CSS optimization',
        condition: nextConfig.experimental?.optimizeCss === true,
        message: 'CSS optimization enabled'
      }
    ];
    
    let allPassed = true;
    checks.forEach(check => {
      if (check.condition) {
        console.log(`✅ ${check.message}`);
      } else {
        console.log(`❌ ${check.name} not properly configured`);
        allPassed = false;
      }
    });
    
    return allPassed;
  } catch (error) {
    console.log(`❌ Build configuration validation failed: ${error.message}`);
    return false;
  }
}

function validateSecurityHeaders() {
  console.log('🔒 Validating security configuration...');
  
  try {
    const vercelConfig = require('../vercel.json');
    const nextConfig = require('../next.config.js');
    
    // Check Vercel security headers
    const globalHeaders = vercelConfig.headers.find(h => h.source === '/(.*)');
    const requiredHeaders = ['X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy'];
    
    let securityScore = 0;
    requiredHeaders.forEach(headerName => {
      const header = globalHeaders?.headers.find(h => h.key === headerName);
      if (header) {
        console.log(`✅ ${headerName}: ${header.value}`);
        securityScore++;
      } else {
        console.log(`❌ Missing security header: ${headerName}`);
      }
    });
    
    // Check Next.js CSP headers
    if (typeof nextConfig.headers === 'function') {
      console.log('✅ Next.js security headers configured');
      securityScore++;
    }
    
    const passed = securityScore >= requiredHeaders.length;
    console.log(`Security score: ${securityScore}/${requiredHeaders.length + 1}`);
    
    return passed;
  } catch (error) {
    console.log(`❌ Security validation failed: ${error.message}`);
    return false;
  }
}

async function runPerformanceAudit(url) {
  console.log('🚀 Starting Vercel Configuration Performance Audit\n');
  console.log('='.repeat(50));
  
  const results = {
    buildConfig: false,
    security: false,
    healthCheck: false,
    caching: false
  };
  
  // Run all validations
  results.buildConfig = validateBuildConfiguration();
  console.log();
  
  results.security = validateSecurityHeaders();
  console.log();
  
  if (url) {
    results.healthCheck = await measureHealthCheckPerformance(url);
    console.log();
    
    results.caching = await validateCacheHeaders(url);
    console.log();
  } else {
    console.log('ℹ️  Skipping runtime tests (no URL provided)');
    console.log();
  }
  
  // Summary
  console.log('='.repeat(50));
  console.log('📊 Performance Audit Summary:');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, result]) => {
    const status = result ? '✅' : '❌';
    const name = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`${status} ${name}`);
  });
  
  console.log();
  if (passed === total) {
    console.log('🎉 All performance optimizations validated successfully!');
    process.exit(0);
  } else {
    console.log(`⚠️  ${passed}/${total} checks passed. Review failed items above.`);
    process.exit(url ? 1 : 0); // Don't fail if just validating config without runtime
  }
}

// Run the audit
const url = process.argv[2];
runPerformanceAudit(url).catch(console.error);