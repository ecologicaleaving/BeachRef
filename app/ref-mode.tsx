import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import NavigationHeader from '../components/navigation/NavigationHeader';
import BottomTabNavigation from '../components/navigation/BottomTabNavigation';
import { AssignmentStatusProvider } from '../hooks/useAssignmentStatus';
import { designTokens } from '../theme/tokens';

const RefModeScreen: React.FC = () => {
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
  };

  return (
    <AssignmentStatusProvider>
      <View style={styles.container}>
        {/* Navigation Header */}
        <NavigationHeader
          title="Referee Mode"
          subtitle="Match Assignment & Management"
          showBackButton={true}
          onBackPress={handleGoBack}
          showStatusBar={false}
        />

        {/* Under Construction Content */}
        <View style={styles.content}>
          <View style={styles.constructionContainer}>
            <Text style={styles.constructionIcon}>🚧</Text>
            <Text style={styles.constructionTitle}>Under Construction</Text>
            <Text style={styles.constructionMessage}>
              Referee mode is coming soon!{'\n'}
              This will include match assignments, referee tools, and tournament management features.
            </Text>
            
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleGoBack}
            >
              <Text style={styles.backButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Tab Navigation */}
        <BottomTabNavigation 
          currentTab="monitor"
          onTabPress={(tab) => {
            if (tab === 'details') {
              router.back();
            }
            // Stay on current tab for 'monitor'
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  constructionContainer: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    maxWidth: 320,
  },
  constructionIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  constructionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 16,
    textAlign: 'center',
  },
  constructionMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: '#1B365D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: '#1B365D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RefModeScreen;