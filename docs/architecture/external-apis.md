# External APIs

## FIVB VIS API
- **Purpose:** Official source for tournament, match, and referee data
- **Documentation:** Available via FIVB (specific URL needed)
- **Base URL(s):** TBD - requires FIVB coordination
- **Authentication:** API key or OAuth (requires negotiation)
- **Rate Limits:** ~30 seconds between calls (negotiable for critical updates)

**Key Endpoints Used:**
- `GET /tournaments` - Tournament listings with filters
- `GET /tournaments/{id}/matches` - Match data and results
- `GET /tournaments/{id}/referees` - Referee assignments
- `GET /matches/{id}/statistics` - Detailed match statistics

**Integration Notes:** All VIS calls routed through Supabase Edge Functions for rate limiting, caching, and error handling. Critical updates may negotiate faster refresh intervals.

## Google OAuth API
- **Purpose:** User authentication via Google accounts
- **Documentation:** https://developers.google.com/identity/protocols/oauth2
- **Base URL(s):** https://accounts.google.com/oauth/
- **Authentication:** OAuth 2.0 with Supabase integration
- **Rate Limits:** Standard Google API limits (generous for auth use case)

**Key Endpoints Used:**
- `POST /oauth2/token` - Exchange authorization code for tokens
- `GET /oauth2/userinfo` - Retrieve user profile information

**Integration Notes:** Handled via Supabase Auth provider, automatically manages token refresh and session persistence.
