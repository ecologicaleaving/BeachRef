import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
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
  const [stats, setStats] = useState<RefereeStats | null>(null);
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null);
  const [careerStats, setCareerStats] = useState<CareerStats | null>(null);
  const [activeTab, setActiveTab] = useState<StatsTab>('Current');
  const [loadingStats, setLoadingStats] = useState(false);

  // Helper function to display "N/D" for undefined values
  const displayValue = (value: number | undefined): string => {
    if (value === undefined || value === 0) return 'N/D';
    return value.toString();
  };

  // Don't render if no name data
  if (!referee.firstName.trim() && !referee.lastName.trim()) {
    return null;
  }


  const loadRefereeStats = async (tournamentNo: string) => {
    if (stats || loadingStats) return; // Don't reload if already loaded or loading
    
    setLoadingStats(true);
    try {
      // Determine tournament status and use appropriate data source
      let tournamentStatus = 'SCHEDULED'; // fallback
      
      if (tournamentInfo) {
        tournamentStatus = DefaultTournamentService.getTournamentStatus(tournamentInfo.startDate, tournamentInfo.endDate);
      }

      // For LIVE and SCHEDULED tournaments, try VIS API first, fallback to match list
      // For COMPLETED tournaments, use match list approach only
      if (tournamentStatus === 'COMPLETED') {
        await loadStatsFromMatchList(tournamentNo);
      } else {
        // Try VIS API first for LIVE/future tournaments
        const refereeId = `${referee.firstName} ${referee.lastName}`.trim();
        try {
          // Try to get stats from RefereeStatsService (VIS API)
          const currentStats = await RefereeStatsService.getCurrentTournamentStats(refereeId, tournamentNo);
          if (currentStats && currentStats.totalMatches > 0) {
            const mappedStats: RefereeStats = {
              totalMatches: currentStats.totalMatches,
              matchesAsFirst: currentStats.matchesAsFirst,
              matchesAsSecond: currentStats.matchesAsSecond,
              menMatches: currentStats.menMatches || 0,
              womenMatches: currentStats.womenMatches || 0,
            };
            setStats(mappedStats);
            return;
          } else {
            await loadStatsFromMatchList(tournamentNo);
          }
        } catch (error) {
          await loadStatsFromMatchList(tournamentNo);
        }
      }
    } catch (error) {
      console.error('Error loading referee stats:', error);
      // Final fallback - show N/D
      const emptyStats: RefereeStats = {
        totalMatches: 0,
        matchesAsFirst: 0,
        matchesAsSecond: 0,
        menMatches: 0,
        womenMatches: 0,
      };
      setStats(emptyStats);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadStatsFromMatchList = async (tournamentNo: string) => {
    try {
      // Get matches for this tournament to calculate real stats (original approach)
      const xml = `<Requests>
  <Request Type="GetBeachMatchList"
           Fields="No NoTournament TournamentGender Referee1Name Referee2Name TeamAFederationCode TeamBFederationCode RoundName">
    <Filter NoEvent="${tournamentNo}" IncludeReferees="true"/>
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
        const realStats = calculateRefereeStats(xmlResponse, referee);
        setStats(realStats);
      } else {
        // Fallback to N/D if API fails
        const emptyStats: RefereeStats = {
          totalMatches: 0,
          matchesAsFirst: 0,
          matchesAsSecond: 0,
          menMatches: 0,
          womenMatches: 0,
        };
        setStats(emptyStats);
      }
    } catch (error) {
      console.error('Error in match list approach:', error);
      // Fallback to N/D on error
      const emptyStats: RefereeStats = {
        totalMatches: 0,
        matchesAsFirst: 0,
        matchesAsSecond: 0,
        menMatches: 0,
        womenMatches: 0,
      };
      setStats(emptyStats);
    }
  };

  const calculateRefereeStats = (xmlString: string, referee: Referee): RefereeStats => {
    // Look for individual BeachMatch elements, not the container
    const matchMatches = xmlString.match(/<BeachMatch\s[^>]*\/>/g);
    let totalMatches = 0;
    let matchesAsFirst = 0;
    let matchesAsSecond = 0;
    let menMatches = 0;
    let womenMatches = 0;

    // const refereeName = `${referee.firstName} ${referee.lastName}`.trim();

    if (matchMatches && matchMatches.length > 0) {
      matchMatches.forEach((match) => {
        const referee1Name = match.match(/Referee1Name="([^"]*)"/)?.[1] || '';
        const referee2Name = match.match(/Referee2Name="([^"]*)"/)?.[1] || '';
        // const teamAFed = match.match(/TeamAFederationCode="([^"]*)"/)?.[1] || '';
        // const teamBFed = match.match(/TeamBFederationCode="([^"]*)"/)?.[1] || '';
        const roundName = match.match(/RoundName="([^"]*)"/)?.[1] || '';

        // Match referee names (case-insensitive partial match)
        const isFirstRef = referee1Name.toLowerCase().includes(referee.firstName.toLowerCase()) && 
                          referee1Name.toLowerCase().includes(referee.lastName.toLowerCase());
        const isSecondRef = referee2Name.toLowerCase().includes(referee.firstName.toLowerCase()) && 
                           referee2Name.toLowerCase().includes(referee.lastName.toLowerCase());

        if (isFirstRef || isSecondRef) {
          totalMatches++;
          
          if (isFirstRef) matchesAsFirst++;
          if (isSecondRef) matchesAsSecond++;

          // Try to determine gender from multiple sources
          // const roundNameLower = roundName.toLowerCase();
          
          // Extract TournamentGender field which contains "M" or "W"
          const tournamentGender = match.match(/TournamentGender="([^"]*)"/)?.[1] || '';
          // const matchNo = match.match(/No="([^"]*)"/)?.[1] || '';
          
          // Use TournamentGender to determine match gender
          let isWomensMatch = false;
          
          if (tournamentGender === '1') {
            isWomensMatch = true;
          }
          
          if (isWomensMatch) {
            womenMatches++;
          } else {
            menMatches++;
          }
        }
      });
    }

    
    return {
      totalMatches,
      matchesAsFirst,
      matchesAsSecond,
      menMatches,
      womenMatches,
    };
  };

  const loadSeasonStats = async (refereeId: string, season?: string, tournamentNo?: string): Promise<SeasonStats | null> => {
    try {
      // Determine tournament status to decide data approach
      let tournamentStatus = 'SCHEDULED'; // fallback
      
      if (tournamentInfo) {
        tournamentStatus = DefaultTournamentService.getTournamentStatus(tournamentInfo.startDate, tournamentInfo.endDate);
      }

      // For LIVE and SCHEDULED tournaments, use VIS API; for COMPLETED, use existing approach
      if (tournamentStatus === 'COMPLETED') {
      } else {
      }
      
      const seasonStats = await RefereeStatsService.getSeasonStats(refereeId, season, tournamentNo);
      return seasonStats;
    } catch (error) {
      console.error('Error loading season stats:', error);
      return null;
    }
  };

  const loadCareerStats = async (refereeId: string, tournamentNo?: string): Promise<CareerStats | null> => {
    try {
      // Determine tournament status to decide data approach
      let tournamentStatus = 'SCHEDULED'; // fallback
      
      if (tournamentInfo) {
        tournamentStatus = DefaultTournamentService.getTournamentStatus(tournamentInfo.startDate, tournamentInfo.endDate);
      }

      // For LIVE and SCHEDULED tournaments, use VIS API; for COMPLETED, use existing approach
      if (tournamentStatus === 'COMPLETED') {
      } else {
      }
      
      const careerStats = await RefereeStatsService.getCareerStats(refereeId, tournamentNo);
      return careerStats;
    } catch (error) {
      console.error('Error loading career stats:', error);
      return null;
    }
  };

  const handleCardPress = () => {
    onToggle();
    if (!expanded && !stats) {
      loadRefereeStats(tournamentNo);
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handleCardPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.topRow}>
          <View style={styles.nameSection}>
            {referee.federationCode ? (
              <FlagImage
                federationCode={referee.federationCode}
                teamName={referee.federationCode}
                size="small"
                style={styles.flag}
              />
            ) : (
              <View style={[styles.flag, styles.placeholderFlag]} />
            )}
            <View style={styles.refereeInfo}>
              <Text style={styles.refereeName} numberOfLines={2}>
                {referee.firstName} {referee.lastName}
              </Text>
              <View style={styles.refereeMetadata}>
                {referee.federationCode && (
                  <Text style={styles.federationCode}>
                    {referee.federationCode}
                  </Text>
                )}
                {referee.level && (
                  <Text style={styles.refereeLevel}>
                    Level {referee.level}
                  </Text>
                )}
                {referee.gender && (
                  <Text style={styles.gender}>
                    {referee.gender === '0' || referee.gender.toLowerCase() === 'm' ? '♂' : 
                     referee.gender === '1' || referee.gender.toLowerCase() === 'f' ? '♀' : '?'}
                  </Text>
                )}
              </View>
            </View>
          </View>
          <Text style={styles.expandIcon}>
            {expanded ? '▼' : '▶'}
          </Text>
        </View>
      </View>
      
      {expanded && (
        <View style={styles.expandedContent}>
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            {(['Current', 'Season', 'Career'] as StatsTab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
                onPress={async () => {
                  setActiveTab(tab);
                  // Load additional stats when switching to Season/Career tabs
                  if (tab === 'Season' && !seasonStats) {
                    const refereeId = `${referee.firstName} ${referee.lastName}`.trim();
                    const seasonData = await loadSeasonStats(refereeId, undefined, tournamentNo);
                    if (seasonData) {
                      setSeasonStats(seasonData);
                    }
                  }
                  if (tab === 'Career' && !careerStats) {
                    const refereeId = `${referee.firstName} ${referee.lastName}`.trim();
                    const careerData = await loadCareerStats(refereeId, tournamentNo);
                    if (careerData) {
                      setCareerStats(careerData);
                    }
                  }
                }}
              >
                <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          {loadingStats ? (
            <Text style={styles.loadingText}>Loading stats...</Text>
          ) : (
            <View style={styles.statsContainer}>
              {activeTab === 'Current' && stats && (
                <View>
                  <Text style={styles.tabTitle}>Tournament Stats</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(stats.totalMatches)}</Text>
                      <Text style={styles.statLabel}>Total Matches</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(stats.matchesAsFirst)}</Text>
                      <Text style={styles.statLabel}>As 1st Referee</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(stats.matchesAsSecond)}</Text>
                      <Text style={styles.statLabel}>As 2nd Referee</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(stats.menMatches)}</Text>
                      <Text style={styles.statLabel}>Men&apos;s Matches</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(stats.womenMatches)}</Text>
                      <Text style={styles.statLabel}>Women&apos;s Matches</Text>
                    </View>
                  </View>
                </View>
              )}

              {activeTab === 'Season' && seasonStats && (
                <View>
                  <Text style={styles.tabTitle}>Season {seasonStats.season} Stats</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(seasonStats.totalMatches)}</Text>
                      <Text style={styles.statLabel}>Total Matches</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(seasonStats.tournaments)}</Text>
                      <Text style={styles.statLabel}>Tournaments</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{seasonStats.averageRating ? seasonStats.averageRating.toFixed(1) : 'N/D'}</Text>
                      <Text style={styles.statLabel}>Avg Rating</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(seasonStats.matchesAsFirst)}</Text>
                      <Text style={styles.statLabel}>As 1st Referee</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(seasonStats.matchesAsSecond)}</Text>
                      <Text style={styles.statLabel}>As 2nd Referee</Text>
                    </View>
                  </View>
                </View>
              )}

              {activeTab === 'Career' && careerStats && (
                <View>
                  <Text style={styles.tabTitle}>Career Stats ({displayValue(careerStats.yearsActive)} years)</Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(careerStats.totalMatches)}</Text>
                      <Text style={styles.statLabel}>Total Matches</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(careerStats.totalTournaments)}</Text>
                      <Text style={styles.statLabel}>Tournaments</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{careerStats.averageRating ? careerStats.averageRating.toFixed(1) : 'N/D'}</Text>
                      <Text style={styles.statLabel}>Avg Rating</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(careerStats.matchesAsFirst)}</Text>
                      <Text style={styles.statLabel}>As 1st Referee</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{displayValue(careerStats.matchesAsSecond)}</Text>
                      <Text style={styles.statLabel}>As 2nd Referee</Text>
                    </View>
                  </View>
                  <>
                    <View style={styles.divider} />
                    <View style={styles.achievementsContainer}>
                      <Text style={styles.achievementsTitle}>Achievements</Text>
                      {careerStats.achievements && careerStats.achievements.length > 0 ? (
                        careerStats.achievements.map((achievement, index) => (
                          <View key={index} style={styles.achievementItem}>
                            <Icon name="star" size={14} color="#FFD700" />
                            <Text style={styles.achievementText}>{achievement}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.achievementText}>N/D</Text>
                      )}
                    </View>
                  </>
                </View>
              )}

              {!stats && !loadingStats && (
                <Text style={styles.errorText}>Failed to load stats</Text>
              )}
            </View>
          )}
        </View>
      )}
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
              {referees.map((referee, index) => (
                  <RefereeCard 
                    key={referee.noReferee || index} 
                    referee={referee} 
                    tournamentNo={tournamentNo || ''} 
                    expanded={expandedRefereeId === referee.noReferee}
                    tournamentInfo={tournament}
                    onToggle={() => {
                      setExpandedRefereeId(
                        expandedRefereeId === referee.noReferee ? null : referee.noReferee
                      );
                    }}
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