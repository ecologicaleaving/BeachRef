# Referee List Extraction - Implementation Guidelines

## CRITICAL DISCOVERY - Form Parameter Fix

**BREAKING UPDATE**: Through testing, we discovered the correct format for VIS API requests that resolves all `<BadRequestSyntax id="4" />` errors.

### The Critical Fix

**Form Parameter Name**: Use `Request` (NOT `xmlRequest`)

```javascript
// ✅ CORRECT - This works and returns data
const formData = new URLSearchParams();
formData.append('Request', xmlString);

// ❌ INCORRECT - This causes BadRequestSyntax id="4" errors
formData.append('xmlRequest', xmlString);
```

### Verified Working Example

This exact XML format **successfully returned 10 referees** with Status 200:

```xml
<Requests>
  <Request Type="GetEventRefereeList"
           Fields="NoReferee FirstName LastName FederationCode Gender Role Status">
    <Filter NoEvent="1554"/>
  </Request>
</Requests>
```

### Key Requirements
1. **Must use `Request` form parameter** (not `xmlRequest`)
2. **Must wrap in `<Requests>` tag** (singular, not `<Request>`)
3. **Must use URLSearchParams** for form data encoding
4. **Must specify Fields attribute** for all list requests

**This discovery resolves ALL previous BadRequestSyntax errors and enables successful VIS API integration.**

---

## Overview
This document provides implementation guidelines for extracting referee lists from VIS API tournaments in the BeachRef application. Based on architectural analysis of the existing codebase and VIS API specifications.

## Core Requirements

### VIS API Integration
- **New Endpoints**: Add `GetEventOfficialList` and `GetEventRefereeList` to existing VIS API client
- **Request Format**: Use XML format with proper field selection following existing patterns
- **Key Field Distinction**: `NoReferee` property contains actual referee ID (not registration number)
- **Required Fields**: Always specify needed properties in `GetXxxList` requests per VIS API requirements

### API Request Pattern (Updated with Correct Format)

**IMPORTANT**: Always wrap in `<Requests>` and use `Request` form parameter:

```xml
<Requests>
  <Request Type="GetEventOfficialList" Fields="FederationCode FirstName Gender LastName NoOfficial Role Status Type">
    <Filter NoEvent="1601"/>
  </Request>
</Requests>
```

```xml
<Requests>
  <Request Type="GetEventRefereeList" Fields="FederationCode FirstName Gender LastName NoReferee Status Type TheoryTest StrongPoints WeakPoints">
    <Filter NoEvent="1601"/>
  </Request>
</Requests>
```

```javascript
// Implementation with correct form parameter
const formData = new URLSearchParams();
formData.append('Request', xmlString); // NOT 'xmlRequest'
```

## Implementation Architecture

### 1. API Client Extension (VisApiClient.ts)
- Add new endpoint enums to `VisApiEndpoint`
- Implement `getEventOfficialList()` and `getEventRefereeList()` methods
- Follow existing XML request building patterns
- Use established retry and error handling mechanisms

### 2. Type Definitions (types/referee-v2.ts)
```typescript
interface RefereeOfficial {
  readonly id: string;              // NoOfficial from API
  readonly visRegistrationNo: string; // Registration number  
  readonly refereeNo?: string;      // NoReferee (actual referee ID)
  readonly firstName: string;
  readonly lastName: string;
  readonly federationCode: string;
  readonly gender: 'M' | 'W';
  readonly role: OfficialRole;
  readonly status: OfficialStatus;
}
```

### 3. Service Layer (RefereeExtractionService.ts)
- Create dedicated service extending existing integration patterns
- Implement tournament-to-referee mapping logic
- Handle data transformation and validation
- Integrate with existing cache services

### 4. Caching Strategy - Daily TTL
- **Cache Duration**: 24 hours (referee data changes very slowly)
- **Cache Levels**: Memory → LocalStorage → API (following existing patterns)
- **Cache Keys**: `referee_data_${tournamentNo}`
- **Invalidation**: Manual refresh option for POs

