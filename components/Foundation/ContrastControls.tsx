/**
 * Contrast Control Components
 * User-controlled contrast adjustment options for extreme lighting conditions
 */

import React, { useContext } from 'react';
import { View, Switch, StyleSheet } from 'react-native';
import { ThemeContext } from '../../theme/ThemeContext';
import { Text, H2Text, CaptionText } from '../Typography';
import { Container, Button } from '../Foundation';
import { colors, spacing } from '../../theme/tokens';

/**
 * High Contrast Mode Toggle
 * Enables enhanced contrast for extreme outdoor conditions
 */
export function HighContrastToggle() {
  const themeContext = useContext(ThemeContext);
  
  if (!themeContext) {
    // console.warn('HighContrastToggle: ThemeContext not found. Make sure component is wrapped in ThemeProvider.');
    return null;
  }
  
  const { isHighContrastMode, setHighContrastMode } = themeContext;

  return (
    <Container paddingHorizontal="md" paddingVertical="sm">
      <View style={styles.toggleContainer}>
        <View style={styles.toggleText}>
          <Text variant="body" color="textPrimary">
            High Contrast Mode
          </Text>
          <CaptionText color="textSecondary">
            Enhanced visibility for bright sunlight
          </CaptionText>
        </View>
        <Switch
          value={isHighContrastMode}
          onValueChange={setHighContrastMode}
          trackColor={{
            false: colors.textSecondary + '30', // 30% opacity
            true: colors.success,
          }}
          thumbColor={isHighContrastMode ? colors.background : colors.textSecondary}
          ios_backgroundColor={colors.textSecondary + '30'}
        />
      </View>
    </Container>
  );
}

/**
 * Contrast Boost Control
 * Increases contrast ratios by 15% for better visibility
 */
export function ContrastBoostToggle() {
  const { contrastBoost, setContrastBoost } = useContext(ThemeContext);

  return (
    <Container paddingHorizontal="md" paddingVertical="sm">
      <View style={styles.toggleContainer}>
        <View style={styles.toggleText}>
          <Text variant="body" color="textPrimary">
            Contrast Boost
          </Text>
          <CaptionText color="textSecondary">
            +15% contrast enhancement
          </CaptionText>
        </View>
        <Switch
          value={contrastBoost}
          onValueChange={setContrastBoost}
          trackColor={{
            false: colors.textSecondary + '30',
            true: colors.accent,
          }}
          thumbColor={contrastBoost ? colors.background : colors.textSecondary}
          ios_backgroundColor={colors.textSecondary + '30'}
        />
      </View>
    </Container>
  );
}

/**
 * Bold Text Mode Toggle
 * Forces all text to semi-bold weight for better visibility
 */
export function BoldTextToggle() {
  const { boldTextMode, setBoldTextMode } = useContext(ThemeContext);

  return (
    <Container paddingHorizontal="md" paddingVertical="sm">
      <View style={styles.toggleContainer}>
        <View style={styles.toggleText}>
          <Text variant="body" color="textPrimary">
            Bold Text Mode
          </Text>
          <CaptionText color="textSecondary">
            Enhanced text weight for readability
          </CaptionText>
        </View>
        <Switch
          value={boldTextMode}
          onValueChange={setBoldTextMode}
          trackColor={{
            false: colors.textSecondary + '30',
            true: colors.warning,
          }}
          thumbColor={boldTextMode ? colors.background : colors.textSecondary}
          ios_backgroundColor={colors.textSecondary + '30'}
        />
      </View>
    </Container>
  );
}

/**
 * Enhanced Borders Toggle
 * Increases border widths for better element definition
 */
export function EnhancedBordersToggle() {
  const { enhancedBorders, setEnhancedBorders } = useContext(ThemeContext);

  return (
    <Container paddingHorizontal="md" paddingVertical="sm">
      <View style={styles.toggleContainer}>
        <View style={styles.toggleText}>
          <Text variant="body" color="textPrimary">
            Enhanced Borders
          </Text>
          <CaptionText color="textSecondary">
            Thicker borders for better visibility
          </CaptionText>
        </View>
        <Switch
          value={enhancedBorders}
          onValueChange={setEnhancedBorders}
          trackColor={{
            false: colors.textSecondary + '30',
            true: colors.primary,
          }}
          thumbColor={enhancedBorders ? colors.background : colors.textSecondary}
          ios_backgroundColor={colors.textSecondary + '30'}
        />
      </View>
    </Container>
  );
}

