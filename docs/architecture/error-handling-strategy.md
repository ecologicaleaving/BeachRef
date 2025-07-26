# Error Handling Strategy

## General Approach
- **Error Model:** Result<T, Error> pattern with custom error types
- **Exception Hierarchy:** Structured error classes (NetworkError, CacheError, AuthError, VISError)
- **Error Propagation:** BLoC error states, user-friendly error messages, detailed logging

## Logging Standards
- **Library:** logger 2.0.0+ with structured logging
- **Format:** JSON structured logs with correlation IDs
- **Levels:** ERROR (user-facing), WARN (degraded), INFO (important events), DEBUG (development)
- **Required Context:**
  - Correlation ID: UUID v4 per user session
  - Service Context: Component name and version
  - User Context: Anonymized user ID (no PII in logs)

## Error Handling Patterns

### External API Errors
- **Retry Policy:** Exponential backoff (1s, 2s, 4s, 8s) for VIS API calls
- **Circuit Breaker:** Open circuit after 5 consecutive failures, close after 30s success
- **Timeout Configuration:** 10s for VIS calls, 5s for Supabase calls
- **Error Translation:** Map VIS errors to user-friendly messages, maintain cache during failures

### Business Logic Errors
- **Custom Exceptions:** InvalidTournamentFilter, BookmarkLimit, SyncConflict
- **User-Facing Errors:** Clear, actionable messages with retry options
- **Error Codes:** Structured error codes for debugging (VIS_001, CACHE_002, etc.)

### Data Consistency
- **Transaction Strategy:** Supabase transactions for multi-table operations
- **Compensation Logic:** Rollback cache updates on sync failures
- **Idempotency:** Idempotent sync operations with unique request IDs