## Data Flow

```
1. GetEvent(tournamentNo) → Extract EventNo
2. GetEventOfficialList(EventNo) → Parse officials  
3. GetEventRefereeList(EventNo) → Parse referees with NoReferee
4. Transform → Cache → Return typed data
```

## Performance Optimizations

### Field Selection Strategy
- **Officials**: `FederationCode FirstName Gender LastName NoOfficial Role Status Type`
- **Referees**: `FederationCode FirstName Gender LastName NoReferee Status Type TheoryTest StrongPoints WeakPoints`
- Extended fields acceptable due to daily caching

### Bandwidth Savings
- **99% reduction** in referee API calls (from every page load to daily)
- **95%+ expected cache hit rate** for referee data
- **Instant loading** from cache for subsequent requests

## Error Handling & Resilience

### Circuit Breaker Pattern
- Extend existing `ConnectionCircuitBreaker` for referee-specific operations
- Implement timeout and retry logic following established patterns

### Fallback Hierarchy
1. **Primary**: Direct VIS referee API calls
2. **Secondary**: Stale cached data (if API fails)  
3. **Tertiary**: Extract referee names from existing match data
4. **Final**: Return empty but valid data structure

### Fallback Implementation
```typescript
// Extract referee names from GetBeachMatchList as backup
const matches = await getBeachMatchList({ 
  tournamentNo, 
  includeReferees: true 
});
// Parse Referee1Name, Referee2Name fields
```

## Integration Points

### Existing Services
- **Cache Service**: Use established caching patterns and TTL management
- **API Client**: Extend existing VisApiClient with new endpoints
- **Error Handling**: Follow existing error logging and circuit breaker patterns
- **Data Transformation**: Use existing VisResponseParser patterns

### UI Integration
- Referee data available through service layer for tournament detail views
- Cache-first loading ensures instant referee list display
- Support for manual refresh when needed by POs

## Implementation Checklist

### Phase 1: Core API Integration
- [ ] Add referee endpoints to `VisApiEndpoint` enum
- [ ] Implement XML request builders for referee calls
- [ ] Add referee response parsing to `VisResponseParser`
- [ ] Create referee type definitions

### Phase 2: Service Layer
- [ ] Implement `RefereeExtractionService`
- [ ] Add daily caching with 24h TTL
- [ ] Integrate with existing cache management
- [ ] Add performance monitoring

### Phase 3: Error Handling
- [ ] Extend circuit breaker for referee operations
- [ ] Implement fallback data extraction from matches
- [ ] Add comprehensive error logging
- [ ] Test timeout and retry scenarios

### Phase 4: Integration & Testing
- [ ] Integrate with existing tournament services
- [ ] Add referee data to tournament detail views
- [ ] Test cache warming and invalidation
- [ ] Validate field selection optimization

## Technical Notes

### VIS API Specifics
- **CRITICAL**: Use `Request` form parameter (NOT `xmlRequest`) - this resolves all BadRequestSyntax errors
- **CRITICAL**: Always wrap requests in `<Requests>` tags - this is mandatory
- Registration number ≠ Referee ID (use `NoReferee` for actual referee identification)
- Field specification is mandatory for all `GetXxxList` requests
- XML response parsing follows existing patterns
- Form data encoding with URLSearchParams required (not SOAP)
- **BadRequestSyntax id="4" errors** are resolved by using correct form parameter name

### Performance Considerations
- Daily cache TTL perfectly matches referee data stability
- Memory + LocalStorage caching ensures optimal performance
- Field optimization provides bandwidth savings
- Batch operations not required due to low-frequency access

## Success Criteria

### Functional
- Tournament referees load instantly from cache (< 100ms)
- Fresh data available within 24 hours of changes
- Fallback data available when API fails
- All referee information properly typed and validated

### Performance  
- 95%+ cache hit rate for referee data
- 99% reduction in referee API calls
- < 2 second fresh data fetch when cache miss
- No impact on existing tournament loading performance