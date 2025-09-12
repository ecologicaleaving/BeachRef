import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface MonitorOptionsProps {
  onCourtMonitor: () => void;
  onRefereeMonitor: () => void;
}

export const MonitorOptions: React.FC<MonitorOptionsProps> = ({
  onCourtMonitor,
  onRefereeMonitor,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Monitor Type</Text>
      <Text style={styles.subtitle}>Select what you want to monitor during the tournament</Text>

      <View style={styles.optionsContainer}>
        <TouchableOpacity 
          style={styles.optionCard}
          onPress={onCourtMonitor}
          activeOpacity={0.8}
        >
          <View style={styles.optionIconContainer}>
            <Text style={styles.optionIcon}>🏟️</Text>
          </View>
          <Text style={styles.optionTitle}>Court Monitor</Text>
          <Text style={styles.optionDescription}>
            Track matches and activity on specific courts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.optionCard}
          onPress={onRefereeMonitor}
          activeOpacity={0.8}
        >
          <View style={styles.optionIconContainer}>
            <Text style={styles.optionIcon}>👨‍⚖️</Text>
          </View>
          <Text style={styles.optionTitle}>Referee Monitor</Text>
          <Text style={styles.optionDescription}>
            Follow a specific referee&apos;s matches and schedule
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: 20,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#1B365D',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionIcon: {
    fontSize: 36,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});