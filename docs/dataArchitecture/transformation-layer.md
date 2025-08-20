# BeachRef - Data Transformation Layer

## Scopo del Transformation Layer

Il Transformation Layer gestisce la conversione bidirezionale tra:
1. **VIS API XML Response** → **Domain Models** (Tournament, BeachMatch, etc.)
2. **Domain Models** → **UI Data Structures**
3. **Legacy Data** → **New Data Structures** (per migration)

## 1. Core XML Parser Utilities

```typescript
/**
 * Utility per parsing XML attributes da VIS API responses
 * Gestisce encoding, whitespace e caratteri speciali
 */
class XmlParsingUtils {
  
  /**
   * Estrae attributi da un elemento XML self-closing
   * Esempio: <Event No="123" Name="Test" /> → { No: "123", Name: "Test" }
   */
  static parseXmlAttributes(xmlElement: string): Record<string, string> {
    const attributes: Record<string, string> = {};
    
    // Regex per matching attributi XML con valore quotato
    const attributeRegex = /(\w+)="([^"]*)"/g;
    let match;
    
    while ((match = attributeRegex.exec(xmlElement)) !== null) {
      const [, name, value] = match;
      // Decode HTML entities e trim whitespace
      attributes[name] = this.decodeXmlEntities(value.trim());
    }
    
    return attributes;
  }
  
  /**
   * Decodifica HTML entities comuni nei dati VIS
   */
  static decodeXmlEntities(text: string): string {
    return text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
  }
  
  /**
   * Parsa XML content structured (come AuxiliaryPersons, OfficialFunctions)
   * Gestisce XML annidato dentro attributi
   */
  static parseXmlContent(xmlContent: string): any[] {
    if (!xmlContent || xmlContent.trim() === '') return [];
    
    try {
      // Se il content è XML annidato, prova a parsarlo
      if (xmlContent.includes('<') && xmlContent.includes('>')) {
        return this.parseNestedXml(xmlContent);
      }
      
      // Se è una lista separata da virgole o semicolon
      if (xmlContent.includes(',') || xmlContent.includes(';')) {
        const separator = xmlContent.includes(';') ? ';' : ',';
        return xmlContent.split(separator)
          .map(item => item.trim())
          .filter(item => item.length > 0);
      }
      
      // Singolo valore
      return [xmlContent.trim()];
      
    } catch (error) {
      console.warn('Failed to parse XML content:', xmlContent, error);
      return [];
    }
  }
  
  private static parseNestedXml(xmlContent: string): any[] {
    const items: any[] = [];
    
    // Pattern per elementi XML generici
    const elementRegex = /<(\w+)([^>]*)(?:\/>|>.*?<\/\1>)/g;
    let match;
    
    while ((match = elementRegex.exec(xmlContent)) !== null) {
      const [fullMatch, tagName, attributesStr] = match;
      
      const item = {
        type: tagName,
        ...this.parseXmlAttributes(fullMatch)
      };
      
      items.push(item);
    }
    
    return items;
  }
}
```

## 2. VIS Response Parsers

