#!/usr/bin/env node

/**
 * Deployment Pipeline Validation Script
 * Validates that deployment configuration is consistent across environments
 */

const fs = require('fs');
const path = require('path');

function validatePackageJson() {
  const packagePath = path.join(process.cwd(), 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  console.log('✓ Checking package.json configuration...');
  
  // Check engines field
  if (!pkg.engines || !pkg.engines.node) {
    throw new Error('❌ Missing Node.js version specification in package.json engines field');
  }
  
  if (!pkg.engines.node.includes('20')) {
    throw new Error(`❌ Node.js version should be 20.x, found: ${pkg.engines.node}`);
  }
  
  console.log(`✓ Node.js version constraint: ${pkg.engines.node}`);
  return true;
}

function validateVercelConfig() {
  const vercelPath = path.join(process.cwd(), 'vercel.json');
  
  if (!fs.existsSync(vercelPath)) {
    throw new Error('❌ vercel.json not found');
  }
  
  const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  
  console.log('✓ Checking vercel.json configuration...');
  
  // Check install command
  if (vercelConfig.installCommand !== 'npm ci') {
    throw new Error(`❌ Vercel should use 'npm ci', found: ${vercelConfig.installCommand}`);
  }
  
  // Check Node runtime if specified
  if (vercelConfig.functions && vercelConfig.functions['app/api/**/*.ts']) {
    const runtime = vercelConfig.functions['app/api/**/*.ts'].runtime;
    if (!runtime.includes('20')) {
      throw new Error(`❌ Vercel runtime should be Node 20, found: ${runtime}`);
    }
  }
  
  console.log('✓ Vercel configuration valid');
  return true;
}

function validateGitHubActions() {
  const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'deploy.yml');
  
  if (!fs.existsSync(workflowPath)) {
    throw new Error('❌ GitHub Actions workflow not found');
  }
  
  const workflow = fs.readFileSync(workflowPath, 'utf8');
  
  console.log('✓ Checking GitHub Actions workflow...');
  
  // Check Node version
  if (!workflow.includes("node-version: '20'")) {
    throw new Error('❌ GitHub Actions should use Node.js 20');
  }
  
  // Check for npm ci usage
  if (!workflow.includes('npm ci')) {
    throw new Error('❌ GitHub Actions should use npm ci');
  }
  
  // Ensure no build step in CI workflow (Vercel handles deployment)
  if (workflow.includes('npm run build') && !workflow.includes('# Build handled by Vercel')) {
    console.log('⚠️ Note: Build step detected in GitHub Actions (should be handled by Vercel only)');
  }
  
  console.log('✓ GitHub Actions workflow valid');
  return true;
}

function validatePackageLock() {
  const lockPath = path.join(process.cwd(), 'package-lock.json');
  
  if (!fs.existsSync(lockPath)) {
    throw new Error('❌ package-lock.json not found');
  }
  
  console.log('✓ package-lock.json exists');
  return true;
}

async function main() {
  try {
    console.log('🔍 Validating deployment pipeline configuration...\n');
    
    validatePackageJson();
    validateVercelConfig();
    validateGitHubActions();
    validatePackageLock();
    
    console.log('\n✅ All deployment pipeline validations passed!');
    console.log('🚀 Configuration is ready for reliable deployment');
    
  } catch (error) {
    console.error('\n💥 Validation failed:');
    console.error(error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { validatePackageJson, validateVercelConfig, validateGitHubActions, validatePackageLock };