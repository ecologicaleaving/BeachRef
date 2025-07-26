# Infrastructure and Deployment

## Infrastructure as Code
- **Tool:** Supabase CLI + Vercel CLI
- **Location:** `supabase/` directory for database, `vercel.json` for deployment
- **Approach:** GitOps with automatic deployment on push to main

## Deployment Strategy
- **Strategy:** Continuous deployment with GitHub Actions
- **CI/CD Platform:** GitHub Actions + Vercel integration
- **Pipeline Configuration:** `.github/workflows/deploy.yml`

## Environments
- **Development:** Local Flutter + Supabase local development
- **Staging:** Vercel preview deployments + Supabase staging project
- **Production:** Vercel production + Supabase production project

## Environment Promotion Flow
```
Local Development → GitHub Push → Vercel Preview → Manual Promotion → Production
                     ↓                ↓                    ↓
                 Run Tests    Staging Database    Production Database
```

## Rollback Strategy
- **Primary Method:** Vercel instant rollback via dashboard or CLI
- **Trigger Conditions:** Failed health checks, user-reported critical issues
- **Recovery Time Objective:** < 5 minutes for rollback execution
