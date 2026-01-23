import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing } from '../../theme/theme';
import { useAuth } from '../../contexts/AuthContext';

export default function MessagesScreen() {
  const { user } = useAuth();
  const isPremium = user?.user_metadata?.role === 'premium' || user?.user_metadata?.role === 'coach';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="person-circle" size={40} color={colors.accent.sage} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Tu Coach de Sueño</Text>
          <Text style={styles.headerSubtitle}>Mensajería directa</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Ionicons name="construct" size={64} color={colors.accent.gold} />
        <Text style={styles.title}>Próximamente</Text>
        <Text style={styles.description}>
          La mensajería directa con tu coach estará disponible pronto.
        </Text>
        <Text style={styles.description}>
          Por ahora, puedes usar la bitácora diaria para compartir información con tu coach.
        </Text>

        {!isPremium && (
          <View style={styles.premiumNote}>
            <Ionicons name="star" size={20} color={colors.accent.gold} />
            <Text style={styles.premiumText}>
              Función exclusiva para usuarios premium
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.card,
  },
  headerIcon: {
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  premiumNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    marginTop: spacing.xl,
  },
  premiumText: {
    fontSize: fontSize.sm,
    color: colors.accent.gold,
  },
});
