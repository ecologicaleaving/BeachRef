import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, Text, Pressable, Linking } from 'react-native';
import { colors, spacing } from '../theme/tokens';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    console.log('[Cookie Banner] Initializing...');
    console.log('[Cookie Banner] Platform:', Platform.OS);

    // Only show on web platform
    if (Platform.OS !== 'web') {
      console.log('[Cookie Banner] Not web platform, hiding');
      return;
    }

    // Expose helper to test banner visibility
    (window as any).showCookieBanner = () => {
      console.log('[Cookie Banner] Forcing banner to show...');
      localStorage.removeItem('cookieConsent');
      setIsVisible(true);
    };
    console.log('[Cookie Banner] Test helper available: window.showCookieBanner()');

    // Check if user has already made a choice
    const consent = localStorage.getItem('cookieConsent');
    console.log('[Cookie Banner] Saved consent:', consent);

    if (!consent) {
      console.log('[Cookie Banner] No consent found, showing banner');
      setIsVisible(true);
    } else {
      console.log('[Cookie Banner] Consent already saved:', consent);
      // Apply saved consent to GA
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('consent', 'update', {
          'analytics_storage': consent === 'granted' ? 'granted' : 'denied'
        });
        console.log('[Cookie Banner] Applied saved consent to GA');
      }
    }
  }, []);

  const handleAccept = () => {
    console.log('[Cookie Banner] User accepted cookies');
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', { 'analytics_storage': 'granted' });
      console.log('[Cookie Banner] Consent updated to: granted');
    }
    localStorage.setItem('cookieConsent', 'granted');
    console.log('[Cookie Banner] localStorage updated:', localStorage.getItem('cookieConsent'));
    setIsVisible(false);

    // Send a test event to verify GA is now working
    if (window.gtag) {
      window.gtag('event', 'cookie_consent_granted', {
        event_category: 'consent',
        event_label: 'user_accepted'
      });
      console.log('[Cookie Banner] Test event sent to GA');
    }
  };

  const handleDeny = () => {
    console.log('[Cookie Banner] User denied cookies');
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', { 'analytics_storage': 'denied' });
      console.log('[Cookie Banner] Consent updated to: denied');
    }
    localStorage.setItem('cookieConsent', 'denied');
    setIsVisible(false);
  };

  if (!isVisible || Platform.OS !== 'web') {
    console.log('[Cookie Banner] Not rendering:', { isVisible, platform: Platform.OS });
    return null;
  }

  console.log('[Cookie Banner] Rendering banner');

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.text}>
          🍪 This site uses Google Analytics to collect anonymous visit statistics.{' '}
          <Text
            style={styles.link}
            onPress={() => Linking.openURL('/privacy')}
          >
            Learn more
          </Text>
        </Text>
        <View style={styles.buttonContainer}>
          <Pressable
            style={[styles.button, styles.acceptButton]}
            onPress={handleAccept}
          >
            <Text style={styles.buttonText}>✓ Accept</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.denyButton]}
            onPress={handleDeny}
          >
            <Text style={styles.buttonText}>✗ Decline</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'fixed' as any,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    padding: spacing.lg,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: spacing.sm,
    elevation: 10,
    zIndex: 9999,
    borderTopWidth: 1,
    borderTopColor: colors.secondary,
  },
  content: {
    maxWidth: 1200,
    marginHorizontal: 'auto' as any,
    alignItems: 'center',
  },
  text: {
    color: colors.background,
    fontSize: 14,
    marginBottom: spacing.md,
    textAlign: 'center',
    lineHeight: 20,
  },
  link: {
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: colors.success,
  },
  denyButton: {
    backgroundColor: colors.textSecondary,
  },
  buttonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
});
