import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Radio, Award, Calendar } from 'lucide-react';
import { WhistleLogo } from '../components/WhistleLogo';

const { width } = Dimensions.get('window');

export default function Index() {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Animate splash screen entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handleStartPress = () => {
    // Animate out and navigate to tournament selection
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      router.push('/tournament-selection');
    });
  };

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#1B365D" />
        
        {/* Beach Background Effect */}
        <View style={styles.backgroundPattern}>
          <View style={[styles.sand, styles.sand1]} />
          <View style={[styles.sand, styles.sand2]} />
          <View style={[styles.sand, styles.sand3]} />
        </View>

        <Animated.View 
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Top Section */}
          <View style={styles.topSection}>
            {/* Whistle Logo */}
            <WhistleLogo width={180} height={120} style={styles.logo} />
            
            {/* App Name - Moved higher */}
            <Text style={styles.appName}>BeachRef</Text>
            <Text style={styles.appTagline}>Referee Assignment and Match Result Monitor</Text>

            {/* Feature Icons */}
            <View style={styles.featuresContainer}>
              <View style={styles.featureItem}>
                <Radio 
                  size={48} 
                  color="#B8D4E3" 
                  strokeWidth={2}
                />
                <Text style={styles.featureText}>Live Score</Text>
              </View>
              <View style={styles.featureItem}>
                <Award 
                  size={48} 
                  color="#B8D4E3" 
                  strokeWidth={2}
                />
                <Text style={styles.featureText}>Results</Text>
              </View>
              <View style={styles.featureItem}>
                <Calendar 
                  size={48} 
                  color="#B8D4E3" 
                  strokeWidth={2}
                />
                <Text style={styles.featureText}>Assignments</Text>
              </View>
            </View>
          </View>

          {/* Start Button */}
          <TouchableOpacity 
            style={styles.startButton}
            onPress={handleStartPress}
            activeOpacity={0.8}
          >
            <Text style={styles.startButtonText}>Start</Text>
            <Text style={styles.startButtonArrow}>→</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Professional Badge - Fixed at bottom */}
        <View style={styles.bottomBadge}>
          <Text style={styles.professionalText}>Powered by FIVB VIS System</Text>
        </View>
      </View>
    );
  }

  // If splash is hidden, just show a simple fallback (shouldn't normally reach here)
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1B365D' }}>
      <Text style={{ color: '#FFFFFF', fontSize: 18 }}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#1B365D', // Professional navy blue
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  sand: {
    position: 'absolute',
    borderRadius: 50,
    backgroundColor: '#FFE4B3',
  },
  sand1: {
    width: 200,
    height: 200,
    top: '20%',
    left: '-10%',
    transform: [{ rotate: '45deg' }],
  },
  sand2: {
    width: 150,
    height: 150,
    top: '60%',
    right: '-5%',
    transform: [{ rotate: '-30deg' }],
  },
  sand3: {
    width: 100,
    height: 100,
    top: '80%',
    left: '20%',
    transform: [{ rotate: '60deg' }],
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: -40, // Ridotto per centrare meglio
    justifyContent: 'center',
    flex: 0.8,
  },
  appName: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 2,
  },
  appTagline: {
    fontSize: 16,
    color: '#B8D4E3',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  topSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    marginBottom: 12,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  featureItem: {
    alignItems: 'center',
    opacity: 0.9,
    minHeight: 80,
    justifyContent: 'center',
  },
  featureIcon: {
    marginBottom: 8,
  },
  featureText: {
    color: '#B8D4E3',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  startButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#FF6B35',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 160,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  startButtonArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomBadge: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  professionalText: {
    color: '#B8D4E3',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
  },
});