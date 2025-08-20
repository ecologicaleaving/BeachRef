# How to Get Currently Active Beach Volleyball Tournaments

### ✅ Correct API Call for Active Beach Tournaments

Based on the VIS Web Service documentation, here's the proper way to get currently active beach volleyball tournaments:

#### API Endpoint
```bash
curl "https://www.fivb.org/Vis2009/XmlRequest.asmx?Request=%3CRequest%20Type%3D%27GetBeachTournamentList%27%20Fields%3D%27No%20Code%20Name%20StartDate%20EndDate%27%3E%3CFilter%20Statuses%3D%27Running%27%20/%3E%3C/Request%3E" \
  -H "Accept: application/xml, text/xml" \
  -H "X-FIVB-App-ID: 2a9523517c52420da73d927c6d6bab23"
```

#### Decoded Request Format
```xml
<Request Type='GetBeachTournamentList' Fields='No Code Name StartDate EndDate'>
  <Filter Statuses='Running' />
</Request>
```

#### Key Components
1. **Type**: `GetBeachTournamentList` (for beach volleyball tournaments)
2. **Fields**: `No Code Name StartDate EndDate` (tournament details to retrieve)  
3. **Filter**: `Statuses='Running'` (only currently running tournaments)
4. **Header**: `X-FIVB-App-ID: 2a9523517c52420da73d927c6d6bab23` (required for authentication)

#### Expected Response Format
```xml
<BeachTournaments NbItems="77" Version="99912">
  <BeachTournament No="8370" Code="MBAD2025" Name="BPT Challenge Baden" StartDate="2025-08-06" Version="99871"/>
  <BeachTournament No="8371" Code="WBAD2025" Name="BPT Challenge Baden" StartDate="2025-08-05" Version="99834"/>
  <!-- More tournaments... -->
</BeachTournaments>
```

#### Beach Tournament Status Values
- **0 = NotOpen** - Not opened for entries
- **1 = Open** - Open for entries  
- **6 = Running** - **Currently running (no more changes allowed)** ⭐
- **7 = Finished** - Tournament finished
- **8 = PaymentPending** - Player payments pending
- **9 = Paid** - All payments completed

#### Important Notes
- The `Status='Running'` filter returns tournaments marked as active, but some may be old (2020-2021) due to data inconsistencies
- **Always add client-side date filtering** to get truly current tournaments (within +/- 1 month from today)
- Use `GetVolleyTournamentList` for indoor volleyball tournaments instead
- Response includes tournament numbers, codes, names, and dates for further processing

#### Client-Side Date Filtering (Recommended)
After getting the API response, filter tournaments by start date:
```javascript
const today = new Date();
const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
const oneMonthFromNow = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());

const currentTournaments = tournaments.filter(tournament => {
  const startDate = new Date(tournament.StartDate);
  return startDate >= oneMonthAgo && startDate <= oneMonthFromNow;
});
```

---
