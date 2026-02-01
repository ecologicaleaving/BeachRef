import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Text } from '../components/Typography/Text';
import { Container } from '../components/Foundation/Container';
import { NavigationHeader } from '../components/navigation/NavigationHeader';
import { colors, designTokens } from '../theme/tokens';
import { AssignmentStatusProvider } from '../hooks/useAssignmentStatus';
import { RefereeStatsService, SeasonStats, CareerStats } from '../services/RefereeStatsService';
import { FlagImage } from '../components/FlagImage';

interface Referee {
  RefereeId: string; // 6-digit NoReferee from VIS API
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
  onToggle
}: {
  referee: Referee;
  tournamentNo: string;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const [activeTab, setActiveTab] = useState<StatsTab>('Current');
  const [currentStats, setCurrentStats] = useState<SeasonStats | null>(null);
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null);
  const [careerStats, setCareerStats] = useState<CareerStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Load current stats immediately on mount for R1/R2 totals display
  useEffect(() => {
    if (referee?.RefereeId && !currentStats) {
      loadCurrentStats();
    }
  }, [referee?.RefereeId]);

  // Load stats when card is expanded or tab changes
  useEffect(() => {
    if (expanded && referee?.RefereeId) {
      loadRefereeStats();
    }
  }, [expanded, referee?.RefereeId, activeTab]);

  const loadCurrentStats = async () => {
    if (!referee?.RefereeId || !tournamentNo) return;
    
    try {
      const current = await RefereeStatsService.getCurrentTournamentStats(referee.RefereeId, tournamentNo);
      setCurrentStats(current);
    } catch (error) {
      console.error('Error loading current stats for collapsed card:', error);
    }
  };

  const loadRefereeStats = async () => {
    if (!referee?.RefereeId || !tournamentNo) {
      return;
    }
    
    setStatsLoading(true);
    
    try {
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 30000)
      );

      switch (activeTab) {
        case 'Current':
          const currentPromise = RefereeStatsService.getCurrentTournamentStats(referee.RefereeId, tournamentNo);
          const current = await Promise.race([currentPromise, timeout]);
          setCurrentStats(current);
          break;
        case 'Season':
          // Use current calendar year for season stats, not tournament year
          const currentYear = new Date().getFullYear();
          const seasonYear = currentYear.toString();
          const seasonPromise = RefereeStatsService.getSeasonStats(referee.RefereeId, seasonYear);
          const season = await Promise.race([seasonPromise, timeout]);
          setSeasonStats(season);
          break;
        case 'Career':
          const careerPromise = RefereeStatsService.getCareerStats(referee.RefereeId);
          const career = await Promise.race([careerPromise, timeout]);
          setCareerStats(career);
          break;
      }
    } catch (error) {
      console.error(`Error loading ${activeTab} stats for referee ${referee.RefereeId}:`, error);
      // Set empty stats on error to prevent indefinite loading
      switch (activeTab) {
        case 'Season':
          setSeasonStats(null);
          break;
        case 'Career':
          setCareerStats(null);
          break;
      }
    } finally {
      setStatsLoading(false);
    }
  };

  const renderStatsContent = () => {
    if (statsLoading) {
      return (
        <View style={styles.statsLoading}>
          <Text style={styles.loadingText}>Loading stats...</Text>
        </View>
      );
    }

    const stats = activeTab === 'Current' ? currentStats : 
                 activeTab === 'Season' ? seasonStats : careerStats;

    if (!stats) {
      return (
        <View style={styles.statsEmpty}>
          <Text style={styles.emptyText}>No {activeTab.toLowerCase()} data available</Text>
        </View>
      );
    }

    return (
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.totalMatches}</Text>
          <Text style={styles.statLabel}>TOT</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.matchesAsFirst}</Text>
          <Text style={styles.statLabel}>R1</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.matchesAsSecond}</Text>
          <Text style={styles.statLabel}>R2</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.menMatches}</Text>
          <Text style={styles.statLabel}>M</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.womenMatches}</Text>
          <Text style={styles.statLabel}>W</Text>
        </View>
      </View>
    );
  };


  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={onToggle} activeOpacity={0.7}>
        {referee?.federationCode && (
          <View style={styles.flagSection}>
            <FlagImage federationCode={referee.federationCode} size="medium" style={styles.flagLeft} />
            <Text style={styles.countryCode}>{referee.federationCode}</Text>
          </View>
        )}
        <View style={styles.refereeMainInfo}>
          <Text style={styles.refereeName}>
            {referee?.firstName || 'Unknown'}
          </Text>
          <Text style={styles.refereeLastName}>
            {referee?.lastName || 'Referee'}
          </Text>
        </View>
        <View style={styles.cardHeaderRight}>
          {/* Always show basic R1/R2 totals */}
          <View style={styles.roleTotals}>
            <View style={styles.roleTotal}>
              <Text style={styles.roleTotalCount}>{currentStats?.matchesAsFirst || 0}</Text>
              <Text style={styles.roleTotalLabel}>R1</Text>
            </View>
            <Text style={styles.roleTotalSeparator}>•</Text>
            <View style={styles.roleTotal}>
              <Text style={styles.roleTotalCount}>{currentStats?.matchesAsSecond || 0}</Text>
              <Text style={styles.roleTotalLabel}>R2</Text>
            </View>
          </View>
          <Text style={styles.expandIcon}>
            {expanded ? '▼' : '▶'}
          </Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.statsPanel}>
          <View style={styles.tabBar}>
            {(['Current', 'Season', 'Career'] as StatsTab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {renderStatsContent()}
        </View>
      )}

      {/* Profile button at bottom */}
      <View style={styles.profileButtonContainer}>
        <TouchableOpacity
          style={styles.profileButtonBottom}
          activeOpacity={0.8}
          onPress={() => {
            try {
              const payload: any = {
                id: (referee?.RefereeId || '').toString(),
                firstName: referee?.firstName || '',
                lastName: referee?.lastName || '',
                federationCode: referee?.federationCode || '',
                gender: referee?.gender || '',
                status: 'Active',
                role: 'Referee',
                type: 'International'
              };
              router.push({ pathname: '/referee-profile', params: { refereeData: JSON.stringify(payload) } });
            } catch (e) {
              console.error('Failed to navigate to referee profile', e);
            }
          }}
        >
          <Text style={styles.profileButtonText}>View Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
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
      
      // Roster-first approach for all statuses
      const rosterOk = await loadRefereesFromAPI();
      if (!rosterOk) {
        await loadRefereesFromMatchList();
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
          const normalized = parsedReferees.map(r => ({
            ...r,
            RefereeId: /^\d{6}$/.test(r.RefereeId || '') ? (r.RefereeId as string) : ''
          })).filter(r => r.firstName?.trim() || r.lastName?.trim());
          setReferees(normalized);
          return normalized.length > 0;
        }
      }
      return false;
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
            match[attr?.name] = attr.value;
          }
          
          matches.push(match);
        });
      }
      
    } catch (error) {
      // Silent fail
    }
    
    return matches;
  };



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


  const loadRefereesFromPassedMatchData = async (): Promise<void> => {
    try {
      if (!matchData) {
        return;
      }
      
      const matches = JSON.parse(matchData);
      
      // Extract referee information using multiple field name variations
      const refereeMap = new Map<string, {name: string, RefereeId?: string, federationCode?: string, gender?: string, function?: string}>();
      
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
                  RefereeId: refereeNo, 
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
                    RefereeId: refereeNo, 
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
      
      // First, create a mapping from referee names to NoReferee IDs from the original match data
      const nameToNoRefereeMap = new Map<string, string>();
      
      matches.forEach((match) => {
        
        // Check direct match fields for referee names and NoReferee IDs
        const referee1Name = match.Referee1Name || match.referee1Name || '';
        const referee2Name = match.Referee2Name || match.referee2Name || '';
        const noReferee1 = match.NoReferee1 || match.noReferee1 || '';
        const noReferee2 = match.NoReferee2 || match.noReferee2 || '';
        
        if (referee1Name && noReferee1 && /^\d{6}$/.test(noReferee1)) {
          const cleanName = referee1Name.trim().toLowerCase();
          nameToNoRefereeMap.set(cleanName, noReferee1);
        }
        if (referee2Name && noReferee2 && /^\d{6}$/.test(noReferee2)) {
          const cleanName = referee2Name.trim().toLowerCase();
          nameToNoRefereeMap.set(cleanName, noReferee2);
        }
      });
      
      
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
          
          // Try to find NoReferee ID from our mapping
          let foundNoReferee = '';
          const searchName = referee.name.trim().toLowerCase();
          
          // First try exact match
          if (nameToNoRefereeMap.has(searchName)) {
            foundNoReferee = nameToNoRefereeMap.get(searchName)!;
          } else {
            // Try partial matches (in case names don't match exactly)
            for (const [mapName, noRefereeId] of nameToNoRefereeMap.entries()) {
              if (mapName.includes(firstName.toLowerCase()) && mapName.includes(lastName.toLowerCase())) {
                foundNoReferee = noRefereeId;
                break;
              }
            }
          }
          
          // Use complete data if available, or create referee with found NoReferee ID
          const validId = /^\d{6}$/.test(foundNoReferee) ? foundNoReferee : '';
          const refereeData: Referee = completeData || {
            RefereeId: validId, // Only set when a valid 6-digit NoReferee is found
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
      
      // Skip CacheService for referee data - it doesn't include NoReferee1/NoReferee2 fields
      // We need to use direct API call to get referee NoReferee IDs
      
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
      
      // Collect all unique NoReferee IDs from match data
      const noRefereeIds = new Set<string>();
      
      matches.forEach((match) => {
        
        // Collect NoReferee IDs
        const noReferee1 = match.NoReferee1 || match.noReferee1 || '';
        const noReferee2 = match.NoReferee2 || match.noReferee2 || '';
        
        if (noReferee1 && /^\d{6}$/.test(noReferee1)) {
          noRefereeIds.add(noReferee1);
        }
        if (noReferee2 && /^\d{6}$/.test(noReferee2)) {
          noRefereeIds.add(noReferee2);
        }
      });
      
      
      // Create a reverse mapping: NoReferee ID → Referee name using GetEventRefereeList
      const idToRefereeMap = new Map<string, {firstName: string, lastName: string, federationCode: string, gender: string}>();
      
      if (true) {
        try {
          // Get all referees for this event to build ID-to-name mapping
          const refereeListXml = `<Requests>
  <Request Type="GetEventRefereeList"
           Fields="NoReferee FirstName LastName FederationCode Gender Status Role">
    <Filter NoEvent="${tournamentNo}"/>
  </Request>
</Requests>`;

          const refereeResponse = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
            method: "POST",
            headers: {
              "Accept": "application/xml",
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({ Request: refereeListXml })
          });
          
          if (refereeResponse.ok) {
            const refereeXml = await refereeResponse.text();
            
            // Parse referee list to build ID mapping
            const refereeMatches = refereeXml.match(/<EventReferee[^>]*>/g);
            if (refereeMatches) {
              refereeMatches.forEach(match => {
                const noReferee = match.match(/NoReferee="([^"]*)"/)?.[1] || '';
                const firstName = match.match(/FirstName="([^"]*)"/)?.[1] || '';
                const lastName = match.match(/LastName="([^"]*)"/)?.[1] || '';
                const federationCode = match.match(/FederationCode="([^"]*)"/)?.[1] || '';
                const gender = match.match(/Gender="([^"]*)"/)?.[1] || '';
                
                if (noReferee && /^\d{6}$/.test(noReferee)) {
                  idToRefereeMap.set(noReferee, { firstName, lastName, federationCode, gender });
                  const key1 = `${firstName} ${lastName}`.trim().toLowerCase();
                  const key2 = `${lastName} ${firstName}`.trim().toLowerCase();
                  if (key1) nameToIdFromAPI.set(key1, noReferee);
                  if (key2) nameToIdFromAPI.set(key2, noReferee);
                }
              });
            }
          }
        } catch (error) {
          // Silent error handling for referee details fetch
        }
      }
      

      // Create referees directly from the ID-to-referee mapping
      const extractedReferees: Referee[] = [];
      
      // Convert the NoReferee IDs to Referee objects
      for (const [noRefereeId, refereeData] of idToRefereeMap.entries()) {
        const refereeObj: Referee = {
          RefereeId: noRefereeId, // Use the actual NoReferee ID
          firstName: refereeData.firstName,
          lastName: refereeData.lastName,
          federationCode: refereeData.federationCode,
          gender: refereeData.gender
        };
        
        extractedReferees.push(refereeObj);
      }
      
      // If we didn't get referee data from the API, fall back to creating referees from sorted names
      if (extractedReferees.length === 0) {
        // No referee mapping found, falling back to sorted names
        
        // Try to get complete referee data from API to enhance with gender information
        let apiReferees: Referee[] = [];
        try {
          apiReferees = await fetchAllRefereesFromAPI();
        } catch (error) {
          apiReferees = [];
        }
        
        // Convert to Referee objects and enhance with API data if available
        sortedRefereeNames.forEach(name => {
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
          const refereeObj = completeData || {
            RefereeId: resolvedId, // Use event roster resolution if available
            firstName,
            lastName,
            federationCode: '',
            gender: ''
          };
          
          extractedReferees.push(refereeObj);
        });
      }
      
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
            RefereeId: noReferee,
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
            RefereeId: noReferee,
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
              {referees.map((referee, index) => (
                <RefereeCard
                  key={referee.RefereeId || index}
                  referee={referee}
                  tournamentNo={tournamentNo || ''}
                  expanded={expandedRefereeId === referee.RefereeId}
                  onToggle={() => setExpandedRefereeId(
                    expandedRefereeId === referee.RefereeId ? null : referee.RefereeId
                  )}
                  tournamentInfo={tournament}
                />
              ))}
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
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  refereeMainInfo: {
    flex: 1,
  },
  refereeId: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  flagRow: {
    marginTop: 4,
  },
  federationCode: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    backgroundColor: colors.primary + '10',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  expandIcon: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  profileButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  profileButtonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  statsPanel: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  tabBar: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  compactStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  compactStat: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: colors.text,
  },
  activeTabText: {
    color: colors.background,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statsLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  statsEmpty: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
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
  refereeLastName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginTop: 2,
  },
  refereeMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 12,
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
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
    color: designTokens.neutrals.textSecondary,
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
    color: colors.textSecondary || designTokens.neutrals.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  debugText: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 4,
  },
  // Flag and role totals styles
  flagSection: {
    alignItems: 'center',
    marginRight: 12,
  },
  flagLeft: {
    width: 32,
    height: 24,
    borderRadius: 4,
    marginBottom: 4,
  },
  countryCode: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  roleTotals: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleTotal: {
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  roleTotalCount: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.neutrals.textPrimary,
    lineHeight: 14,
  },
  roleTotalLabel: {
    fontSize: 8,
    color: designTokens.neutrals.textSecondary,
    fontWeight: '500',
    lineHeight: 10,
  },
  roleTotalSeparator: {
    fontSize: 10,
    color: '#D1D5DB',
    paddingHorizontal: 2,
  },
  profileButtonContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  profileButtonBottom: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
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






