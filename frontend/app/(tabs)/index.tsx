import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing } from '../../theme/theme';
import CrisisModeScreen from '../../components/CrisisModeScreen';
import CommunityBar from '../../components/CommunityBar';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="heart" size={32} color={colors.accent.terracotta} />
            <Text style={styles.logoText}>MAMÁ RESPIRA</Text>
          </View>
          <Text style={styles.subtitle}>Estás haciendo un gran trabajo</Text>
        </View>

        {/* Community Bar */}
        <View style={styles.communityContainer}>
          <CommunityBar />
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <Text style={styles.promptText}>
            ¿Cómo te sientes ahora mismo?
          </Text>
          <Text style={styles.promptSubtext}>
            Si te sientes abrumada, toca el botón de abajo
          </Text>
        </View>

        {/* Quick Tips */}
        <View style={styles.tipsContainer}>
          <View style={styles.tipCard}>
            <Ionicons name="moon" size={24} color={colors.accent.sage} />
            <Text style={styles.tipText}>Las noches difíciles terminan</Text>
          </View>
          <View style={styles.tipCard}>
            <Ionicons name="water" size={24} color={colors.accent.gold} />
            <Text style={styles.tipText}>¿Ya bebiste agua hoy?</Text>
          </View>
        </View>
      </ScrollView>

      {/* Crisis Mode Button - Fixed at bottom (Thumb Zone) */}
      <View style={styles.panicContainer}>
        <CrisisModeScreen />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for tab bar
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  logoText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginLeft: 40,
  },
  communityContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  mainContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  promptText: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  promptSubtext: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  tipsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  tipCard: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  tipText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  panicContainer: {
    paddingBottom: spacing.md,
  },
});
