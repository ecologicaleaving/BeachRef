#!/usr/bin/env node

/**
 * Deployment Reliability Testing Script
 * Tests the deployment pipeline configuration for reliability and performance
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function measureTime(label, fn) {
  const start = Date.now();
  try {
    const result = fn();
    const duration = Date.now() - start;
    console.log(`✓ ${label}: ${duration}ms`);
    return { success: true, duration, result };
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`❌ ${label}: ${duration}ms (FAILED)`);
    return { success: false, duration, error: error.message };
  }
}

function testCIWorkflow() {
  console.log('🧪 Testing CI workflow simulation...\n');
  
  const results = [];
  
  // Test npm ci installation
  results.push(measureTime('npm ci', () => {
    execSync('npm ci --no-audit --no-fund', { stdio: 'pipe' });
  }));
  
  // Test linting
  results.push(measureTime('ESLint', () => {
    execSync('npm run lint', { stdio: 'pipe' });
  }));
  
  // Test type checking
  results.push(measureTime('TypeScript compilation', () => {
    execSync('npm run type-check', { stdio: 'pipe' });
  }));
  
  // Test suite
  results.push(measureTime('Jest tests', () => {
    execSync('npm test -- --passWithNoTests', { stdio: 'pipe' });
  }));
  
  return results;
}

function testBuildProcess() {
  console.log('🏗️ Testing production build process...\n');
  
  const results = [];
  
  // Test production build
  results.push(measureTime('Production build', () => {
    execSync('npm run build', { stdio: 'pipe' });
  }));
  
  // Verify build output
  const buildDir = path.join(process.cwd(), '.next');
  if (!fs.existsSync(buildDir)) {
    throw new Error('Build output directory not found');
  }
  
  console.log('✓ Build output verified');
  
  return results;
}

function testDeploymentValidation() {
  console.log('🔍 Testing deployment validation...\n');
  
  const results = [];
  
  results.push(measureTime('Deployment validation', () => {
    execSync('npm run validate-deployment', { stdio: 'pipe' });
  }));
  
  return results;
}

function analyzeResults(allResults) {
  console.log('\n📊 Performance Analysis:\n');
  
  const flat = allResults.flat();
  const successful = flat.filter(r => r.success);
  const failed = flat.filter(r => !r.success);
  
  console.log(`✅ Successful operations: ${successful.length}`);
  console.log(`❌ Failed operations: ${failed.length}`);
  
  if (failed.length > 0) {
    console.log('\n💥 Failures:');
    failed.forEach(f => console.log(`  - ${f.error}`));
    return false;
  }
  
  const totalTime = successful.reduce((sum, r) => sum + r.duration, 0);
  console.log(`⏱️ Total pipeline time: ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`);
  
  // Check performance targets from story (5 minutes total)
  const targetBuildTime = 5 * 60 * 1000; // 5 minutes in ms
  
  if (totalTime < targetBuildTime) {
    console.log(`🎯 Performance target MET: <5min (actual: ${(totalTime / 1000).toFixed(1)}s)`);
  } else {
    console.log(`⚠️ Performance target MISSED: <5min (actual: ${(totalTime / 1000).toFixed(1)}s)`);
  }
  
  return true;
}

async function main() {
  try {
    console.log('🚀 Starting deployment reliability testing...\n');
    
    const allResults = [];
    
    // Run all test phases
    allResults.push(testCIWorkflow());
    allResults.push(testBuildProcess());
    allResults.push(testDeploymentValidation());
    
    // Analyze results
    const success = analyzeResults(allResults);
    
    if (success) {
      console.log('\n✅ All deployment reliability tests passed!');
      console.log('🎉 Pipeline is ready for production deployment');
    } else {
      console.log('\n❌ Some tests failed. Please review and fix issues.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Testing failed:');
    console.error(error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}