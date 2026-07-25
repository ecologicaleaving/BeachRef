# CI/CD Deployment Setup Guide

## Overview
This repository is configured with GitHub Actions to automatically build and deploy your Expo web app to Netlify when you push to the `master` branch.

## Required Secrets

You need to set up the following secrets in your GitHub repository settings:

### 1. Netlify Secrets

**NETLIFY_AUTH_TOKEN**
- Go to [Netlify Account Settings](https://app.netlify.com/user/applications#personal-access-tokens)
- Generate a new personal access token
- Copy the token and add it as a repository secret

**NETLIFY_SITE_ID**
- Go to your Netlify site dashboard
- Go to Site Settings > General > Site details
- Copy the "Site ID" (it looks like: `abcd1234-5678-90ef-ghij-klmnopqrstuv`)
- Add it as a repository secret

### 2. Setting Up Repository Secrets

1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** > **Actions**
4. Click **New repository secret**
5. Add each secret:
   - Name: `NETLIFY_AUTH_TOKEN`, Value: your Netlify personal access token
   - Name: `NETLIFY_SITE_ID`, Value: your Netlify site ID

## Workflow Features

The CI/CD pipeline includes:

✅ **Automated Testing**: Runs linting and tests on every push/PR  
✅ **Web Build**: Builds your Expo web app for production  
✅ **Production Deployment**: Deploys to Netlify on `master` branch pushes  
✅ **Preview Deployments**: Creates preview deployments for Pull Requests  
✅ **Build Caching**: Uses npm cache for faster builds  

## Manual Deployment (Backup)

If you need to deploy manually:

```bash
# Build the web app
npx expo export --platform web

# Install Netlify CLI (if not installed)
npm install -g netlify-cli

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure `npm run lint` and `npm test` pass locally
- Check GitHub Actions logs for specific errors

### Deployment Fails
- Verify Netlify secrets are correctly set
- Check that your Netlify site exists and is accessible
- Ensure the build output directory is `dist`

### Expo Build Issues
- Make sure `expo` is listed in dependencies or devDependencies
- Check that `app.json` has proper web configuration
- Verify all required assets exist (icon, splash screen, etc.)

## Netlify Configuration

Your `netlify.toml` is already configured with:
- Build command: `npx expo export --platform web`
- Publish directory: `dist`
- SPA redirects for React Router
- Security headers
- Cache optimization

## Next Steps

1. Set up the required secrets in GitHub
2. Push to `master` branch to trigger the first deployment
3. Monitor the GitHub Actions tab for build progress
4. Your app will be live at your Netlify URL once deployment completes!