```typescript
/**
 * Parser per VIS API responses - converte XML in domain models
 */
class VisResponseParser {
  
  /**
   * Parsa GetEventList response in Tournament objects
   */
  static parseEventList(xmlResponse: string): Tournament[] {
    console.log(`Parsing EventList response: ${xmlResponse.length} chars`);
    
    try {
      // Estrai tutti gli elementi Event
      const eventMatches = xmlResponse.match(/<Event[^>]*\/>/g);
      if (!eventMatches || eventMatches.length === 0) {
        console.warn('No Event elements found in response');
        return [];
      }
      
      console.log(`Found ${eventMatches.length} Event elements`);
      
      const tournaments = eventMatches.map((eventXml, index) => {
        try {
          return this.parseEventElement(eventXml);
        } catch (error) {
          console.error(`Failed to parse event ${index}:`, error);
          return null;
        }
      }).filter(Boolean) as Tournament[];
      
      console.log(`Successfully parsed ${tournaments.length} tournaments`);
      return tournaments;
      
    } catch (error) {
      console.error('Failed to parse EventList response:', error);
      return [];
    }
  }
  
  /**
   * Parsa singolo elemento Event XML
   */
  private static parseEventElement(eventXml: string): Tournament {
    const attrs = XmlParsingUtils.parseXmlAttributes(eventXml);
    
    // Generate stable tournament ID
    const id = this.generateTournamentId(attrs.No, attrs.Code);
    
    // Extract and classify gender from Gender field or code
    const gender = this.extractGender(attrs.Code, attrs.Gender);
    
    // Classify tournament type
    const tournamentType = this.classifyTournament(attrs);
    
    // Parse dates
    const dates = this.parseTournamentDates(attrs);
    
    // Infer status from dates and other attributes
    const status = this.inferTournamentStatus(attrs, dates);
    
    const tournament: Tournament = {
      // Core identifiers
      id,
      visNo: attrs.No,
      eventNo: attrs.No, // Event number stesso del tournament per GetEventList
      
      // Basic info
      code: attrs.Code || this.generateFallbackCode(attrs),
      name: attrs.Name || attrs.Title || 'Unknown Tournament',
      title: attrs.Title,
      
      // Classification
      gender,
      tournamentType,
      
      // Dates
      dates,
      
      // Status and flags
      status,
      hasBeachTournament: attrs.HasBeachTournament === '1',
      hasVolleyTournament: attrs.HasVolleyTournament === '1',
      hasMenTournament: attrs.HasMenTournament === '1',
      hasWomenTournament: attrs.HasWomenTournament === '1',
      isVisManaged: attrs.IsVisManaged === '1',
      
      // Metadata
      version: parseInt(attrs.Version) || 1,
      lastSyncAt: new Date().toISOString()
    };
    
    // Add location if available
    if (attrs.CountryCode || attrs.Venues) {
      tournament.location = {
        countryCode: attrs.CountryCode,
        venues: attrs.Venues ? this.parseVenues(attrs.Venues) : undefined
      };
    }
    
    // Add officials if available  
    if (attrs.AuxiliaryPersons || attrs.OfficialFunctions) {
      tournament.officials = {
        tournamentId: id,
        auxiliaryPersons: attrs.AuxiliaryPersons ? this.parseAuxiliaryPersons(attrs.AuxiliaryPersons) : undefined,
        officialFunctions: attrs.OfficialFunctions ? this.parseOfficialFunctions(attrs.OfficialFunctions) : undefined,
        lastUpdated: new Date().toISOString()
      };
    }
    
    return tournament;
  }
  
  /**
   * Parsa GetBeachTournament response per dettagli location
   */
  static parseBeachTournament(xmlResponse: string): TournamentLocation | null {
    const match = xmlResponse.match(/<BeachTournament[^>]*\/>/);
    if (!match) {
      console.warn('No BeachTournament element found in response');
      return null;
    }
    
    const attrs = XmlParsingUtils.parseXmlAttributes(match[0]);
    
    return {
      countryCode: attrs.CountryCode,
      city: attrs.City,
      venue: attrs.Venue || attrs.DefaultVenue,
      courts: attrs.Courts ? parseInt(attrs.Courts) : undefined,
      surface: attrs.Surface
    };
  }
  
  /**
   * Parsa GetEvent response per officials
   */
  static parseEventOfficials(xmlResponse: string, tournamentId: string): TournamentOfficials | null {
    const match = xmlResponse.match(/<Event[^>]*>/);
    if (!match) {
      console.warn('No Event element found in response');
      return null;
    }
    
    const attrs = XmlParsingUtils.parseXmlAttributes(match[0]);
    
    return {
      tournamentId,
      auxiliaryPersons: attrs.AuxiliaryPersons ? this.parseAuxiliaryPersons(attrs.AuxiliaryPersons) : undefined,
      officialFunctions: attrs.OfficialFunctions ? this.parseOfficialFunctions(attrs.OfficialFunctions) : undefined,
      lastUpdated: new Date().toISOString()
    };
  }
  
  /**
   * Parsa GetBeachMatchList response
   */
  static parseBeachMatches(xmlResponse: string, tournamentId: string): BeachMatch[] {
    console.log(`Parsing BeachMatches response: ${xmlResponse.length} chars`);
    
    try {
      const matchElements = xmlResponse.match(/<BeachMatch[^>]*\/>/g);
      if (!matchElements || matchElements.length === 0) {
        console.warn('No BeachMatch elements found in response');
        return [];
      }
      
      console.log(`Found ${matchElements.length} BeachMatch elements`);
      
      const matches = matchElements.map((matchXml, index) => {
        try {
          return this.parseBeachMatchElement(matchXml, tournamentId);
        } catch (error) {
          console.error(`Failed to parse match ${index}:`, error);
          return null;
        }
      }).filter(Boolean) as BeachMatch[];
      
      console.log(`Successfully parsed ${matches.length} matches`);
      return matches;
      
    } catch (error) {
      console.error('Failed to parse BeachMatches response:', error);
      return [];
    }
  }
  
  /**
   * Parsa singolo elemento BeachMatch XML
   */
  private static parseBeachMatchElement(matchXml: string, tournamentId: string): BeachMatch {
    const attrs = XmlParsingUtils.parseXmlAttributes(matchXml);
    
    // Generate stable match ID
    const id = this.generateMatchId(tournamentId, attrs.No);
    
    // Parse team data
    const teamA: MatchTeam = {
      name: attrs.TeamAName,
      matchPoints: this.parseNumber(attrs.MatchPointsA)
    };
    
    const teamB: MatchTeam = {
      name: attrs.TeamBName,
      matchPoints: this.parseNumber(attrs.MatchPointsB)
    };
    
    // Parse score
    const score = this.parseMatchScore(attrs);
    
    // Parse referees
    const referees = this.parseMatchReferees(attrs);
    
    // Map status
    const status = this.mapMatchStatus(attrs.Status);
    
    return {
      // Core identifiers
      id,
      visNo: attrs.No,
      tournamentId,
      
      // Match details
      noInTournament: attrs.NoInTournament,
      localDate: attrs.LocalDate,
      localTime: attrs.LocalTime,
      court: attrs.Court,
      round: attrs.Round,
      
      // Teams and score
      teamA,
      teamB,
      score,
      status,
      
      // Officials
      referees,
      
      // Metadata
      version: 1,
      lastSyncAt: new Date().toISOString()
    };
  }
  
  // Private helper methods
  
  private static generateTournamentId(visNo: string, code?: string): string {
    const codePart = code ? code.replace(/[^a-zA-Z0-9]/g, '') : 'unknown';
    return `trn_${visNo}_${codePart}`.toLowerCase();
  }
  
  private static generateMatchId(tournamentId: string, matchNo: string): string {
    return `${tournamentId}_match_${matchNo}`;
  }
  
  private static extractGender(code?: string, eventGender?: string): GenderType {
    // First try to use explicit Gender field from BeachTournament if available
    if (eventGender) {
      const gender = eventGender.toUpperCase();
      if (gender === 'MEN' || gender === 'M') return GenderType.MALE;
      if (gender === 'WOMEN' || gender === 'W') return GenderType.FEMALE;
      if (gender === 'MIXED') return GenderType.MIXED;
    }
    
    // Fall back to code-based detection
    if (!code) return GenderType.UNKNOWN;
    
    const upperCode = code.toUpperCase();
    if (upperCode.startsWith('M') || upperCode.includes('MEN')) return GenderType.MALE;
    if (upperCode.startsWith('W') || upperCode.includes('WOMEN')) return GenderType.FEMALE;
    
    return GenderType.MIXED;
  }
  
  private static classifyTournament(attrs: any): TournamentType {
    const name = (attrs.Name || '').toLowerCase();
    const code = (attrs.Code || '').toLowerCase();
    const organizerType = attrs.OrganizerType || '';
    
    // Use OrganizerType if available for more accurate classification
    switch (organizerType) {
      case 'Confederation':
        // Could be FIVB, CEV, etc. based on organizer code
        if (attrs.OrganizerCode === 'FIVB') return TournamentType.FIVB;
        if (attrs.OrganizerCode === 'CEV') return TournamentType.CEV;
        break;
      case 'Federation':
        return TournamentType.LOCAL;
    }
    
    // Enhanced pattern matching for tournament classification
    // FIVB tournaments
    if (name.includes('fivb') || 
        name.includes('world tour') || 
        name.includes('world championship') ||
        name.includes('beach pro tour') ||
        code.includes('fivb') ||
        code.includes('bpt') ||
        attrs.OrganizerCode === 'FIVB') {
      return TournamentType.FIVB;
    }
    
    // Beach Pro Tour tournaments (part of FIVB system)
    if (name.includes('elite16') || 
        name.includes('challenge') ||
        name.includes('futures') ||
        code.includes('elite') ||
        code.includes('chall') ||
        code.includes('fut')) {
      return TournamentType.BPT;
    }
    
    // CEV tournaments
    if (name.includes('cev') || 
        name.includes('european') ||
        name.includes('europa') ||
        name.includes('continental') ||
        code.includes('cev') ||
        attrs.OrganizerCode === 'CEV') {
      return TournamentType.CEV;
    }
    
    // Default to local for federation or unknown organizers
    return TournamentType.LOCAL;
  }
  
  private static parseTournamentDates(attrs: any): TournamentDates {
    const dates: TournamentDates = {
      start: attrs.StartDate || '',
      end: attrs.EndDate || ''
    };
    
    // Parse EffectiveDates if available (XML format)
    if (attrs.EffectiveDates) {
      try {
        dates.effectiveDates = attrs.EffectiveDates;
      } catch (error) {
        console.warn('Failed to parse EffectiveDates:', attrs.EffectiveDates);
      }
    }
    
    return dates;
  }
  
  private static inferTournamentStatus(attrs: any, dates: TournamentDates): TournamentStatus {
    const now = new Date();
    const startDate = dates.start ? new Date(dates.start) : null;
    const endDate = dates.end ? new Date(dates.end) : null;
    
    // If we have explicit status info, use it
    if (attrs.Status) {
      const status = attrs.Status.toLowerCase();
      if (status.includes('cancel')) return TournamentStatus.CANCELLED;
      if (status.includes('complete')) return TournamentStatus.COMPLETED;
    }
    
    // Infer from dates
    if (endDate && now > endDate) {
      return TournamentStatus.COMPLETED;
    }
    
    if (startDate && now >= startDate && (!endDate || now <= endDate)) {
      // Could be qualification or main draw - we'd need more info to distinguish
      return TournamentStatus.UPCOMING; // Default for active
    }
    
    return TournamentStatus.UPCOMING;
  }
  
  private static parseMatchScore(attrs: any): MatchScore {
    const score: MatchScore = {};
    
    // Set 1
    if (attrs.PointsTeamASet1 || attrs.PointsTeamBSet1) {
      score.set1 = {
        teamA: this.parseNumber(attrs.PointsTeamASet1),
        teamB: this.parseNumber(attrs.PointsTeamBSet1),
        duration: attrs.DurationSet1
      };
    }
    
    // Set 2
    if (attrs.PointsTeamASet2 || attrs.PointsTeamBSet2) {
      score.set2 = {
        teamA: this.parseNumber(attrs.PointsTeamASet2),
        teamB: this.parseNumber(attrs.PointsTeamBSet2),
        duration: attrs.DurationSet2
      };
    }
    
    // Set 3
    if (attrs.PointsTeamASet3 || attrs.PointsTeamBSet3) {
      score.set3 = {
        teamA: this.parseNumber(attrs.PointsTeamASet3),
        teamB: this.parseNumber(attrs.PointsTeamBSet3),
        duration: attrs.DurationSet3
      };
    }
    
    return score;
  }
  
  private static parseMatchReferees(attrs: any): MatchReferee[] {
    const referees: MatchReferee[] = [];
    
    // Referee 1
    if (attrs.NoReferee1 || attrs.Referee1Name) {
      referees.push({
        visNo: attrs.NoReferee1,
        name: attrs.Referee1Name,
        federationCode: attrs.Referee1FederationCode,
        role: RefereeRole.PRIMARY
      });
    }
    
    // Referee 2
    if (attrs.NoReferee2 || attrs.Referee2Name) {
      referees.push({
        visNo: attrs.NoReferee2,
        name: attrs.Referee2Name,
        federationCode: attrs.Referee2FederationCode,
        role: RefereeRole.SECONDARY
      });
    }
    
    return referees;
  }
  
  private static mapMatchStatus(visStatus?: string): MatchStatus {
    if (!visStatus) return MatchStatus.SCHEDULED;
    
    // Direct mapping from VIS BeachMatchStatus enum values
    switch (visStatus) {
      // Live match states
      case 'InSet1':
      case 'InSet2': 
      case 'InSet3':
      case 'InSet4':
      case 'InSet5':
        return MatchStatus.LIVE;
      
      // Set break states  
      case 'Set1Finished':
      case 'Set2Finished':
      case 'Set3Finished': 
      case 'Set4Finished':
        return MatchStatus.SET_BREAK;
      
      // Ready to start
      case 'ReadyToStart':
        return MatchStatus.READY;
      
      // Match completion states
      case 'Finished':
        return MatchStatus.FINISHED;
      case 'OfficialResult':
        return MatchStatus.OFFICIAL;
      case 'Corrected':
        return MatchStatus.CORRECTED;
      case 'Closed':
        return MatchStatus.CLOSED;
      
      // Scheduled states (numeric 1-15 and Opened)
      case '1': case '2': case '3': case '4': case '5':
      case '6': case '7': case '8': case '9': case '10':
      case '11': case '12': case '13': case '14': case '15':
      case 'Opened':
      default:
        return MatchStatus.SCHEDULED;
    }
  }
  
  private static parseAuxiliaryPersons(xmlContent: string): AuxiliaryPerson[] {
    const items = XmlParsingUtils.parseXmlContent(xmlContent);
    
    return items.map(item => ({
      name: typeof item === 'string' ? item : item.Name || item.name || '',
      role: typeof item === 'object' ? item.Role || item.role : undefined,
      federationCode: typeof item === 'object' ? item.FederationCode || item.federation : undefined
    }));
  }
  
  private static parseOfficialFunctions(xmlContent: string): OfficialFunction[] {
    const items = XmlParsingUtils.parseXmlContent(xmlContent);
    
    return items.map(item => ({
      function: typeof item === 'string' ? item : item.Function || item.function || '',
      description: typeof item === 'object' ? item.Description || item.description : undefined
    }));
  }
  
  private static parseVenues(xmlContent: string): VenueInfo[] {
    const items = XmlParsingUtils.parseXmlContent(xmlContent);
    
    return items.map(item => ({
      name: typeof item === 'string' ? item : item.Name || item.name || '',
      city: typeof item === 'object' ? item.City || item.city : undefined,
      address: typeof item === 'object' ? item.Address || item.address : undefined
    }));
  }
  
  private static parseNumber(value?: string): number | undefined {
    if (!value) return undefined;
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  }
  
  private static generateFallbackCode(attrs: any): string {
    const name = attrs.Name || attrs.Title || 'Tournament';
    const year = new Date().getFullYear();
    const nameCode = name.substring(0, 3).toUpperCase();
    return `${nameCode}${year}`;
  }
}

// Supporting types for transformation
interface SetScore {
  teamA?: number;
  teamB?: number;
  duration?: string;
}

interface AuxiliaryPerson {
  name: string;
  role?: string;
  federationCode?: string;
}

interface OfficialFunction {
  function: string;
  description?: string;
}

interface VenueInfo {
  name: string;
  city?: string;
  address?: string;
}

enum RefereeRole {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY'
}
```

