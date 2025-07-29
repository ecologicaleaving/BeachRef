# BeachRef MVP - Product Requirements Document

## Executive Summary

BeachRef MVP is a **single-page web application** that displays beach volleyball tournaments from the FIVB VIS system for the current year. This ultra-simplified version focuses solely on showing tournament data in a clean table format with automatic Vercel deployment via GitHub.

### Key Objectives
- ✅ **Deploy successfully** via GitHub → Vercel integration
- ✅ **Connect to VIS** using public endpoints with X-FIVB-App-ID header
- ✅ **Display tournament table** for 2025 beach volleyball tournaments
- ✅ **Zero authentication complexity** - direct public API access

---

## Scope Definition

### What's IN SCOPE (MVP)
1. **Single page** displaying beach volleyball tournaments table
2. **VIS API integration** using public endpoints with App ID header
3. **2025 tournaments only** - current year focus
4. **Basic tournament data**: Name, Country, Dates, Gender
5. **Responsive design** working on desktop and mobile
6. **Vercel serverless deployment** with GitHub integration

### What's OUT OF SCOPE (Future)
- User authentication/accounts
- Tournament details/drill-down pages
- Match results and statistics
- Referee information
- Data filtering/search
- Data export functionality
- Real-time updates

---

## Technical Architecture

### Ultra-Simple Stack
```
┌─────────────────────────────────────────┐
│              Vercel Platform             │
├─────────────────┬───────────────────────┤
│   Frontend      │   Serverless API      │
│   ┌───────────┐ │   ┌─────────────────┐ │
│   │ React SPA │ │   │ /api/           │ │
│   │ + TypeScript│ │   │  tournaments.ts │ │
│   │ + Tailwind │ │   │                 │ │
│   └───────────┘ │   └─────────────────┘ │
└─────────────────┴───────────────────────┘
                   │
                   ▼
         ┌─────────────────────┐
         │   FIVB VIS API      │
         │   Public Endpoints  │
         │   + App ID Header   │
         └─────────────────────┘
```

### File Structure
```
/
├── app/
│   ├── page.tsx                 # Main tournament table page
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Tailwind styles
├── api/
│   └── tournaments.ts           # Single VIS API endpoint
├── lib/
│   └── vis-client.ts            # VIS API utility
├── package.json                 # Dependencies
├── vercel.json                  # Deployment config
└── README.md                    # Setup instructions
```

---

## Functional Requirements

### FR-1: Tournament Data Display
**Requirement**: Display beach volleyball tournaments for 2025 in a responsive table

**API Endpoint**: `GET /api/tournaments`
- Calls VIS `GetBeachTournamentList` with Year=2025 filter
- Includes `X-FIVB-App-ID: 2a9523517c52420da73d927c6d6bab23` header
- Returns JSON array of tournaments

**Data Fields**:
- Tournament Name
- Country (with flag icon)
- Start Date
- End Date  
- Gender (Men/Women/Mixed)
- Tournament Type/Level

**Success Criteria**:
- Table loads within 3 seconds
- Responsive design on mobile/desktop
- Clean, professional appearance
- Country flags display correctly

### FR-2: VIS API Integration
**Requirement**: Connect to FIVB VIS public endpoints without authentication

**VIS Request Format**:
```xml
<Requests>
  <Request Type='GetBeachTournamentList' 
           Fields='Code Name CountryCode StartDateMainDraw EndDateMainDraw Gender Type'>
    <Filter Year='2025'/>
  </Request>
</Requests>
```

**Headers Required**:
- `X-FIVB-App-ID: 2a9523517c52420da73d927c6d6bab23`
- `Content-Type: application/xml`

**Success Criteria**:
- Successful connection to VIS API
- XML response parsed correctly to JSON
- Error handling for API failures
- Response caching (5-minute TTL)

### FR-3: Deployment & CI/CD
**Requirement**: Automatic deployment via GitHub to Vercel integration

**Deployment Flow**:
1. Push to `main` branch → Automatic Vercel deployment
2. PR creation → Preview deployment with unique URL
3. Environment variables configured in Vercel dashboard

