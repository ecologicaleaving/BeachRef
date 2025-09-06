import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Text as RNText } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
// import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Text } from '../components/Typography/Text';
import { Container } from '../components/Foundation/Container';
import { NavigationHeader } from '../components/navigation/NavigationHeader';
import { colors } from '../theme/tokens';
import { AssignmentStatusProvider } from '../hooks/useAssignmentStatus';
import { FlagImage } from '../components/FlagImage';
import { RefereeStatsService, SeasonStats, CareerStats } from '../services/RefereeStatsService';
import { DefaultTournamentService } from '../services/DefaultTournamentService';

interface Referee {
  noReferee: string;
  firstName: string;
  lastName: string;
  federationCode: string;
  gender: string;
  level?: string;
}

interface RefereeStats {
  totalMatches: number;
  matchesAsFirst: number;
  matchesAsSecond: number;
  menMatches: number;
  womenMatches: number;
}

type StatsTab = 'Current' | 'Season' | 'Career';

const RefereeCard = ({ 
  referee, 
  tournamentNo, 
  expanded, 
  onToggle,
  tournamentInfo 
}: { 
  referee: Referee; 
  tournamentNo: string;
  expanded: boolean;
  onToggle: () => void;
  tournamentInfo: TournamentInfo | null;
}) => {
  // Simple minimal version to isolate the issue
  return (
    <TouchableOpacity style={styles.card} onPress={onToggle} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.refereeName}>
          {referee?.firstName || 'Unknown'} {referee?.lastName || 'Referee'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

interface TournamentInfo {
  visNo: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
}

function TournamentRefScreenContent() {
  const { tournamentNo, tournamentName, tournamentData, matchData } = useLocalSearchParams<{
    tournamentNo: string;
    tournamentName: string;
    tournamentData?: string;
    matchData?: string;
  }>();

  // Parse tournament data to determine status-based logic
  const tournament: TournamentInfo | null = React.useMemo(() => {
    if (tournamentData) {
      try {
        return JSON.parse(tournamentData) as TournamentInfo;
      } catch (error) {
        console.error('Error parsing tournament data:', error);
      }
    }
    return null;
  }, [tournamentData]);
  
  
  const [referees, setReferees] = useState<Referee[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedRefereeId, setExpandedRefereeId] = useState<string | null>(null);


  const loadReferees = async () => {
    if (!tournamentNo) return;
    
    setLoading(true);
    try {
      
      // Determine tournament status and use appropriate approach
      let tournamentStatus = 'SCHEDULED'; // fallback
      
      if (tournament) {
        tournamentStatus = DefaultTournamentService.getTournamentStatus(tournament.startDate, tournament.endDate);
      }

      // For COMPLETED tournaments, extract referees from match list
      // For LIVE/SCHEDULED tournaments, try GetEventRefereeList first, fallback to match list
      if (tournamentStatus === 'COMPLETED') {
        await loadRefereesFromMatchList();
      } else {
        const success = await loadRefereesFromAPI();
        if (!success) {
          await loadRefereesFromMatchList();
        }
      }
    } catch (error) {
      console.error('Error loading referees:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRefereesFromAPI = async (): Promise<boolean> => {
    try {
      const xml = `<Requests>
  <Request Type="GetEventRefereeList"
           Fields="NoReferee FirstName LastName FederationCode Gender Role Status">
    <Filter NoEvent="${tournamentNo}"/>
  </Request>
</Requests>`;

      const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
        method: "POST",
        headers: {
          "Accept": "application/xml",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ Request: xml })
      });
      
      if (response.ok) {
        const xmlResponse = await response.text();
        const parsedReferees = parseRefereeXML(xmlResponse);
        if (parsedReferees.length > 0) {
          setReferees(parsedReferees);
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error in loadRefereesFromAPI:', error);
      return false;
    }
  };

  // Helper function to parse XML response into match objects
  const parseMatchesFromXML = (xmlText: string) => {
    const matches: any[] = [];
    
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      // Try different possible XML structures
      const selectors = [
        'BeachMatch',
        'Beachvolleyball > BeachMatch',
        'Response > BeachMatch',
        'Responses > Response > BeachMatch'
      ];
      
      let matchNodes: NodeListOf<Element> | null = null;
      for (const selector of selectors) {
        matchNodes = xmlDoc.querySelectorAll(selector);
        if (matchNodes.length > 0) {
          break;
        }
      }
      
      if (!matchNodes || matchNodes.length === 0) {
        // Fallback: Use regex to extract BeachMatch elements
        const matchRegex = /<BeachMatch[^>]*>/g;
        const regexMatches = [...xmlText.matchAll(matchRegex)];
        
        regexMatches.forEach((matchStr) => {
          const match: any = {};
          const fullMatch = matchStr[0];
          
          // Extract all attributes using regex
          const attrRegex = /(\w+)="([^"]*)"/g;
          let attrMatch;
          while ((attrMatch = attrRegex.exec(fullMatch)) !== null) {
            match[attrMatch[1]] = attrMatch[2];
          }
          
          matches.push(match);
        });
      } else {
        // Use DOM parsing
        matchNodes.forEach((matchNode) => {
          const match: any = {};
          
          // Extract all attributes from the match node
          const attributes = matchNode.attributes;
          for (let i = 0; i < attributes.length; i++) {
            const attr = attributes[i];
            match[attr.name] = attr.value;
          }
          
          matches.push(match);
        });
      }
      
    } catch (error) {
      // Silent fail
    }
    
    return matches;
  };

  /*
  const fetchRefereeDetailsByName = async (firstName: string, lastName: string, tournamentNo: string): Promise<Referee | null> => {
    try {
      const xml = `<Requests>
  <Request Type="GetEventRefereeList"
           Fields="NoReferee FirstName LastName FederationCode Gender Level Status">
    <Filter NoEvent="${tournamentNo}" LastName="${lastName}" FirstName="${firstName}"/>
  </Request>
</Requests>`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
        method: "POST",
        headers: {
          "Accept": "application/xml",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ Request: xml }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`GetEventRefereeList API failed: ${response.status}`);
      }

      const xmlResponse = await response.text();
      return parseEventRefereeFromXML(xmlResponse, firstName, lastName);
    } catch (error) {
      console.error(`Failed to fetch referee details for ${firstName} ${lastName}:`, error);
      return null;
    }
  };
  */


  const fetchAllRefereesFromAPI = async (): Promise<Referee[]> => {
    try {
      
      // Try GetEventRefereeList first
      let xml = `<Requests>
  <Request Type="GetEventRefereeList"
           Fields="NoReferee FirstName LastName FederationCode Gender Level Status">
    <Filter NoEvent="${tournamentNo}"/>
  </Request>
</Requests>`;

      let response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
        method: "POST",
        headers: {
          "Accept": "application/xml",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ Request: xml })
      });

      if (response.ok) {
        const xmlResponse = await response.text();
        const referees = parseRefereeXML(xmlResponse);
        
        if (referees.length > 0) {
          return referees;
        }
      }
      
      // Fallback: Try GetRefereeList without event filter
      xml = `<Requests>
  <Request Type="GetRefereeList"
           Fields="NoReferee FirstName LastName FederationCode Gender Level Status">
  </Request>
</Requests>`;

      response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
        method: "POST",
        headers: {
          "Accept": "application/xml",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({ Request: xml })
      });

      if (response.ok) {
        const xmlResponse = await response.text();
        const referees = parseRefereeListXML(xmlResponse);
        if (referees.length > 0) {
          return referees;
        }
      }
      
      return [];
    } catch (error) {
      console.error('Failed to fetch all referees from API:', error);
      return [];
    }
  };

  const parseEventRefereeFromXML = (xmlString: string, firstName: string, lastName: string): Referee | null => {
    try {
      // Look for all EventReferee elements in the response
      const refereeMatches = xmlString.match(/<EventReferee[^>]*\/>/g);
      if (!refereeMatches || refereeMatches.length === 0) {
        return null;
      }

      // Find the specific referee by name
      for (const refereeElement of refereeMatches) {
        const firstNameAttr = refereeElement.match(/FirstName="([^"]*)"/)?.[1] || '';
        const lastNameAttr = refereeElement.match(/LastName="([^"]*)"/)?.[1] || '';
        
        // Check if this is the referee we're looking for
        if (firstNameAttr.toLowerCase() === firstName.toLowerCase() && 
            lastNameAttr.toLowerCase() === lastName.toLowerCase()) {
          
          const noReferee = refereeElement.match(/NoReferee="([^"]*)"/)?.[1] || '';
          const federationCode = refereeElement.match(/FederationCode="([^"]*)"/)?.[1] || '';
          const gender = refereeElement.match(/Gender="([^"]*)"/)?.[1] || '';
          const level = refereeElement.match(/Level="([^"]*)"/)?.[1] || '';
          
          return {
            noReferee,
            firstName: firstNameAttr,
            lastName: lastNameAttr,
            federationCode,
            gender,
            level
          };
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  };

  /*
  const parseRefereeDetailsFromXML = (xmlString: string, noReferee: string): Referee | null => {
    try {
      // Parse the XML response to extract referee details
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      // Look for Referee elements
      const refereeElement = xmlDoc.querySelector('Referee');
      if (!refereeElement) {
        // Try attribute-based parsing for self-closing tags
        const refereeMatch = xmlString.match(/<Referee[^>]*>/);
        if (refereeMatch) {
          const refString = refereeMatch[0];
          const firstName = refString.match(/FirstName="([^"]*)"/)?.[1] || '';
          const lastName = refString.match(/LastName="([^"]*)"/)?.[1] || '';
          const federationCode = refString.match(/FederationCode="([^"]*)"/)?.[1] || '';
          const gender = refString.match(/Gender="([^"]*)"/)?.[1] || '';
          const level = refString.match(/Level="([^"]*)"/)?.[1] || '';
          
          return {
            noReferee,
            firstName,
            lastName,
            federationCode,
            gender,
            level
          };
        }
        return null;
      }

      // Extract referee details from DOM
      const firstName = refereeElement.getAttribute('FirstName') || '';
      const lastName = refereeElement.getAttribute('LastName') || '';
      const federationCode = refereeElement.getAttribute('FederationCode') || '';
      const gender = refereeElement.getAttribute('Gender') || '';
      const level = refereeElement.getAttribute('Level') || '';

      return {
        noReferee,
        firstName,
        lastName,
        federationCode,
        gender,
        level
      };
    } catch (error) {
      console.error('Error parsing referee XML:', error);
      return null;
    }
  };
  */

  const loadRefereesFromPassedMatchData = async (): Promise<void> => {
    try {
      if (!matchData) {
        return;
      }
      
      const matches = JSON.parse(matchData);
      
      // Extract referee information using multiple field name variations
      const refereeMap = new Map<string, {name: string, noReferee?: string, federationCode?: string, gender?: string, function?: string}>();
      
      matches.forEach((match) => {
        // Extract referees from refereeAssignments field
        const refereeAssignments = match.refereeAssignments;
        
        if (refereeAssignments && Array.isArray(refereeAssignments)) {
          refereeAssignments.forEach((assignment) => {
            // Try different possible field names for referee name
            const refereeName = assignment.refereeName || 
                              assignment.name || 
                              (assignment.firstName && assignment.lastName ? `${assignment.firstName} ${assignment.lastName}` : null) ||
                              assignment.fullName ||
                              assignment.referee?.name ||
                              assignment.referee?.refereeName;
                              
            const refereeNo = assignment.refereeNo || 
                            assignment.noReferee || 
                            assignment.id ||
                            assignment.referee?.no ||
                            assignment.referee?.id;
            
            // Extract additional referee information
            const federationCode = assignment.federationCode || 
                                 assignment.federation || 
                                 assignment.countryCode ||
                                 assignment.referee?.federationCode ||
                                 assignment.referee?.countryCode;
                                 
            // Note: Gender information is not available in match-level referee assignments
            // Gender data would need to be fetched from the referee master data API
            const gender = assignment.gender || 
                         assignment.referee?.gender;
                         
            const refereeFunction = assignment.function || 
                                  assignment.role ||
                                  assignment.referee?.function;
            
            if (refereeName && refereeName.trim()) {
              const name = refereeName.trim();
              if (!refereeMap.has(name)) {
                refereeMap.set(name, { 
                  name, 
                  noReferee: refereeNo, 
                  federationCode, 
                  gender,
                  function: refereeFunction 
                });
              }
            }
          });
        } else if (refereeAssignments && typeof refereeAssignments === 'object') {
          // If refereeAssignments is an object rather than array
          // Try to extract referee names from object structure
          Object.values(refereeAssignments).forEach((assignment: any) => {
            if (assignment && typeof assignment === 'object') {
              const refereeName = assignment.refereeName || 
                                assignment.name || 
                                (assignment.firstName && assignment.lastName ? `${assignment.firstName} ${assignment.lastName}` : null) ||
                                assignment.fullName;
                                
              const refereeNo = assignment.refereeNo || 
                              assignment.noReferee || 
                              assignment.id;
              
              // Extract additional referee information
              const federationCode = assignment.federationCode || 
                                   assignment.federation || 
                                   assignment.countryCode;
                                   
              const gender = assignment.gender;
                           
              const refereeFunction = assignment.function || 
                                    assignment.role;
              
              if (refereeName && refereeName.trim()) {
                const name = refereeName.trim();
                if (!refereeMap.has(name)) {
                  refereeMap.set(name, { 
                    name, 
                    noReferee: refereeNo, 
                    federationCode, 
                    gender,
                    function: refereeFunction 
                  });
                }
                }
            }
          });
        }
      });
      
      const refereeList = Array.from(refereeMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      // For passed match data, try to enhance with complete referee details from API
      const extractedReferees: Referee[] = [];
      
      // First, try to get all referees from the primary API to get complete data (including gender)
      let apiReferees: Referee[] = [];
      try {
        apiReferees = await fetchAllRefereesFromAPI();
      } catch (error) {
        apiReferees = [];
      }
      
      for (const referee of refereeList) {
        try {
          // Split name into first and last name
          const nameParts = referee.name.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          // Try to find matching referee in API data to get complete information (especially gender)
          let completeData: Referee | null = null;
          if (apiReferees.length > 0) {
            completeData = apiReferees.find(apiRef => 
              apiRef.firstName.toLowerCase() === firstName.toLowerCase() && 
              apiRef.lastName.toLowerCase() === lastName.toLowerCase()
            ) || null;
            
          }
          
          // Use complete data if available, otherwise create basic referee object with extracted data
          const refereeData: Referee = completeData || {
            noReferee: referee.noReferee || referee.name.toLowerCase().replace(/\s+/g, '_'),
            firstName,
            lastName,
            federationCode: referee.federationCode || '',
            gender: referee.gender || '',
            level: ''
          };
          
          extractedReferees.push(refereeData);
        } catch (error) {
        }
      }
      
      setReferees(extractedReferees);
    } catch (error) {
      throw error; // Re-throw to trigger fallback
    }
  };

  const loadRefereesFromMatchList = async (): Promise<void> => {
    // First try to use passed match data
    if (matchData) {
      try {
        await loadRefereesFromPassedMatchData();
        return;
      } catch (error) {
        console.error('Error using passed match data, falling back to API:', error);
      }
    }
    
    // Fallback to API call if no match data passed or if parsing failed
    try {
      
      // Use CacheService first to get matches if available
      let matches: any[] = [];
      
      // Try to get matches from CacheService first (more reliable)
      try {
        const { CacheService } = await import('../services/CacheService');
        const matchesResult = await CacheService.getMatches(tournamentNo);
        
        if (matchesResult.success && matchesResult.data && matchesResult.data.length > 0) {
          matches = matchesResult.data;
        }
      } catch {
        // CacheService not available, continue to direct API
      }
      
      // If CacheService didn't work, make direct API call
      if (matches.length === 0) {
        const xml = `<Requests>
  <Request Type="GetBeachMatchList"
           Fields="No NoInTournament TournamentGender TeamAName TeamBName LocalDate LocalTime Court Status Round MatchPointsA MatchPointsB PointsTeamASet1 PointsTeamBSet1 PointsTeamASet2 PointsTeamBSet2 PointsTeamASet3 PointsTeamBSet3 NoReferee1 NoReferee2 Referee1Name Referee2Name Referee1FederationCode Referee2FederationCode">
    <Filter NoEvent="${tournamentNo}" IncludeReferees="true"/>
  </Request>
</Requests>`;

        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45000);
        
        const response = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
          method: "POST",
          headers: {
            "Accept": "application/xml",
            "Content-Type": "application/x-www-form-urlencoded"
          },
          body: new URLSearchParams({ Request: xml }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }
        
        const xmlResponse = await response.text();
        
        matches = parseMatchesFromXML(xmlResponse);
      }
      
      // Extract referee names using refereeAssignments field (more robust)
      const refereeNames = new Set<string>();
      
      matches.forEach((match) => {
        const refereeAssignments = match.refereeAssignments;
        
        if (refereeAssignments && Array.isArray(refereeAssignments)) {
          refereeAssignments.forEach((assignment) => {
            const refereeName = assignment.refereeName || 
                              assignment.name || 
                              assignment.firstName && assignment.lastName ? `${assignment.firstName} ${assignment.lastName}` :
                              assignment.fullName ||
                              assignment.referee?.name ||
                              assignment.referee?.refereeName;
            
            if (refereeName && refereeName.trim()) {
              refereeNames.add(refereeName.trim());
            }
          });
        } else if (refereeAssignments && typeof refereeAssignments === 'object') {
          Object.values(refereeAssignments).forEach((assignment: any) => {
            if (assignment && typeof assignment === 'object') {
              const refereeName = assignment.refereeName || 
                                assignment.name || 
                                assignment.firstName && assignment.lastName ? `${assignment.firstName} ${assignment.lastName}` :
                                assignment.fullName;
              
              if (refereeName && refereeName.trim()) {
                refereeNames.add(refereeName.trim());
              }
            }
          });
        }
      });
      
      const sortedRefereeNames = Array.from(refereeNames).sort();
      
      // Try to get complete referee data from API to enhance with gender information
      let apiReferees: Referee[] = [];
      try {
        apiReferees = await fetchAllRefereesFromAPI();
      } catch (error) {
        apiReferees = [];
      }
      
      // Convert to Referee objects and enhance with API data if available
      const extractedReferees: Referee[] = sortedRefereeNames.map(name => {
        const nameParts = name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Try to find matching referee in API data to get complete information (especially gender)
        let completeData: Referee | null = null;
        if (apiReferees.length > 0) {
          completeData = apiReferees.find(apiRef => 
            apiRef.firstName.toLowerCase() === firstName.toLowerCase() && 
            apiRef.lastName.toLowerCase() === lastName.toLowerCase()
          ) || null;
          
        }
        
        // Use complete data if available, otherwise create basic referee object
        return completeData || {
          noReferee: name.toLowerCase().replace(/\s+/g, '_'),
          firstName,
          lastName,
          federationCode: '',
          gender: ''
        };
      });
      
      setReferees(extractedReferees);
      
    } catch (error) {
      console.error('Error in loadRefereesFromMatchList:', error);
      setReferees([]);
    }
  };

  const parseRefereeXML = (xmlString: string): Referee[] => {
    const referees: Referee[] = [];
    const refereeMatches = xmlString.match(/<EventReferee[^>]*>/g);
    
    if (refereeMatches) {
      refereeMatches.forEach(match => {
        const noReferee = match.match(/NoReferee="([^"]*)"/)?.[1] || '';
        const firstName = match.match(/FirstName="([^"]*)"/)?.[1] || '';
        const lastName = match.match(/LastName="([^"]*)"/)?.[1] || '';
        const federationCode = match.match(/FederationCode="([^"]*)"/)?.[1] || '';
        const gender = match.match(/Gender="([^"]*)"/)?.[1] || '';
        const level = match.match(/Level="([^"]*)"/)?.[1] || '';
        
        // Only add referee if they have at least a name
        if (firstName.trim() || lastName.trim()) {
          referees.push({
            noReferee,
            firstName,
            lastName,
            federationCode,
            gender,
            level
          });
        }
      });
    }
    
    return referees;
  };

  const parseRefereeListXML = (xmlString: string): Referee[] => {
    const referees: Referee[] = [];
    const refereeMatches = xmlString.match(/<Referee[^>]*>/g);
    
    if (refereeMatches) {
      refereeMatches.forEach(match => {
        const noReferee = match.match(/NoReferee="([^"]*)"/)?.[1] || match.match(/No="([^"]*)"/)?.[1] || '';
        const firstName = match.match(/FirstName="([^"]*)"/)?.[1] || '';
        const lastName = match.match(/LastName="([^"]*)"/)?.[1] || '';
        const federationCode = match.match(/FederationCode="([^"]*)"/)?.[1] || '';
        const gender = match.match(/Gender="([^"]*)"/)?.[1] || '';
        const level = match.match(/Level="([^"]*)"/)?.[1] || '';
        
        // Only add referee if they have at least a name
        if (firstName.trim() || lastName.trim()) {
          referees.push({
            noReferee,
            firstName,
            lastName,
            federationCode,
            gender,
            level
          });
        }
      });
    }
    
    return referees;
  };


  useEffect(() => {
    loadReferees();
  }, [tournamentNo]);


  return (
    <Container style={styles.container}>
      <NavigationHeader 
        title={`Referees - ${tournamentName || 'Tournament'}`}
        showBackButton={true}
        showLogo={false}
        showStatusBar={false}
        showRefreshButton={false}
        onBackPress={() => router.back()}
      />
      
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadReferees} />
        }
      >
        {referees.length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No referees found for this tournament</Text>
            </View>
          ) : (
            <View style={styles.refereeList}>
              {[1, 2, 3].map((num) => (
                <View key={num} style={styles.card}>
                  <RNText>Static Test Referee {num}</RNText>
                </View>
              ))}
              <RNText>Debug: Found {referees.length} referees</RNText>
            </View>
          )}
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  refereeList: {
    gap: 12,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flag: {
    marginRight: 8,
  },
  placeholderFlag: {
    width: 20,
    height: 15,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
  },
  refereeInfo: {
    flex: 1,
  },
  refereeName: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  refereeMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 12,
  },
  federationCode: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: '#F0F4F8',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  refereeLevel: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gender: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  expandIcon: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statsContainer: {
    gap: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  loadingText: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  errorText: {
    textAlign: 'center',
    color: colors.error || '#FF6B6B',
    fontStyle: 'italic',
  },
  // Tab system styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 16,
    padding: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: colors.primary || '#FF6B35',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  tabTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text || '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  // Achievements styles
  achievementsContainer: {
    marginTop: 8,
  },
  achievementsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text || '#1F2937',
    marginBottom: 8,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  achievementText: {
    fontSize: 12,
    color: colors.textSecondary || '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

// Wrapper component with AssignmentStatusProvider
export default function TournamentRefScreen() {
  return (
    <AssignmentStatusProvider>
      <TournamentRefScreenContent />
    </AssignmentStatusProvider>
  );
}