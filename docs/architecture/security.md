# Security

## Input Validation
- **Validation Library:** Built-in Dart validation with custom validators
- **Validation Location:** At service boundaries before business logic processing
- **Required Rules:**
  - All user inputs MUST be validated and sanitized
  - Tournament filters validated against allowed values
  - Search queries sanitized to prevent injection attacks

## Authentication & Authorization
- **Auth Method:** Google OAuth 2.0 via Supabase Auth with JWT tokens
- **Session Management:** Automatic token refresh with secure local storage
- **Required Patterns:**
  - All authenticated requests include valid JWT token
  - Token validation on every Supabase request
  - Automatic logout on token expiration

## Secrets Management
- **Development:** Environment variables in `.env` files (never committed)
- **Production:** Vercel environment variables and Supabase project settings
- **Code Requirements:**
  - NEVER hardcode API keys, tokens, or credentials
  - Access secrets via flutter_dotenv configuration service only
  - No secrets in logs, error messages, or user-facing content

## API Security
- **Rate Limiting:** Enforced at Supabase Edge Function level
- **CORS Policy:** Restricted to production domain and localhost for development
- **Security Headers:** HTTPS-only, secure cookie flags, CSP headers
- **HTTPS Enforcement:** All production traffic HTTPS-only via Vercel

## Data Protection
- **Encryption at Rest:** Supabase PostgreSQL encryption (managed)
- **Encryption in Transit:** TLS 1.3 for all API communications
- **PII Handling:** Minimal PII collection, Google profile data only
- **Logging Restrictions:** Never log user tokens, personal information, or sensitive tournament data

## Dependency Security
- **Scanning Tool:** GitHub Dependabot with automatic security updates
- **Update Policy:** Weekly dependency updates, immediate for security patches
- **Approval Process:** All new dependencies reviewed for security and licensing

## Security Testing
- **SAST Tool:** GitHub CodeQL analysis on every push
- **DAST Tool:** Manual security review for authentication flows
- **Penetration Testing:** Annual third-party security assessment (when production ready)
