import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface DateNavigatorProps {
  availableDates: string[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  formatDate?: (date: string) => string;
  getMatchCount?: (date: string) => number;
}

export const DateNavigator: React.FC<DateNavigatorProps> = ({
  availableDates,
  selectedDate,
  onDateChange,
  formatDate = (date) => date,
  getMatchCount
}) => {
  // Safety check for availableDates
  if (!availableDates || !Array.isArray(availableDates)) {
    return null;
  }

  const currentIndex = availableDates.indexOf(selectedDate);
  
  if (availableDates.length <= 1) return null; // Don't show navigator for single date

  // Check if we're at the boundaries
  const isAtFirst = currentIndex <= 0;
  const isAtLast = currentIndex >= availableDates.length - 1;
  
  // Disable next button if we're at the latest day (no future navigation)
  const isNextDisabled = isAtLast;

  const navigateToDate = (direction: 'prev' | 'next') => {
    if (currentIndex === -1) {
      // No date selected, select the last day (most recent in the tournament)
      if (availableDates.length > 0) {
        const defaultDate = availableDates[availableDates.length - 1];
        onDateChange(defaultDate);
      }
      return;
    }

    let newIndex;
    if (direction === 'prev') {
      // Prev = go to older dates (lower index, earlier in time)
      newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex; // Stop at first (oldest)
    } else {
      // Next = go to newer dates (higher index, later in time)
      newIndex = currentIndex < availableDates.length - 1 ? currentIndex + 1 : currentIndex; // Stop at last (newest)
    }

    // Only change if we actually moved
    if (newIndex !== currentIndex) {
      onDateChange(availableDates[newIndex]);
    }
  };

  const currentDate = selectedDate || (availableDates.length > 0 ? availableDates[0] : '');
  const matchCount = getMatchCount ? getMatchCount(currentDate) : 0;
  const displayDate = formatDate(currentDate);
  
  // Safe date comparison for "today" check
  let isToday = false;
  try {
    if (currentDate) {
      const matchDate = new Date(currentDate);
      const today = new Date();
      if (!isNaN(matchDate.getTime()) && !isNaN(today.getTime())) {
        isToday = matchDate.toDateString() === today.toDateString();
      }
    }
  } catch (error) {
    isToday = false;
  }
  
  const dateInfo = isToday ? '📅 Today' : displayDate;

  return (
    <View style={styles.dateNavigator}>
      <TouchableOpacity 
        style={[
          styles.dateNavButton,
          isAtFirst && styles.dateNavButtonDisabled
        ]}
        onPress={() => !isAtFirst && navigateToDate('prev')}
        disabled={isAtFirst}
      >
        <Text style={[
          styles.dateNavButtonText,
          isAtFirst && styles.dateNavButtonTextDisabled
        ]}>◀</Text>
      </TouchableOpacity>
      
      <View style={styles.dateDisplayContainer}>
        <Text style={styles.dateDisplayText}>{dateInfo}</Text>
        {getMatchCount && matchCount > 0 && (
          <Text style={styles.datePositionText}>
            {matchCount} matches
          </Text>
        )}
      </View>
      
      <TouchableOpacity 
        style={[
          styles.dateNavButton,
          isNextDisabled && styles.dateNavButtonDisabled
        ]}
        onPress={() => !isNextDisabled && navigateToDate('next')}
        disabled={isNextDisabled}
      >
        <Text style={[
          styles.dateNavButtonText,
          isNextDisabled && styles.dateNavButtonTextDisabled
        ]}>▶</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  dateNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateNavButtonDisabled: {
    opacity: 0.4,
    backgroundColor: '#F9FAFB',
  },
  dateNavButtonText: {
    fontSize: 18,
    color: '#4A90A4',
    fontWeight: 'bold',
  },
  dateNavButtonTextDisabled: {
    color: '#9CA3AF',
  },
  dateDisplayContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  dateDisplayText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 2,
  },
  datePositionText: {
    fontSize: 14,
    color: '#4A90A4',
    fontWeight: '500',
  },
});

export default DateNavigator;