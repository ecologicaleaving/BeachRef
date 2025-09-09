# VIS Adapter Edge Function

A Supabase Edge Function that acts as a simplified proxy between the BeachRef app and the complex VIS (Volleyball Information System) API.

## Overview

This Edge Function provides:
- Clean, simplified VIS data endpoints
- Authentication and rate limiting protection
- Comprehensive error handling and logging
- Health check monitoring

## Local Development Setup

### Prerequisites
- Deno runtime installed
- Supabase CLI installed
- Access to VIS API credentials

### Environment Variables

Set the following environment variables:

```bash
# Required: VIS API endpoint URL
VIS_API_URL=https://vis-api.example.com/endpoint

# Optional: Additional headers for VIS API authentication
VIS_API_HEADERS={"Authorization":"Bearer token","Custom-Header":"value"}
```

### Running Locally

1. Navigate to the function directory:
   ```bash
   cd supabase/functions/vis-adapter
   ```

2. Run the development server:
   ```bash
   deno run --allow-all --watch index.ts
   ```

3. Test the health check endpoint:
   ```bash
   curl http://localhost:8000/health
   ```

## Deployment

### Deploy to Supabase

1. Ensure you have the Supabase CLI logged in:
   ```bash
   supabase login
   ```

2. Deploy the function:
   ```bash
   supabase functions deploy vis-adapter
   ```

3. Set environment variables:
   ```bash
   supabase secrets set VIS_API_URL=your-vis-api-url
   supabase secrets set VIS_API_HEADERS='{"Authorization":"Bearer your-token"}'
   ```

## API Endpoints

### Health Check
- **URL**: `/health`
- **Method**: `GET`
- **Description**: Returns service status and VIS API connectivity
- **Response**:
  ```json
  {
    "status": "healthy",
    "service": "vis-adapter",
    "timestamp": "2025-01-09T10:00:00.000Z",
    "vis_connectivity": true,
    "environment": {
      "vis_api_configured": true
    }
  }
  ```

### Error Responses

The function returns structured error responses:

```json
{
  "error": "VIS_API_ERROR",
  "message": "VIS API Error: Access denied - check API credentials",
  "details": {
    "originalError": "Error details"
  },
  "timestamp": "2025-01-09T10:00:00.000Z"
}
```

Error types:
- `VALIDATION_ERROR` (400) - Invalid request data
- `VIS_API_ERROR` (502) - VIS API issues
- `NETWORK_ERROR` (503) - Network connectivity problems
- `INTERNAL_ERROR` (500) - Unexpected server errors

## Testing

### Unit Tests
```bash
deno test --allow-all
```

### Integration Testing
1. Test health check:
   ```bash
   curl -X GET http://localhost:8000/health
   ```

2. Test CORS preflight:
   ```bash
   curl -X OPTIONS http://localhost:8000/health
   ```

3. Test error handling:
   ```bash
   curl -X PUT http://localhost:8000/invalid-endpoint
   ```

## Debugging

### Logs
- All errors are logged to console with structured context
- Use Supabase dashboard to view logs in production
- Health check includes VIS connectivity testing

### Common Issues

1. **VIS API Connection Failed**
   - Check `VIS_API_URL` environment variable
   - Verify VIS API credentials in `VIS_API_HEADERS`
   - Test connectivity from local environment

2. **CORS Issues**
   - Edge function includes proper CORS headers
   - Supports preflight OPTIONS requests

3. **Timeout Errors**
   - Default timeout is 10 seconds
   - VIS API may be slow during peak hours

## Architecture Notes

This is the foundation layer for the VIS data architecture restructuring. Future enhancements will add:
- Tournament data endpoints (`/vis/tournaments`)
- Match data endpoints (`/vis/matches`)
- Referee data endpoints (`/vis/referees`)
- Intelligent caching and rate limiting

## Files Structure

```
supabase/functions/vis-adapter/
├── index.ts           # Main Edge Function handler
├── vis-client.ts      # VIS API client wrapper
├── deno.json         # Deno configuration
└── README.md         # This documentation
```