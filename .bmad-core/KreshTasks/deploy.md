# /deploy Task

When this command is used, execute the following deployment task:

# deploy

Execute a simple deployment process that builds the project locally (ensuring Vercel compatibility), resolves basic build errors, commits changes, and pushes to GitHub. The push to GitHub will automatically trigger Vercel deployment.

## Command Usage

```
/deploy-github [branch-name]
```

- `branch-name` (optional): Target branch for commit and push. If not provided, uses current branch.

## Prerequisites

- Git repository must be initialized
- Working directory should contain a valid project with build configuration

## Deployment Process

1. **Quick Pre-checks**
   - Verify git repository status
   - Check current/target branch
   - Confirm build configuration exists (package.json, next.config.js, etc.)

2. **Local Build Verification**
   - Execute build command locally (npm run build, yarn build)
   - Ensure build works and is Vercel-compatible
   - If build fails, attempt basic fixes:
     - Run `npm install` for missing dependencies
     - Clear cache and retry (`rm -rf .next` for Next.js projects)
     - Fix obvious import/export issues
     - Maximum 3 retry attempts
   - Display build output (success means Vercel will build successfully too)

3. **Git Operations**
   - Stage all changes (`git add .`)
   - Create simple commit message: `deploy: [timestamp]` or custom message
   - Switch to target branch if specified
   - Commit changes
   - Push to GitHub origin

4. **Deployment Trigger**
   - Push to GitHub automatically triggers Vercel deployment
   - Display GitHub push confirmation
   - Note that Vercel deployment will start automatically

5. **Simple Summary**
   - Local build status
   - Commit hash
   - GitHub push status
   - Vercel deployment status (triggered automatically)

## Basic Error Resolution

### Local Build Errors
- **Missing Dependencies**: Run `npm install`
- **Cache Issues**: Clear build cache (`.next`, `dist`, etc.)
- **Simple Import Errors**: Fix obvious path issues
- **Build Verification**: Ensure local build works (guarantees Vercel build will work)

### Git Issues
- **Branch not found**: Create branch if specified
- **Push conflicts**: Simple pull and retry push to GitHub

## Command Output Format

```
🚀 Starting deployment...

📋 Checks:
✓ Git repository detected
✓ Target branch: feature/new-feature

🔨 Building locally...
⚠️ Build failed: Missing dependency
🔧 Running npm install...
🔨 Rebuilding...
✓ Local build successful (Vercel-ready)

📝 Committing...
✓ Staged changes
✓ Committed: abc123f

🚀 Pushing to GitHub...
✓ Pushed to origin/feature/new-feature
🎯 Vercel deployment triggered automatically

✅ Deploy complete!
```

## Key Principles

- **Local verification**: Build locally to ensure Vercel compatibility
- **GitHub-based deployment**: Push to GitHub triggers automatic Vercel deployment
- **Development-friendly**: Quick iterations, minimal overhead
- **Auto-fix basics**: Handle common build issues automatically
- **Hands-off**: Once pushed to GitHub, Vercel handles the rest

## Blocking Conditions

Stop deployment if:
- Build fails after 3 retry attempts
- Major git conflicts that need manual resolution
- Critical errors that can't be auto-resolved

## Future Enhancement

This is the development version. A `deploy-production` command will be created later with:
- Comprehensive testing
- Security validations
- Production-ready checks
- Advanced error handling

## Completion

After deployment:
- ✅ **Success**: Built locally, pushed to GitHub, Vercel deployment triggered
- ⚠️ **Partial**: Pushed with warnings, check Vercel deployment status
- ❌ **Failed**: Manual intervention required before push