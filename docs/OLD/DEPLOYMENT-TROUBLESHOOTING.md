# Deployment Troubleshooting Guide

## Pipeline Architecture Overview

The BeachRef application uses a **single-pipeline deployment strategy** with clear separation of concerns:

- **GitHub Actions**: Handles CI/CD testing (lint, type-check, tests)
- **Vercel**: Handles production builds and deployment

## Environment Specifications

- **Node.js Version**: 20.x (standardized across all environments)
- **Package Manager**: npm ci (consistent dependency installation)
- **Build Process**: Single build on Vercel (eliminates dual-build conflicts)

## Common Issues & Solutions

### 1. Deployment Failures

**Symptom**: Vercel deployment fails with build errors

**Solution**:
```bash
# Validate local configuration
npm run validate-deployment

# Test full build locally
npm run build

# Check Node version consistency
node --version  # Should be 20.x
```

### 2. Package Installation Issues

**Symptom**: npm ci fails or produces different results than npm install

**Solution**:
```bash
# Regenerate consistent lock file
rm package-lock.json
npm install

# Verify lock file is committed
git add package-lock.json
git commit -m "Update package-lock.json for deployment consistency"
```

### 3. GitHub Actions vs Vercel Conflicts

**Symptom**: Different build results between GitHub Actions and Vercel

**Solution**:
- GitHub Actions should NOT run `npm run build`
- Only Vercel should build for deployment
- GitHub Actions tests (lint, type-check, tests) should pass first

### 4. Node Version Mismatches

**Symptom**: Different behavior between local and deployed environment

**Solution**:
```bash
# Check all configuration files specify Node 20:
# - package.json: "engines.node": ">=20.0.0"
# - .github/workflows/deploy.yml: node-version: '20'
# - vercel.json: runtime: "@vercel/node@20"
```

## Performance Targets

- **Build Time**: <2 minutes (achieved through single-build strategy)
- **Deploy Time**: <5 minutes total from push to live
- **Success Rate**: >95% (achieved through environment consistency)

## Validation Commands

```bash
# Validate deployment configuration
npm run validate-deployment

# Test full CI pipeline locally
npm run ci:local

# Test exact GitHub Actions environment
npm run ci:test-exactly
```

## Rollback Procedures

If a deployment fails:

1. **Automatic**: Vercel automatically maintains previous successful deployment
2. **Manual**: Use Vercel dashboard to rollback to specific deployment
3. **Git**: Revert commit and push to trigger new deployment

## Health Checks

The deployment pipeline includes built-in health checks:

- **Pre-deployment**: All CI tests must pass (lint, type-check, tests)
- **Build verification**: Production build must complete successfully
- **Post-deployment**: Vercel health checks confirm app is responding

## Contact & Support

For deployment issues not covered in this guide:

- Check Vercel deployment logs
- Review GitHub Actions workflow results  
- Validate configuration with `npm run validate-deployment`