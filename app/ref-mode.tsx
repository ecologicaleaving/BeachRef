import React, { useState, useEffect, useCallback } from 'react';
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
import { designTokens } from '../theme/tokens';
import {
  RefereeDirectoryService,
  type DirectoryReferee
} from '../services/RefereeDirectoryService';

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

/** Adapt a service referee to the shape this screen renders. */
const toScreenReferee = (referee: DirectoryReferee): Referee => ({
  Conclusion: '',
  FederationCode: referee.federationCode,
  FirstName: referee.firstName,
  Gender: referee.gender,
  LastName: referee.lastName,
  NoPortraitPhoto: '',
  NoReferee: referee.RefereeId,
  Signatures: '',
  Status: referee.status ?? '',
  StrongPoints: '',
  TheoryTest: '',
  Type: referee.type ?? '',
  WeakPoints: ''
});

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

  /**
   * Referees deduced from the match assignments — the fallback used when the
   * event has no referee roster of its own.
   */
  const extractRefereesFromMatches = async (event: string): Promise<Referee[]> => {
    const { matches } = await RefereeDirectoryService.getEventMatches(event);

    const refereeNames = new Set<string>();
    for (const match of matches) {
      for (const key of ['Referee1Name', 'Referee2Name', 'Referee1', 'Referee2', 'Referee']) {
        const name = (match[key] ?? '').trim();
        if (name && name !== 'TBD') {
          refereeNames.add(name);
        }
      }
    }

    return Array.from(refereeNames).map((name, index) => {
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
  };

  const loadOfficialData = useCallback(async () => {
    if (!eventNo) {
      setError('No event number provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Referee roster of the event. RefereeDirectoryService owns the
      // <Requests> envelope this screen used to spell out by hand — the
      // workaround now lives in VisApiClient (issue #40).
      const { referees: eventReferees, error: refereesError } =
        await RefereeDirectoryService.getEventReferees(eventNo);

      let resolvedReferees: Referee[] = eventReferees.map(toScreenReferee);

      // Same fallback as before: no roster ⇒ deduce the names from the matches.
      if (refereesError || resolvedReferees.length === 0) {
        resolvedReferees = await extractRefereesFromMatches(eventNo);
      }

      setReferees(resolvedReferees);

      const { officials: eventOfficials } =
        await RefereeDirectoryService.getEventOfficials(eventNo);

      // GetEventOfficialList exposes only `No` and `Version` for these two
      // entities (investigated at length in issue #40), so nameless rows are
      // dropped rather than rendered as blank cards — which is what this screen
      // showed before, its parser requiring a wrapper the response never has.
      setOfficials(eventOfficials.filter(o => o.FirstName.trim() || o.LastName.trim()));

      // ⚠️ PRE-EXISTING DEFECT, PRESERVED ON PURPOSE (issue #46 is a refactoring).
      // This final GetEvent unconditionally *overwrites* both lists with what it
      // can parse out of the event payload — and it can parse nothing, because
      // GetEvent does not answer with <EventOfficialList> / <EventRefereeList>.
      // The net effect is that everything resolved above is discarded and the
      // screen renders "Officials (0) / Referees (0)". That is why ref-mode is
      // "under construction" in CLAUDE.md. Removing these four lines makes the
      // screen work; doing so is a functional change and needs its own issue.
      const roster = await RefereeDirectoryService.getEventRosterFromEvent(eventNo);

      if (roster.error) {
        setError('Failed to load official data');
      } else {
        setOfficials(roster.officials);
        setReferees(roster.referees.map(toScreenReferee));
      }
    } catch (error) {
      console.error('❌ Error loading official data:', error);
      setError('Error loading official data: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [eventNo]);

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
    color: designTokens.neutrals.textSecondary,
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
    color: designTokens.neutrals.textSecondary,
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
    color: designTokens.neutrals.textSecondary,
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
