# VIS Web Service Documentation

> **Extracted from FIVB Official VIS Web Service Documentation (.chm file)**

## Table of Contents

1. [Introduction](#introduction)
2. [API Endpoints](#api-endpoints)
3. [Authentication](#authentication)
4. [Request Structure](#request-structure)
5. [Key Data Types](#key-data-types)
6. [Available Requests](#available-requests)
7. [Examples](#examples)
8. [Error Handling](#error-handling)

---

## Introduction

The VIS (Volleyball Information System) Web Service provides access to FIVB's volleyball data including tournaments, matches, players, teams, and rankings. This is the official API used for accessing volleyball competition data.

### Base URL
- **XML Endpoint**: `https://www.fivb.org/Vis2009/XmlRequest.asmx`
- **Contact**: vis.sdk@fivb.org

---

## API Endpoints

### Core Service Endpoints

All requests go through the main XML endpoint with different request types:

```
https://www.fivb.org/Vis2009/XmlRequest.asmx?Request=<Request Type='...' />
```

### Public vs. Authenticated Access

- **Public Data**: Tournament lists, player lists, match lists (metadata only)
- **Authenticated Data**: Detailed tournament info, match results, player details, live data

---

## Authentication

### Authentication Methods

The VIS API supports three authentication methods:

1. **JSON Web Token (JWT)** *(Recommended)*
2. **Basic Authentication** (Username/Password in HTTP headers)
3. **Request-level Authentication** (Username/Password in XML)

### Guest Access

For public data only, no authentication is required. You will be treated as a guest user with limited access to metadata.

### Example Authentication

```xml
<!-- Request-level authentication -->
<Requests Username="your_username" Password="your_password">
  <Request Type="GetTournament" No="123" />
</Requests>
```

---

## Request Structure

### Base XML Format

```xml
<Request Type="RequestType" [Attribute1="Value1"] [Attribute2="Value2"] />
```

### Multiple Requests

```xml
<Requests Username="username" Password="password">
  <Request Type="GetTournamentList" />
  <Request Type="GetMatchList" />
</Requests>
```

### Response Formats

- **XML**: Default format, always available
- **JSON**: Available for select endpoints (growing list)

---

## Key Data Types

### Tournament Types
- **Beach Volleyball Tournaments**: Beach competitions and World Tour events
- **Volleyball Tournaments**: Indoor volleyball competitions
- **Rankings**: World rankings, Olympic selections, federation rankings

### Match Types
- **Beach Matches**: Beach volleyball match data
- **Volleyball Matches**: Indoor volleyball match data
- **Live Data**: Real-time match information and statistics

### Player/Team Data
- **Players**: Individual player information and statistics
- **Teams**: Team compositions and rankings
- **Officials**: Referees and technical officials

---

## Available Requests

### Public Data Requests (No Authentication Required)

| Request Type | Description | Returns |
|--------------|-------------|---------|
| `GetServiceInformation` | Service version and status | Service metadata |
| `GetTournamentList` | List of tournaments | Tournament IDs and metadata |
| `GetPlayerList` | List of players | Player IDs and metadata |
| `GetMatchList` | List of matches | Match IDs and metadata |
| `GetEventList` | List of events | Event IDs and metadata |

### Authenticated Requests (Detailed Data)

#### Tournament Requests
| Request Type | Description | Authentication Required |
|--------------|-------------|------------------------|
| `GetTournament` | Full tournament details | Yes |
| `GetTournamentInfo` | Tournament information | Yes |
| `GetTournamentRanking` | Tournament rankings | Yes |

#### Beach Volleyball Requests
| Request Type | Description | JSON Support |
|--------------|-------------|--------------|
| `GetBeachTournament` | Beach tournament details | Yes |
| `GetBeachMatch` | Beach match details | Yes |
| `GetBeachMatchList` | Beach match list | Yes |
| `GetBeachTeam` | Beach team information | Yes |
| `GetBeachRound` | Beach round information | Yes |
| `GetBeachWorldTourRanking` | World Tour rankings | Yes |

#### Volleyball Requests
| Request Type | Description | JSON Support |
|--------------|-------------|--------------|
| `GetMatch` | Match details | Yes |
| `GetMatchList` | Match list with filters | Yes |
| `GetPlayer` | Player details | Yes |
| `GetTeam` | Team information | Yes |
| `GetPool` | Pool/group information | Yes |
| `GetPlayersRanking` | Player rankings | Yes |

#### Media Requests
| Request Type | Description | JSON Support |
|--------------|-------------|--------------|
| `GetArticle` | News articles | Yes |
| `GetPressRelease` | Press releases | Yes |
| `GetImage` | Images and media | No |

#### Live Data Requests
| Request Type | Description | Authentication Required |
|--------------|-------------|------------------------|
| `GetLiveMatches` | Live match data | Yes |
| `GetRecentMatches` | Recent match results | Yes |
| `UploadVolleyLive` | Upload live data | Yes |

---

## Examples

### 1. Get Service Information (Public)

```bash
curl "https://www.fivb.org/Vis2009/XmlRequest.asmx?Request=<Request Type='GetServiceInformation' />"
```

**Response:**
```xml
<Response Type="GetServiceInformation">
  <ServiceInformation Version="2.x.x" Status="Online" />
</Response>
```

### 2. Get Tournament List (Public - Metadata Only)

```bash
curl "https://www.fivb.org/Vis2009/XmlRequest.asmx?Request=<Request Type='GetTournamentList' />"
```

**Response:**
```xml
<Response Type="GetTournamentList">
  <TournamentList Count="346">
    <Tournament No="1" />
    <Tournament No="2" />
    <!-- More tournaments... -->
  </TournamentList>
</Response>
```

### 3. Get Tournament Details (Authenticated)

```xml
<!-- POST request body -->
<Request Type="GetTournament" No="1" Username="your_username" Password="your_password" />
```

**Response:**
```xml
<Response Type="GetTournament">
  <Tournament No="1" Name="Tournament Name" Location="City, Country" StartDate="2024-01-01">
    <!-- Detailed tournament data -->
  </Tournament>
</Response>
```

### 4. Get Beach Match List with Filters

```xml
<Request Type="GetBeachMatchList" Year="2024" TournamentNo="123" />
```

### 5. Multiple Requests

```xml
<Requests Username="user" Password="pass">
  <Request Type="GetTournamentList" />
  <Request Type="GetPlayerList" Country="USA" />
  <Request Type="GetMatchList" Recent="1" />
</Requests>
```

---

## Error Handling

### XML Error Response Format

```xml
<Response Type="Error">
  <Error Code="401" Message="Authentication required" />
</Response>
```

### JSON Error Response Format

```json
{
  "error": {
    "code": 401,
    "message": "Authentication required"
  }
}
```

### Common Error Codes

| Code | Description | Solution |
|------|-------------|----------|
| 400 | Bad Request | Check request format and parameters |
| 401 | Unauthorized | Provide valid authentication credentials |
| 403 | Forbidden | User lacks permission for this data |
| 404 | Not Found | Requested resource doesn't exist |
| 500 | Server Error | Contact FIVB support |

---

## Data Schemas

### XSD Schemas Available

The documentation includes detailed XSD schemas for:

- **Beach Live Schema**: Real-time beach volleyball data
- **Volley Live Schema**: Real-time indoor volleyball data
- **Beach Match Live Score Schema**: Live scoring data
- **Event Content Schema**: Event and tournament information
- **Bank Account Schema**: Financial data structures

### Key Schema Files

- `BeachLive.xsd`: Beach volleyball live data format
- `VolleyLive.xsd`: Indoor volleyball live data format
- `VolleyLiveUpload.xsd`: Live data upload format

---

## Filters and Parameters

### Common Filter Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `Year` | Filter by year | `Year="2024"` |
| `Country` | Filter by country code | `Country="USA"` |
| `Federation` | Filter by federation | `Federation="FIVB"` |
| `TournamentNo` | Filter by tournament | `TournamentNo="123"` |
| `Recent` | Recent items only | `Recent="1"` |
| `Gender` | Filter by gender | `Gender="M"` or `Gender="W"` |

### Complex Filters

Some endpoints support complex filtering with XML structures:

```xml
<Request Type="GetBeachMatchList">
  <BeachMatchFilter>
    <TournamentNo>123</TournamentNo>
    <Year>2024</Year>
    <Phase>Finals</Phase>
  </BeachMatchFilter>
</Request>
```

---

## Rate Limiting and Best Practices

### Recommendations

1. **Cache Data**: Tournament lists and player data change infrequently
2. **Batch Requests**: Use multiple requests in single call when possible
3. **Use Compression**: Enable GZIP compression for large responses
4. **Respect Rate Limits**: Avoid excessive requests to prevent blocking
5. **Error Handling**: Implement proper retry logic with exponential backoff

### Response Compression

The API supports GZIP compression. Include appropriate headers:

```
Accept-Encoding: gzip, deflate
```

---

## Development Notes

### Testing with Browser

You can test GET requests directly in a browser:

```
https://www.fivb.org/Vis2009/XmlRequest.asmx?Request=<Request Type='GetServiceInformation' />
```

### Production Recommendations

- Use POST requests with form data or HTTP payload (not query string)
- Implement proper authentication token management
- Cache public data appropriately
- Monitor response times and implement timeouts

### Contact and Support

- **Email**: vis.sdk@fivb.org
- **Documentation**: This CHM file contains the complete API reference
- **Updates**: Check service information endpoint for version changes

---

## Summary for VisConnect Application

Based on this documentation analysis, here are the key findings for the VisConnect MVP:

### ✅ Available for Public Use
- **Tournament Metadata**: List of 346 tournaments (IDs only)
- **Player Metadata**: List of 113,588 players (IDs only)
- **Match Metadata**: List of 3,656 matches (IDs only)
- **Event Metadata**: List of 1,570 events (IDs only)
- **Service Information**: API version and status

### ❌ Requires Authentication
- **Tournament Details**: Names, dates, locations, participants
- **Match Results**: Scores, statistics, live data
- **Player Information**: Names, countries, photos, statistics
- **Rankings**: World rankings, tournament standings
- **Live Data**: Real-time match information

### 🚀 Recommended MVP Approach

1. **Phase 1**: Use public endpoints for app structure and counts
2. **Phase 2**: Create compelling UI/UX with mock data
3. **Phase 3**: Negotiate API access with FIVB for production data
4. **Phase 4**: Integrate authenticated endpoints for full functionality

The API is comprehensive and production-ready, but the freemium access model means detailed volleyball data requires official partnership with FIVB.

---

*Documentation extracted from VIS Web Service CHM file - Last updated: January 2025*