/**
 * Accessibility Settings Panel
 * Complete contrast and visibility controls
 */
export function AccessibilitySettings() {
  return (
    <Container backgroundColor="background" padding="md">
      <H2Text color="textPrimary" style={styles.sectionTitle}>
        Visibility Settings
      </H2Text>
      
      <CaptionText color="textSecondary" style={styles.sectionDescription}>
        Adjust these settings for optimal visibility in outdoor conditions
      </CaptionText>

      <View style={styles.settingsGroup}>
        <HighContrastToggle />
        <ContrastBoostToggle />
        <BoldTextToggle />
        <EnhancedBordersToggle />
      </View>

      <ContrastTestCard />
    </Container>
  );
}

/**
 * Contrast Test Card
 * Visual test card to validate contrast effectiveness
 */
export function ContrastTestCard() {
  return (
    <Container 
      backgroundColor="background" 
      padding="md" 
      style={styles.testCard}
    >
      <H2Text color="textPrimary">
        Visibility Test
      </H2Text>
      
      <Text variant="body" color="textPrimary" style={styles.testText}>
        If you can clearly read this text in direct sunlight, 
        your contrast settings are properly configured.
      </Text>

      <View style={styles.statusRow}>
        <Container backgroundColor="success" padding="xs" style={styles.statusBadge}>
          <CaptionText color="background">ACTIVE</CaptionText>
        </Container>
        
        <Container backgroundColor="warning" padding="xs" style={styles.statusBadge}>
          <CaptionText color="background">UPCOMING</CaptionText>
        </Container>
        
        <Container backgroundColor="error" padding="xs" style={styles.statusBadge}>
          <CaptionText color="background">CANCELLED</CaptionText>
        </Container>
      </View>

      <Button variant="primary" size="medium" style={styles.testButton}>
        Test Button Visibility
      </Button>
    </Container>
  );
}

/**
 * Quick Contrast Preset Buttons
 * One-tap presets for common conditions
 */
export function ContrastPresets() {
  const { applyContrastPreset } = useContext(ThemeContext);

  return (
    <Container backgroundColor="background" padding="md">
      <H2Text color="textPrimary" style={styles.sectionTitle}>
        Quick Presets
      </H2Text>

      <View style={styles.presetsRow}>
        <Button
          variant="primary"
          size="medium"
          style={styles.presetButton}
          onPress={() => applyContrastPreset('normal')}
        >
          Normal
        </Button>

        <Button
          variant="accent"
          size="medium"
          style={styles.presetButton}
          onPress={() => applyContrastPreset('outdoor')}
        >
          Outdoor
        </Button>

        <Button
          variant="warning"
          size="medium"
          style={styles.presetButton}
          onPress={() => applyContrastPreset('extreme')}
        >
          Extreme
        </Button>
      </View>

      <CaptionText color="textSecondary" style={styles.presetsDescription}>
        Normal: Standard visibility • Outdoor: Enhanced contrast • Extreme: Maximum visibility
      </CaptionText>
    </Container>
  );
}

const styles = StyleSheet.create({
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  toggleText: {
    flex: 1,
    marginRight: spacing.md,
  },
  sectionTitle: {
    marginBottom: spacing.xs,
  },
  sectionDescription: {
    marginBottom: spacing.lg,
  },
  settingsGroup: {
    marginBottom: spacing.lg,
  },
  testCard: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  testText: {
    marginVertical: spacing.md,
    lineHeight: 24,
  },
  statusRow: {
    flexDirection: 'row',
    marginVertical: spacing.md,
    gap: spacing.sm,
  },
  statusBadge: {
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  testButton: {
    marginTop: spacing.sm,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  presetButton: {
    flex: 1,
  },
  presetsDescription: {
    textAlign: 'center',
    lineHeight: 20,
  },
});