## 3. Domain Model Transformers

```typescript
/**
 * Transforms domain models per UI consumption
 */
class DomainModelTransformer {
  
  /**
   * Transform Tournament per UI display
   */
  static toTournamentCard(tournament: Tournament): TournamentCardData {
    // Generate display dates
    const displayDates = this.formatTournamentDates(tournament.dates);
    
    // Generate status display
    const statusDisplay = this.formatTournamentStatus(tournament.status, tournament.dates);
    
    // Generate location display
    const locationDisplay = this.formatLocation(tournament.location);
    
    return {
      id: tournament.id,
      name: tournament.name,
      title: tournament.title,
      code: tournament.code,
      dates: displayDates,
      location: locationDisplay,
      status: statusDisplay,
      gender: tournament.gender,
      tournamentType: tournament.tournamentType,
      
      // UI metadata
      isActive: this.isTournamentActive(tournament),
      hasOfficials: Boolean(tournament.officials?.auxiliaryPersons?.length),
      flags: {
        hasBeach: tournament.hasBeachTournament,
        hasMen: tournament.hasMenTournament,
        hasWomen: tournament.hasWomenTournament,
        isVisManaged: tournament.isVisManaged
      }
    };
  }
  
  /**
   * Transform BeachMatch per UI display
   */
  static toMatchCard(match: BeachMatch): MatchCardData {
    // Format teams
    const teams = this.formatMatchTeams(match.teamA, match.teamB);
    
    // Format score display
    const scoreDisplay = this.formatMatchScore(match.score, match.status);
    
    // Format time display
    const timeDisplay = this.formatMatchTime(match.localDate, match.localTime);
    
    // Format referees
    const refereesDisplay = this.formatReferees(match.referees);
    
    return {
      id: match.id,
      teams,
      score: scoreDisplay,
      time: timeDisplay,
      court: match.court,
      round: match.round,
      status: match.status,
      referees: refereesDisplay,
      
      // UI metadata
      isLive: match.status === MatchStatus.LIVE,
      isFinished: match.status === MatchStatus.FINISHED,
      hasScore: Boolean(match.score.set1 || match.score.set2 || match.score.set3)
    };
  }
  
  // Private formatting methods
  
  private static formatTournamentDates(dates: TournamentDates): string {
    if (!dates.start) return 'Dates TBD';
    
    const startDate = new Date(dates.start);
    const endDate = dates.end ? new Date(dates.end) : null;
    
    if (!endDate || startDate.toDateString() === endDate.toDateString()) {
      // Single day tournament
      return startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
    
    // Multi-day tournament
    if (startDate.getFullYear() === endDate.getFullYear()) {
      if (startDate.getMonth() === endDate.getMonth()) {
        // Same month
        return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.getDate()}, ${endDate.getFullYear()}`;
      } else {
        // Different months, same year
        return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${endDate.getFullYear()}`;
      }
    } else {
      // Different years
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
  }
  
  private static formatTournamentStatus(status: TournamentStatus, dates: TournamentDates): TournamentStatusDisplay {
    const now = new Date();
    const startDate = dates.start ? new Date(dates.start) : null;
    
    switch (status) {
      case TournamentStatus.COMPLETED:
        return { label: 'Completed', color: 'gray', priority: 4 };
        
      case TournamentStatus.CANCELLED:
        return { label: 'Cancelled', color: 'red', priority: 1 };
        
      case TournamentStatus.QUALIFICATION:
        return { label: 'Qualification', color: 'yellow', priority: 2 };
        
      case TournamentStatus.MAIN_DRAW:
        return { label: 'Main Draw', color: 'green', priority: 2 };
        
      case TournamentStatus.UPCOMING:
        if (startDate) {
          const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntil <= 0) {
            return { label: 'Live', color: 'green', priority: 2 };
          } else if (daysUntil <= 7) {
            return { label: `${daysUntil} days`, color: 'orange', priority: 3 };
          } else {
            return { label: 'Upcoming', color: 'blue', priority: 3 };
          }
        }
        return { label: 'Upcoming', color: 'blue', priority: 3 };
        
      default:
        return { label: 'Unknown', color: 'gray', priority: 4 };
    }
  }
  
  private static formatLocation(location?: TournamentLocation): string {
    if (!location) return '';
    
    const parts: string[] = [];
    
    if (location.city) parts.push(location.city);
    if (location.countryCode) parts.push(location.countryCode);
    
    return parts.join(', ');
  }
  
  private static isTournamentActive(tournament: Tournament): boolean {
    const now = new Date();
    const startDate = tournament.dates.start ? new Date(tournament.dates.start) : null;
    const endDate = tournament.dates.end ? new Date(tournament.dates.end) : null;
    
    if (startDate && endDate) {
      return now >= startDate && now <= endDate;
    }
    
    return tournament.status === TournamentStatus.QUALIFICATION ||
           tournament.status === TournamentStatus.MAIN_DRAW;
  }
  
  private static formatMatchTeams(teamA: MatchTeam, teamB: MatchTeam): MatchTeamsDisplay {
    return {
      teamA: {
        name: teamA.name || 'TBD',
        matchPoints: teamA.matchPoints
      },
      teamB: {
        name: teamB.name || 'TBD',
        matchPoints: teamB.matchPoints
      }
    };
  }
  
  private static formatMatchScore(score: MatchScore, status: MatchStatus): MatchScoreDisplay {
    const sets: SetScoreDisplay[] = [];
    
    if (score.set1) {
      sets.push({
        teamA: score.set1.teamA || 0,
        teamB: score.set1.teamB || 0,
        duration: score.set1.duration
      });
    }
    
    if (score.set2) {
      sets.push({
        teamA: score.set2.teamA || 0,
        teamB: score.set2.teamB || 0,
        duration: score.set2.duration
      });
    }
    
    if (score.set3) {
      sets.push({
        teamA: score.set3.teamA || 0,
        teamB: score.set3.teamB || 0,
        duration: score.set3.duration
      });
    }
    
    return {
      sets,
      isComplete: status === MatchStatus.FINISHED,
      isLive: status === MatchStatus.LIVE
    };
  }
  
  private static formatMatchTime(localDate?: string, localTime?: string): MatchTimeDisplay {
    if (!localDate) return { display: 'Time TBD', isToday: false };
    
    const matchDate = new Date(`${localDate}${localTime ? `T${localTime}` : ''}`);
    const now = new Date();
    const isToday = matchDate.toDateString() === now.toDateString();
    
    let display: string;
    
    if (isToday) {
      display = localTime ? 
        matchDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) :
        'Today';
    } else {
      display = matchDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        ...(localTime ? { hour: 'numeric', minute: '2-digit' } : {})
      });
    }
    
    return { display, isToday };
  }
  
  private static formatReferees(referees: MatchReferee[]): RefereeDisplay[] {
    return referees.map(referee => ({
      name: referee.name || 'TBD',
      federationCode: referee.federationCode,
      role: referee.role,
      isPrimary: referee.role === RefereeRole.PRIMARY
    }));
  }
}

// UI Display Types
interface TournamentCardData {
  id: string;
  name: string;
  title?: string;
  code: string;
  dates: string;
  location: string;
  status: TournamentStatusDisplay;
  gender: GenderType;
  tournamentType: TournamentType;
  isActive: boolean;
  hasOfficials: boolean;
  flags: {
    hasBeach: boolean;
    hasMen: boolean;
    hasWomen: boolean;
    isVisManaged: boolean;
  };
}

interface TournamentStatusDisplay {
  label: string;
  color: 'red' | 'yellow' | 'green' | 'blue' | 'orange' | 'gray';
  priority: number; // For sorting: 1=highest, 4=lowest
}

interface MatchCardData {
  id: string;
  teams: MatchTeamsDisplay;
  score: MatchScoreDisplay;
  time: MatchTimeDisplay;
  court?: string;
  round?: string;
  status: MatchStatus;
  referees: RefereeDisplay[];
  isLive: boolean;
  isFinished: boolean;
  hasScore: boolean;
}

interface MatchTeamsDisplay {
  teamA: { name: string; matchPoints?: number };
  teamB: { name: string; matchPoints?: number };
}

interface MatchScoreDisplay {
  sets: SetScoreDisplay[];
  isComplete: boolean;
  isLive: boolean;
}

interface SetScoreDisplay {
  teamA: number;
  teamB: number;
  duration?: string;
}

interface MatchTimeDisplay {
  display: string;
  isToday: boolean;
}

interface RefereeDisplay {
  name: string;
  federationCode?: string;
  role: RefereeRole;
  isPrimary: boolean;
}
```

## 4. Legacy Data Migration

```typescript
/**
 * Migra da vecchia struttura Tournament a nuova
 */
class LegacyDataMigrator {
  
  /**
   * Migra vecchio Tournament interface alla nuova struttura
   */
  static migrateLegacyTournament(legacy: LegacyTournament): Tournament {
    // Generate new stable ID
    const id = this.generateStableId(legacy.No, legacy.Code);
    
    // Extract gender and type
    const gender = this.extractGenderFromLegacy(legacy);
    const tournamentType = this.classifyLegacyTournament(legacy);
    
    // Migrate dates
    const dates = this.migrateDates(legacy);
    
    // Infer status
    const status = this.inferStatusFromLegacy(legacy, dates);
    
    const migrated: Tournament = {
      // Core identifiers - NUOVI
      id,
      visNo: legacy.No,
      eventNo: legacy.NoEvent || legacy.No, // Best guess per event number
      
      // Basic info
      code: legacy.Code || this.generateCodeFromName(legacy.Name),
      name: legacy.Name || legacy.Title || 'Migrated Tournament',
      title: legacy.Title,
      
      // Classification - NUOVA
      gender,
      tournamentType,
      
      // Dates - RISTRUTTURATE  
      dates,
      
      // Status - NUOVO
      status,
      
      // Flags - MIGRATI/NUOVI
      hasBeachTournament: legacy.HasBeachTournament === true,
      hasVolleyTournament: legacy.HasVolleyTournament === true,
      hasMenTournament: gender === GenderType.MALE, // Inferred
      hasWomenTournament: gender === GenderType.FEMALE, // Inferred
      isVisManaged: legacy.IsVisManaged === true,
      
      // Metadata
      version: 1, // Start fresh
      lastSyncAt: new Date().toISOString()
    };
    
    // Migrate location if available
    if (legacy.City || legacy.Country || legacy.Venue) {
      migrated.location = {
        countryCode: legacy.CountryCode,
        city: legacy.City,
        venue: legacy.Venue || legacy.Location,
        courts: this.parseNumber(legacy.Courts),
        surface: legacy.Surface
      };
    }
    
    // Migrate officials if available
    if (legacy.AuxiliaryPersons || legacy.OfficialFunctions || legacy.Referees) {
      migrated.officials = {
        tournamentId: id,
        auxiliaryPersons: this.migrateLegacyOfficials(legacy.AuxiliaryPersons),
        officialFunctions: this.migrateLegacyFunctions(legacy.OfficialFunctions),
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Store merge info se era merged tournament
    if (legacy._mergedTournaments) {
      (migrated as any)._migrationInfo = {
        wasMerged: true,
        originalTournaments: legacy._mergedTournaments,
        migratedAt: new Date().toISOString()
      };
    }
    
    return migrated;
  }
  
  /**
   * Migra vecchio BeachMatch a nuovo
   */
  static migrateLegacyBeachMatch(legacy: LegacyBeachMatch, tournamentId: string): BeachMatch {
    const id = `${tournamentId}_match_${legacy.No}`;
    
    const migrated: BeachMatch = {
      // Core identifiers
      id,
      visNo: legacy.No,
      tournamentId,
      
      // Match details
      noInTournament: legacy.NoInTournament,
      localDate: legacy.LocalDate,
      localTime: legacy.LocalTime,
      court: legacy.Court,
      round: legacy.Round,
      
      // Teams - RISTRUTTURATI
      teamA: {
        name: legacy.TeamAName,
        matchPoints: this.parseNumber(legacy.MatchPointsA)
      },
      teamB: {
        name: legacy.TeamBName,
        matchPoints: this.parseNumber(legacy.MatchPointsB)
      },
      
      // Score - RISTRUTTURATO
      score: {
        set1: this.migrateSetScore(legacy, 1),
        set2: this.migrateSetScore(legacy, 2),
        set3: this.migrateSetScore(legacy, 3)
      },
      
      // Status - MAPPATO
      status: this.mapLegacyMatchStatus(legacy.Status),
      
      // Referees - RISTRUTTURATI
      referees: this.migrateLegacyReferees(legacy),
      
      // Metadata
      version: 1,
      lastSyncAt: new Date().toISOString()
    };
    
    return migrated;
  }
  
  // Private migration helpers
  
  private static generateStableId(visNo: string, code?: string): string {
    const codePart = code ? code.replace(/[^a-zA-Z0-9]/g, '') : 'migrated';
    return `trn_${visNo}_${codePart}`.toLowerCase();
  }
  
  private static extractGenderFromLegacy(legacy: LegacyTournament): GenderType {
    // Check explicit gender field first
    if (legacy.Gender) {
      const gender = legacy.Gender.toUpperCase();
      if (gender === 'M' || gender.includes('MEN')) return GenderType.MALE;
      if (gender === 'W' || gender.includes('WOMEN')) return GenderType.FEMALE;
    }
    
    // Extract from code
    return VisResponseParser.extractGender(legacy.Code);
  }
  
  private static classifyLegacyTournament(legacy: LegacyTournament): TournamentType {
    // Use same logic as parser
    return VisResponseParser.classifyTournament({
      Name: legacy.Name,
      Code: legacy.Code
    });
  }
  
  private static migrateDates(legacy: LegacyTournament): TournamentDates {
    const dates: TournamentDates = {
      start: legacy.StartDate || '',
      end: legacy.EndDate || ''
    };
    
    // Migrate qualification/main draw dates if available
    if (legacy.StartDateQualification || legacy.StartDateMainDraw) {
      dates.qualification = {
        start: legacy.StartDateQualification,
        end: legacy.EndDateQualification
      };
      dates.mainDraw = {
        start: legacy.StartDateMainDraw,
        end: legacy.EndDateMainDraw || legacy.EndMainDrawDate
      };
    }
    
    return dates;
  }
  
  private static migrateSetScore(legacy: any, setNumber: number): SetScore | undefined {
    const teamAKey = `PointsTeamASet${setNumber}` as keyof typeof legacy;
    const teamBKey = `PointsTeamBSet${setNumber}` as keyof typeof legacy;
    const durationKey = `DurationSet${setNumber}` as keyof typeof legacy;
    
    const teamAPoints = this.parseNumber(legacy[teamAKey] as string);
    const teamBPoints = this.parseNumber(legacy[teamBKey] as string);
    
    if (teamAPoints !== undefined || teamBPoints !== undefined) {
      return {
        teamA: teamAPoints,
        teamB: teamBPoints,
        duration: legacy[durationKey] as string
      };
    }
    
    return undefined;
  }
  
  private static migrateLegacyReferees(legacy: any): MatchReferee[] {
    const referees: MatchReferee[] = [];
    
    // Referee 1
    if (legacy.NoReferee1 || legacy.Referee1Name) {
      referees.push({
        visNo: legacy.NoReferee1,
        name: legacy.Referee1Name,
        federationCode: legacy.Referee1FederationCode,
        role: RefereeRole.PRIMARY
      });
    }
    
    // Referee 2
    if (legacy.NoReferee2 || legacy.Referee2Name) {
      referees.push({
        visNo: legacy.NoReferee2,
        name: legacy.Referee2Name,
        federationCode: legacy.Referee2FederationCode,
        role: RefereeRole.SECONDARY
      });
    }
    
    return referees;
  }
  
  private static parseNumber(value?: string): number | undefined {
    if (!value) return undefined;
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  }
}

// Legacy types per migration  
interface LegacyTournament {
  No: string;
  NoTournament?: string;
  Name?: string;
  Title?: string;
  Code?: string;
  StartDate?: string;
  EndDate?: string;
  StartDateQualification?: string;
  StartDateMainDraw?: string;
  EndDateQualification?: string;
  EndDateMainDraw?: string;
  EndMainDrawDate?: string;
  City?: string;
  Country?: string;
  CountryCode?: string;
  Location?: string;
  Venue?: string;
  Courts?: string;
  Surface?: string;
  Gender?: string;
  Status?: string;
  HasBeachTournament?: boolean;
  HasVolleyTournament?: boolean;
  IsVisManaged?: boolean;
  AuxiliaryPersons?: string;
  OfficialFunctions?: string;
  Referees?: string;
  NoEvent?: string;
  _mergedTournaments?: Array<{
    No: string;
    Name?: string;
    Code?: string;
    StartDate?: string;
    EndDate?: string;
  }>;
}

interface LegacyBeachMatch {
  No: string;
  NoInTournament?: string;
  LocalDate?: string;
  LocalTime?: string;
  TeamAName?: string;
  TeamBName?: string;
  Court?: string;
  MatchPointsA?: string;
  MatchPointsB?: string;
  PointsTeamASet1?: string;
  PointsTeamBSet1?: string;
  PointsTeamASet2?: string;
  PointsTeamBSet2?: string;
  PointsTeamASet3?: string;
  PointsTeamBSet3?: string;
  DurationSet1?: string;
  DurationSet2?: string;
  DurationSet3?: string;
  Status?: string;
  Round?: string;
  NoReferee1?: string;
  NoReferee2?: string;
  Referee1Name?: string;
  Referee2Name?: string;
  Referee1FederationCode?: string;
  Referee2FederationCode?: string;
}
```

Questo Transformation Layer garantisce:

✅ **Parsing XML robusto** con gestione errori
✅ **Conversione type-safe** da VIS API a domain models  
✅ **UI transformation** ottimizzate per display
✅ **Migration path** da struttura legacy
✅ **Validazione dati** e fallback values
✅ **Performance** con parsing efficiente

Vuoi che proceda con la **strategia di caching intelligente** o preferisci vedere un esempio di integrazione pratica?