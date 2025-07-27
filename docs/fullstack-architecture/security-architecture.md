# Security Architecture

## Security Requirements (MVP)

**Data Protection:**
- All VIS API communications encrypted with HTTPS
- API keys stored in environment variables
- No sensitive data stored in browser localStorage

**Application Security:**
- CORS middleware configured for frontend domain
- Rate limiting to prevent API abuse
- Input validation and sanitization
- Security headers (helmet.js)

**Privacy Compliance:**
- No user data collection in MVP
- Public tournament data only
- GDPR compliance for EU users (data minimization)

## Security Implementation

```typescript
// Security Middleware Stack
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: false,
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // requests per window
}));
```
