# Error Handling and Response Patterns

This document describes error handling patterns and response structures for the FIVB VIS API.

## HTTP Status Codes

The VIS API uses standard HTTP status codes to indicate the success or failure of requests:

### Success Codes
- **200 OK**: Request successful, response contains data
- **204 No Content**: Request successful, but no data to return

### Client Error Codes
- **400 Bad Request**: Invalid request format or parameters
- **401 Unauthorized**: Authentication required or invalid credentials
- **403 Forbidden**: Access denied to requested resource
- **404 Not Found**: Requested resource not found
- **413 Request Entity Too Large**: Request exceeds size limits (typically >4KB for URL requests)

### Server Error Codes
- **500 Internal Server Error**: Server-side error occurred
- **502 Bad Gateway**: Upstream server error
- **503 Service Unavailable**: Service temporarily unavailable
- **504 Gateway Timeout**: Request timeout

## SOAP Fault Responses

When an error occurs, the VIS API returns a SOAP fault response:

### SOAP Fault Structure
```xml
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>Client</faultcode>
      <faultstring>Invalid request format</faultstring>
      <detail>
        <BadParameter>
          <ParameterName>Fields</ParameterName>
          <ParameterValue>InvalidField</ParameterValue>
          <Message>Field 'InvalidField' is not recognized</Message>
        </BadParameter>
      </detail>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>
```

### Fault Code Types
- **Client**: Error in client request (400-level HTTP status)
- **Server**: Error on server side (500-level HTTP status)

## Common Error Scenarios

### 1. Invalid Request Format
**HTTP Status**: 400 Bad Request

**SOAP Fault Example**:
```xml
<soap:Fault>
  <faultcode>Client</faultcode>
  <faultstring>Invalid XML format</faultstring>
  <detail>
    <Message>Request parameter contains malformed XML</Message>
  </detail>
</soap:Fault>
```

### 2. Missing Required Parameters
**HTTP Status**: 400 Bad Request

**SOAP Fault Example**:
```xml
<soap:Fault>
  <faultcode>Client</faultcode>
  <faultstring>Missing required parameter</faultstring>
  <detail>
    <BadParameter>
      <ParameterName>TournamentNo</ParameterName>
      <Message>TournamentNo is required for GetBeachMatchList</Message>
    </BadParameter>
  </detail>
</soap:Fault>
```

### 3. Invalid Field Names
**HTTP Status**: 400 Bad Request

**SOAP Fault Example**:
```xml
<soap:Fault>
  <faultcode>Client</faultcode>
  <faultstring>Invalid field specification</faultstring>
  <detail>
    <BadParameter>
      <ParameterName>Fields</ParameterName>
      <ParameterValue>InvalidFieldName</ParameterValue>
      <Message>Field 'InvalidFieldName' is not valid for this request type</Message>
    </BadParameter>
  </detail>
</soap:Fault>
```

### 4. Authentication Errors
**HTTP Status**: 401 Unauthorized

**SOAP Fault Example**:
```xml
<soap:Fault>
  <faultcode>Client</faultcode>
  <faultstring>Authentication required</faultstring>
  <detail>
    <Message>This request requires valid authentication credentials</Message>
  </detail>
</soap:Fault>
```

### 5. Request Too Large
**HTTP Status**: 413 Request Entity Too Large

**SOAP Fault Example**:
```xml
<soap:Fault>
  <faultcode>Client</faultcode>
  <faultstring>Request too large</faultstring>
  <detail>
    <Message>Request exceeds maximum allowed size. Use POST with form data for large requests.</Message>
  </detail>
</soap:Fault>
```

## Client-Side Error Handling Best Practices

### 1. Implement Retry Logic
```javascript
const retryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  exponentialBackoff: true,
  maxDelayMs: 10000
};

async function makeRequestWithRetry(requestXml) {
  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      const response = await makeVISRequest(requestXml);
      return response;
    } catch (error) {
      if (attempt < retryConfig.maxAttempts && isRetryableError(error)) {
        const delay = calculateDelay(attempt, retryConfig);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}
```

