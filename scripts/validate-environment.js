#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates that all required environment variables are properly configured
 */

const requiredEnvVars = [
  'NODE_ENV',
  'NEXT_TELEMETRY_DISABLED'
];

const optionalEnvVars = [
  'VERCEL_URL',
  'VERCEL_ENV',
  'API_BASE_URL',
  'API_TIMEOUT'
];

function validateEnvironment() {
  console.log('🔍 Validating environment configuration...\n');

  let hasErrors = false;
  const warnings = [];

  // Check required variables
  console.log('📋 Required Environment Variables:');
  requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      // For local development, provide default values
      if (varName === 'NODE_ENV') {
        process.env.NODE_ENV = 'development';
        console.log(`✅ ${varName}: development (defaulted for local)`);
      } else if (varName === 'NEXT_TELEMETRY_DISABLED') {
        process.env.NEXT_TELEMETRY_DISABLED = '1';
        console.log(`✅ ${varName}: 1 (defaulted for local)`);
      } else {
        console.log(`❌ ${varName}: Missing (required)`);
        hasErrors = true;
      }
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  });

  // Check optional variables
  console.log('\n📋 Optional Environment Variables:');
  optionalEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      console.log(`⚠️  ${varName}: Not set (optional)`);
      warnings.push(varName);
    } else {
      console.log(`✅ ${varName}: ${value}`);
    }
  });

  // Environment-specific validations
  console.log('\n🔧 Environment-Specific Checks:');
  
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') {
    console.log('✅ Production environment detected');
    
    // Verify telemetry is disabled in production
    if (process.env.NEXT_TELEMETRY_DISABLED !== '1') {
      console.log('⚠️  NEXT_TELEMETRY_DISABLED should be "1" in production');
      warnings.push('NEXT_TELEMETRY_DISABLED');
    } else {
      console.log('✅ Next.js telemetry properly disabled');
    }
  } else {
    console.log(`✅ Development/test environment detected: ${nodeEnv}`);
  }

  // Vercel-specific checks
  if (process.env.VERCEL) {
    console.log('✅ Running on Vercel platform');
    
    if (process.env.VERCEL_URL) {
      console.log(`✅ Vercel URL: ${process.env.VERCEL_URL}`);
    }
    
    if (process.env.VERCEL_ENV) {
      console.log(`✅ Vercel Environment: ${process.env.VERCEL_ENV}`);
    }
  } else {
    console.log('ℹ️  Running locally (not on Vercel)');
  }

  // Summary
  console.log('\n📊 Validation Summary:');
  if (hasErrors) {
    console.log('❌ Environment validation failed - missing required variables');
    process.exit(1);
  } else if (warnings.length > 0) {
    console.log(`⚠️  Environment validation passed with ${warnings.length} warnings`);
    console.log('   Optional variables not set:', warnings.join(', '));
    process.exit(0);
  } else {
    console.log('✅ Environment validation passed - all checks successful');
    process.exit(0);
  }
}

// Run validation
validateEnvironment();