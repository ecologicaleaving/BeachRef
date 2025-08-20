# Tournament Type Filtering (FIVB/BPT/CEV/Local)

### Investigation Results

After examining the VIS Web Service documentation for beach volleyball tournament filtering options, **no built-in filter parameters were found** for filtering tournaments by organization type (FIVB, BPT, CEV, local, etc.).

#### Available Beach Tournament Filters

The `GetBeachTournamentList` endpoint supports the following filters in the `<Filter>` element:

- **`Statuses`** - Filter by tournament status (e.g., `Statuses='Running'`)
- **`NoTournament`** - Filter by specific tournament number
- **Date-based filtering** - No specific parameters, but tournaments include StartDate/EndDate fields

#### Tournament Type Detection

Since there's no API-level filtering, tournament type can be determined through:

1. **Tournament Codes**: Pattern analysis of tournament codes
   - FIVB World Tour: Often contain specific patterns
   - BPT (Beach Pro Tour): Codes may contain "BPT"
   - CEV (European): May contain regional identifiers
   - Local: Typically federation-specific codes

2. **Tournament Names**: String analysis of tournament titles
   - "FIVB Beach Volleyball World Tour"
   - "BPT Challenge" or "BPT Elite16"
   - "CEV Beach Volleyball Championship"
   - Local tournament naming conventions

3. **Client-Side Classification**: Implement classification logic based on:
   ```typescript
   const classifyTournament = (tournament: Tournament): string => {
     const code = tournament.Code || '';
     const name = tournament.Name || '';
     
     if (name.includes('FIVB') || name.includes('World Tour')) return 'FIVB';
     if (name.includes('BPT') || code.includes('BPT')) return 'BPT';
     if (name.includes('CEV') || code.includes('CEV')) return 'CEV';
     return 'Local';
   };
   ```

#### Recommended Implementation

For tournament type filtering in applications:
1. Fetch all tournaments using `GetBeachTournamentList` with status filtering
2. Apply client-side classification based on codes and names
3. Cache tournament type mappings to improve performance
4. Consider federation data if available through other endpoints

#### Limitations
- No guaranteed accuracy without official tournament type field
- Classification logic may need periodic updates for new tournament formats
- Some tournaments may be difficult to classify without additional context

---