**Success Criteria**:
- 100% successful deployments
- Build time under 2 minutes
- Zero manual deployment steps
- Preview URLs for testing

---

## Non-Functional Requirements

### Performance
- **Page Load**: < 3 seconds on 3G connection
- **API Response**: < 2 seconds for tournament list
- **Build Time**: < 2 minutes for full deployment

### Reliability  
- **Uptime**: 99%+ availability (Vercel SLA)
- **Error Handling**: Graceful degradation when VIS API fails
- **Fallback**: Display cached data if API unavailable

### Security
- **HTTPS**: All traffic encrypted (Vercel default)
- **No Secrets**: App ID is not sensitive (FIVB confirmed)
- **Input Validation**: Basic XSS protection

### Browser Support
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (last 2 versions)
- **Mobile**: iOS Safari, Android Chrome
- **Responsive**: 320px - 1920px viewport widths

---

## Implementation Details

### VIS API Configuration
```typescript
// lib/vis-client.ts
const VIS_API_URL = 'https://www.fivb.org/vis2009/XmlRequest.asmx';
const VIS_APP_ID = '2a9523517c52420da73d927c6d6bab23';

const tournamentRequest = `
<Requests>
  <Request Type='GetBeachTournamentList' 
           Fields='Code Name CountryCode StartDateMainDraw EndDateMainDraw Gender Type'>
    <Filter Year='2025'/>
  </Request>
</Requests>
`;
```

### Serverless Function
```typescript
// api/tournaments.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchTournaments } from '../lib/vis-client';

export async function GET() {
  try {
    const tournaments = await fetchTournaments();
    return NextResponse.json(tournaments);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch tournaments' }, 
      { status: 500 }
    );
  }
}
```

### Vercel Configuration
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "functions": {
    "app/api/**/*.ts": {
      "runtime": "@vercel/node@3.0.6",
      "maxDuration": 10
    }
  }
}
```

---

## Success Metrics

### Technical KPIs
- **Deployment Success Rate**: 100%
- **API Response Time**: < 2s (P95)
- **Page Load Speed**: < 3s (P95)
- **Error Rate**: < 1%

### User Experience KPIs  
- **Tournament Data Accuracy**: 100% match with VIS
- **Mobile Usability**: Lighthouse score > 90
- **Cross-browser Compatibility**: 100% on target browsers

### Development Velocity
- **Setup Time**: < 15 minutes for new developer
- **Deploy Time**: < 5 minutes from push to live
- **Feature Development**: Single day for basic enhancements

---

## Risk Assessment

### Low Risk Items ✅
- **VIS API Access**: Confirmed public endpoint availability
- **Vercel Deployment**: Proven GitHub integration
- **Technical Complexity**: Minimal scope reduces risk

### Medium Risk Items ⚠️
- **VIS API Rate Limits**: Unknown limits (mitigation: caching)
- **CORS Issues**: Browser/API compatibility (mitigation: serverless proxy)
- **Data Format Changes**: VIS API updates (mitigation: error handling)

---

## Development Timeline

### Day 1: Foundation
- [ ] Next.js project setup with TypeScript
- [ ] Basic page layout with Tailwind CSS
- [ ] Vercel deployment configuration

### Day 2: VIS Integration
- [ ] VIS API client implementation
- [ ] Serverless function for tournaments
- [ ] XML to JSON transformation

### Day 3: UI Implementation
- [ ] Tournament table component
- [ ] Country flag integration
- [ ] Responsive design implementation

### Day 4: Polish & Deploy
- [ ] Error handling and loading states
- [ ] Performance optimization
- [ ] Production deployment and testing

**Total Estimated Time: 4 days for fully functional MVP**

---

## Future Enhancement Roadmap

### Phase 2 (Optional)
- Tournament detail pages
- Basic filtering (country, gender)
- Data export to CSV/Excel

### Phase 3 (Optional)
- Match results and statistics
- Referee information
- Real-time tournament updates

### Phase 4 (Optional)
- User accounts and favorites
- Tournament notifications
- Mobile app version

---

**Document Version**: 1.0  
**Created**: 2025-07-29  
**Owner**: Development Team  
**Status**: Ready for Implementation