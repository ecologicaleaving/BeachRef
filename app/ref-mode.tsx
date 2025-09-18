import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { NavigationHeader } from '../components/navigation/NavigationHeader';
import { BottomTabNavigation } from '../components/navigation/BottomTabNavigation';
import { AssignmentStatusProvider } from '../hooks/useAssignmentStatus';
import { createShadow } from '../theme/shadows';
// import { designTokens } from '../theme/tokens';

interface Official {
  FederationCode: string;
  FirstName: string;
  Gender: string;
  LastName: string;
  NoPortraitPhoto: string;
  NoOfficial: string;
  Role: string;
  Signatures: string;
  Status: string;
  Type: string;
}

interface Referee {
  Conclusion: string;
  FederationCode: string;
  FirstName: string;
  Gender: string;
  LastName: string;
  NoPortraitPhoto: string;
  NoReferee: string;
  Signatures: string;
  Status: string;
  StrongPoints: string;
  TheoryTest: string;
  Type: string;
  WeakPoints: string;
}

const RefModeScreen: React.FC = () => {
  const router = useRouter();
  const { eventNo, tournamentName } = useLocalSearchParams<{ 
    eventNo: string; 
    tournamentName: string; 
  }>();

  const [activeMenu, setActiveMenu] = useState<'nominations'>('nominations');
  const [loading, setLoading] = useState(false);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleGoBack = () => {
    router.back();
  };

  // Extract referees from match assignments as fallback
  const extractRefereesFromMatches = async (eventNo: string) => {
    try {
      
      // Get match data for the event
      const { VisApiClient } = await import('../services/api/VisApiClient');
      const visApi = new VisApiClient();
      
      const matchResponse = await visApi.getBeachMatchList({
        eventNo: eventNo,
        maxResults: 100
      });
      
      if (matchResponse.success && matchResponse.xmlData) {
        
        // Parse match XML to extract referee names
        const refereeNamesSet = new Set<string>();
        const xmlData = matchResponse.xmlData;
        
        // Extract referee names from match XML
        const refereePatterns = [
          /Referee1="([^"]+)"/g,
          /Referee2="([^"]+)"/g,
          /Referee="([^"]+)"/g
        ];
        
        refereePatterns.forEach(pattern => {
          let match;
          while ((match = pattern.exec(xmlData)) !== null) {
            const refereeName = match[1].trim();
            if (refereeName && refereeName !== '' && refereeName !== 'TBD') {
              refereeNamesSet.add(refereeName);
            }
          }
        });
        
        // Convert to referee objects
        const extractedReferees: Referee[] = Array.from(refereeNamesSet).map((name, index) => {
          const [firstName, ...lastNameParts] = name.split(' ');
          return {
            NoReferee: `EXTRACTED_${index + 1}`,
            FirstName: firstName || '',
            LastName: lastNameParts.join(' ') || '',
            FederationCode: '',
            Gender: '',
            NoPortraitPhoto: '',
            Signatures: '',
            Status: 'ACTIVE',
            Conclusion: '',
            StrongPoints: '',
            TheoryTest: '',
            Type: 'EXTRACTED',
            WeakPoints: ''
          };
        });
        
        if (extractedReferees.length > 0) {
          setReferees(extractedReferees);
        }
      }
    } catch (error) {
      console.error('❌ Failed to extract referees from matches:', error);
    }
  };

  const loadOfficialData = async () => {
    if (!eventNo) {
      setError('No event number provided');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const { VisApiClient } = await import('../services/api/VisApiClient');
      const { DEFAULT_RETRY_CONFIG } = await import('../types/api-v2');
      
      const config = {
        baseUrl: 'https://www.fivb.org/Vis2009/XmlRequest.asmx',
        timeoutMs: 30000,
        maxRetries: 3,
        retryDelayMs: 1000,
        enableLogging: true,
        headers: {}
      };
      
      const visApi = new VisApiClient(config, DEFAULT_RETRY_CONFIG);


      // Make specific GetEventRefereeList request using GET method like the manual
      
      // Request specific fields as provided
      const refereeRequest = `<Requests><Request Type='GetEventRefereeList' Fields='Conclusion FederationCode FirstName Gender LastName NoPortraitPhoto NoReferee Signatures Status StrongPoints TheoryTest Type WeakPoints'><Filter NoEvent='${eventNo}'/></Request></Requests>`;
      const refereeUrl = `https://www.fivb.org/vis2009/XmlRequest.asmx?Request=${encodeURIComponent(refereeRequest)}`;
      

      try {
        const refereeResponse = await fetch(refereeUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/xml, text/xml, */*',
            'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23'
          }
        });
        
        if (refereeResponse.ok) {
          const refereeData = await refereeResponse.text();
          
          // Parse referee numbers from the response
          const refereeNumbers = parseRefereeNumbers(refereeData);
          
          // Get detailed info for each referee
          if (refereeNumbers.length > 0) {
            const detailedReferees = await getDetailedReferees(refereeNumbers.slice(0, 3)); // Limit to first 3 for testing
            setReferees(detailedReferees);
          }
        } else {
          console.error('❌ GetEventRefereeList HTTP error:', refereeResponse.status, refereeResponse.statusText);
          // Try fallback: extract referees from match assignments
          await extractRefereesFromMatches(eventNo);
        }
      } catch (error) {
        console.error('❌ GetEventRefereeList failed:', error);
        // Try fallback: extract referees from match assignments
        await extractRefereesFromMatches(eventNo);
      }

      // Also try GetEventOfficialList with GET
      
      const officialRequest = `<Requests><Request Type='GetEventOfficialList' Fields='FederationCode FirstName Gender LastName NoPortraitPhoto NoOfficial Role Signatures Status Type'><Filter NoEvent='${eventNo}'/></Request></Requests>`;
      const officialUrl = `https://www.fivb.org/vis2009/XmlRequest.asmx?Request=${encodeURIComponent(officialRequest)}`;
      

      try {
        const officialResponse = await fetch(officialUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/xml, text/xml, */*',
            'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23'
          }
        });
        
        if (officialResponse.ok) {
          const officialData = await officialResponse.text();
          
          const officialsData = parseOfficials(officialData);
          setOfficials(officialsData);
        } else {
          console.error('❌ GetEventOfficialList HTTP error:', officialResponse.status, officialResponse.statusText);
        }
      } catch (error) {
        console.error('❌ GetEventOfficialList failed:', error);
      }

      // Fallback: Try GetEvent with officials and referees enabled
      const eventResponse = await visApi.getEvent({
        eventNo: eventNo,
        includeOfficials: true,
        includeReferees: true
      });

      if (eventResponse.success && eventResponse.xmlData) {
        
        // Parse officials from the response
        const officialsData = parseOfficials(eventResponse.xmlData);
        const refereesData = parseReferees(eventResponse.xmlData);
        
        
        setOfficials(officialsData);
        setReferees(refereesData);
      } else {
        setError('Failed to load official data');
        console.error('❌ Failed to get event data:', eventResponse.error);
      }
    } catch (error) {
      console.error('❌ Error loading official data:', error);
      setError('Error loading official data: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Function to parse referee numbers from GetEventRefereeList response
  const parseRefereeNumbers = (xmlData: string): string[] => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
      const refereeElements = xmlDoc.getElementsByTagName('EventReferee');
      
      const numbers = [];
      for (let i = 0; i < refereeElements.length; i++) {
        const no = refereeElements[i].getAttribute('No');
        if (no) {
          numbers.push(no);
        }
      }
      return numbers;
    } catch (error) {
      console.error('Error parsing referee numbers:', error);
      return [];
    }
  };

  // Function to get detailed referee information
  const getDetailedReferees = async (refereeNumbers: string[]): Promise<Referee[]> => {
    const detailedReferees: Referee[] = [];
    
    for (const refereeNo of refereeNumbers) {
      try {
        
        const refereeRequest = `<Requests><Request Type='GetReferee' No='${refereeNo}' VISId='VIS'/></Requests>`;
        const refereeUrl = `https://www.fivb.org/vis2009/XmlRequest.asmx?Request=${encodeURIComponent(refereeRequest)}`;
        
        
        const response = await fetch(refereeUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/xml, text/xml, */*',
            'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23'
          }
        });
        
        if (response.ok) {
          const refereeData = await response.text();
          
          // Parse individual referee data
          const parsedReferee = parseIndividualReferee(refereeData, refereeNo);
          if (parsedReferee) {
            detailedReferees.push(parsedReferee);
          }
        } else {
          console.error(`❌ GetReferee failed for ${refereeNo}:`, response.status, response.statusText);
        }
      } catch (error) {
        console.error(`❌ Error getting referee ${refereeNo}:`, error);
      }
    }
    
    return detailedReferees;
  };

  // Function to parse individual referee data
  const parseIndividualReferee = (xmlData: string, refereeNo: string): Referee | null => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
      const refereeElements = xmlDoc.getElementsByTagName('Referee');
      
      if (refereeElements.length > 0) {
        const referee = refereeElements[0];
        
        return {
          Conclusion: referee.getAttribute('Conclusion') || '',
          FederationCode: referee.getAttribute('FederationCode') || '',
          FirstName: referee.getAttribute('FirstName') || '',
          Gender: referee.getAttribute('Gender') || '',
          LastName: referee.getAttribute('LastName') || '',
          NoPortraitPhoto: referee.getAttribute('NoPortraitPhoto') || '',
          NoReferee: referee.getAttribute('NoReferee') || refereeNo,
          Signatures: referee.getAttribute('Signatures') || '',
          Status: referee.getAttribute('Status') || '',
          StrongPoints: referee.getAttribute('StrongPoints') || '',
          TheoryTest: referee.getAttribute('TheoryTest') || '',
          Type: referee.getAttribute('Type') || '',
          WeakPoints: referee.getAttribute('WeakPoints') || '',
        };
      }
      return null;
    } catch (error) {
      console.error('Error parsing individual referee:', error);
      return null;
    }
  };

  const parseOfficials = (xmlData: string): Official[] => {
    try {
      // Look for EventOfficialList in the XML response
      const officialListMatch = xmlData.match(/<EventOfficialList[^>]*>(.*?)<\/EventOfficialList>/s);
      if (!officialListMatch) {
        return [];
      }

      const officialListXml = officialListMatch[1];
      const officialMatches = officialListXml.match(/<EventOfficial[^>]*\/>/g) || [];
      
      return officialMatches.map(match => {
        const parseAttribute = (attr: string) => {
          const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
          const result = match.match(regex);
          return result ? result[1] : '';
        };

        return {
          FederationCode: parseAttribute('FederationCode'),
          FirstName: parseAttribute('FirstName'),
          Gender: parseAttribute('Gender'),
          LastName: parseAttribute('LastName'),
          NoPortraitPhoto: parseAttribute('NoPortraitPhoto'),
          NoOfficial: parseAttribute('NoOfficial'),
          Role: parseAttribute('Role'),
          Signatures: parseAttribute('Signatures'),
          Status: parseAttribute('Status'),
          Type: parseAttribute('Type'),
        };
      });
    } catch (error) {
      console.error('Error parsing officials:', error);
      return [];
    }
  };

  const parseReferees = (xmlData: string): Referee[] => {
    try {
      // Look for EventRefereeList in the XML response
      const refereeListMatch = xmlData.match(/<EventRefereeList[^>]*>(.*?)<\/EventRefereeList>/s);
      if (!refereeListMatch) {
        return [];
      }

      const refereeListXml = refereeListMatch[1];
      const refereeMatches = refereeListXml.match(/<EventReferee[^>]*\/>/g) || [];
      
      return refereeMatches.map(match => {
        const parseAttribute = (attr: string) => {
          const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
          const result = match.match(regex);
          return result ? result[1] : '';
        };

        return {
          Conclusion: parseAttribute('Conclusion'),
          FederationCode: parseAttribute('FederationCode'),
          FirstName: parseAttribute('FirstName'),
          Gender: parseAttribute('Gender'),
          LastName: parseAttribute('LastName'),
          NoPortraitPhoto: parseAttribute('NoPortraitPhoto'),
          NoReferee: parseAttribute('NoReferee'),
          Signatures: parseAttribute('Signatures'),
          Status: parseAttribute('Status'),
          StrongPoints: parseAttribute('StrongPoints'),
          TheoryTest: parseAttribute('TheoryTest'),
          Type: parseAttribute('Type'),
          WeakPoints: parseAttribute('WeakPoints'),
        };
      });
    } catch (error) {
      console.error('Error parsing referees:', error);
      return [];
    }
  };

  useEffect(() => {
    if (eventNo) {
      loadOfficialData();
    }
  }, [eventNo, loadOfficialData]);

  return (
    <AssignmentStatusProvider>
      <View style={styles.container}>
        {/* Navigation Header */}
        <NavigationHeader
          title="Ref Tools"
          subtitle={tournamentName || 'Tournament Officials'}
          showBackButton={true}
          onBackPress={handleGoBack}
          showStatusBar={false}
        />

        {/* Menu Navigation */}
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={[styles.menuItem, activeMenu === 'nominations' && styles.activeMenuItem]}
            onPress={() => setActiveMenu('nominations')}
          >
            <Text style={[styles.menuText, activeMenu === 'nominations' && styles.activeMenuText]}>
              Nominations
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B35" />
              <Text style={styles.loadingText}>Loading official data...</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={loadOfficialData}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!loading && !error && (
            <View style={styles.dataContainer}>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Officials ({officials.length})</Text>
                {officials.map((official, index) => (
                  <View key={index} style={styles.officialCard}>
                    <Text style={styles.officialName}>
                      {official.FirstName} {official.LastName}
                    </Text>
                    <Text style={styles.officialDetails}>
                      {official.FederationCode} • {official.Role} • {official.Type}
                    </Text>
                    <Text style={styles.officialStatus}>Status: {official.Status}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Referees ({referees.length})</Text>
                {referees.map((referee, index) => (
                  <View key={index} style={styles.officialCard}>
                    <Text style={styles.officialName}>
                      {referee.FirstName} {referee.LastName}
                    </Text>
                    <Text style={styles.officialDetails}>
                      {referee.FederationCode} • {referee.Type}
                    </Text>
                    <Text style={styles.officialStatus}>Status: {referee.Status}</Text>
                    {referee.StrongPoints && (
                      <Text style={styles.officialExtra}>Strengths: {referee.StrongPoints}</Text>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Bottom Tab Navigation */}
        <BottomTabNavigation 
          currentTab="monitor"
          onTabPress={(tab) => {
            if (tab === 'details') {
              router.back();
            }
          }}
        />
      </View>
    </AssignmentStatusProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  activeMenuItem: {
    backgroundColor: '#FF6B35',
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  activeMenuText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    margin: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dataContainer: {
    gap: 16,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    // Cross-platform shadow: boxShadow for web, elevation for native
    ...(typeof window !== 'undefined'
      ? { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' }
      : { elevation: 3 }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 12,
  },
  officialCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  officialName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 4,
  },
  officialDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  officialStatus: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  officialExtra: {
    fontSize: 12,
    color: '#7C3AED',
    marginTop: 4,
    fontStyle: 'italic',
  },
});

export default RefModeScreen;