### 2. Handle Specific Error Types
```javascript
function handleVISError(error, httpStatus) {
  switch (httpStatus) {
    case 400:
      // Bad request - fix the request format
      console.error('Invalid request format:', error.faultstring);
      break;
    case 401:
      // Authentication required
      console.error('Authentication required');
      // Redirect to login or refresh tokens
      break;
    case 403:
      // Access denied
      console.error('Access denied to requested resource');
      break;
    case 413:
      // Request too large - use POST instead of GET
      console.error('Request too large, switching to POST method');
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      // Server errors - retry with exponential backoff
      console.error('Server error, will retry:', error.faultstring);
      break;
    default:
      console.error('Unexpected error:', error);
  }
}
```

### 3. Parse SOAP Faults
```javascript
function parseSOAPFault(soapResponse) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(soapResponse, 'text/xml');
  
  const fault = xmlDoc.getElementsByTagName('soap:Fault')[0];
  if (!fault) return null;
  
  const faultCode = fault.getElementsByTagName('faultcode')[0]?.textContent;
  const faultString = fault.getElementsByTagName('faultstring')[0]?.textContent;
  
  const detail = fault.getElementsByTagName('detail')[0];
  let errorDetails = null;
  
  if (detail) {
    const badParam = detail.getElementsByTagName('BadParameter')[0];
    if (badParam) {
      errorDetails = {
        parameterName: badParam.getElementsByTagName('ParameterName')[0]?.textContent,
        parameterValue: badParam.getElementsByTagName('ParameterValue')[0]?.textContent,
        message: badParam.getElementsByTagName('Message')[0]?.textContent
      };
    }
  }
  
  return {
    faultCode,
    faultString,
    details: errorDetails
  };
}
```

### 4. Circuit Breaker Pattern
```javascript
class VISCircuitBreaker {
  constructor(failureThreshold = 5, timeoutMs = 60000) {
    this.failureThreshold = failureThreshold;
    this.timeoutMs = timeoutMs;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
  }
  
  async execute(requestFunction) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.timeoutMs) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await requestFunction();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}
```

## Error Monitoring and Logging

### 1. Log Error Context
When logging errors, include relevant context:
- Request type and parameters
- HTTP status code
- SOAP fault details
- Retry attempt number
- Timestamp and duration
- User/session identifier (if applicable)

### 2. Error Metrics
Track these metrics for monitoring:
- Error rate by request type
- Most common error types
- Average retry attempts
- Circuit breaker state changes
- Response time percentiles

### 3. Error Categories for Monitoring
- **Client Errors** (4xx): Usually indicate integration issues
- **Server Errors** (5xx): Indicate VIS API service issues
- **Network Errors**: Connectivity or timeout issues
- **Parse Errors**: Issues parsing SOAP responses
- **Authentication Errors**: Invalid or expired credentials

## Testing Error Scenarios

### 1. Invalid Request Format Test
```bash
curl -X POST https://www.fivb.org/Vis2009/XmlRequest.asmx \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'Request=<InvalidXML>'
```

### 2. Missing Parameter Test
```bash
curl -X POST https://www.fivb.org/Vis2009/XmlRequest.asmx \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'Request=%3CRequest%20Type%3D%22GetBeachMatchList%22%20Fields%3D%22No%22%3E%3C%2FRequest%3E'
```

### 3. Invalid Field Test
```bash
curl -X POST https://www.fivb.org/Vis2009/XmlRequest.asmx \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d 'Request=%3CRequest%20Type%3D%22GetEventList%22%20Fields%3D%22InvalidField%22%3E%3C%2FRequest%3E'
```

This comprehensive error handling approach ensures robust integration with the VIS API and provides clear debugging information when issues occur.