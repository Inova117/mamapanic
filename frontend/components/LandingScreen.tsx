// ─────────────────────────────────────────────────────────────────────────────
// Public landing / welcome screen shown at the site root (web) and before login
// (native). Logged-in users are redirected into the app by app/index.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, fontSize, spacing, borderRadius } from '../theme/theme';

const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || '';
const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL || '';

type Feature = { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; color: string };

const FEATURES: Feature[] = [
  {
    icon: 'pulse',
    title: 'Calma en 30 segundos',
    text: 'Un botón de pánico con respiración guiada para esos momentos en que todo se siente demasiado.',
    color: colors.accent.terracotta,
  },
  {
    icon: 'journal',
    title: 'Bitácora de sueño',
    text: 'Registra las siestas y noches de tu bebé y compártelas con tu coach de sueño.',
    color: colors.accent.sage,
  },
  {
    icon: 'chatbubble-ellipses',
    title: 'Abuela Sabia',
    text: 'Una compañera que te escucha sin juzgar, a cualquier hora de la madrugada.',
    color: colors.accent.gold,
  },
  {
    icon: 'heart',
    title: 'Tu coach contigo',
    text: 'Acompañamiento cercano y personalizado para las noches difíciles del posparto.',
    color: colors.accent.terracottaLight,
  },
];

export default function LandingScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.inner}>
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.logoBadge}>
              <Ionicons name="heart" size={40} color={colors.accent.terracotta} />
            </View>
            <Text style={styles.brand}>Nido</Text>
            <Text style={styles.tagline}>Tu santuario de calma en el posparto</Text>
            <Text style={styles.subtitle}>
              De pánico a calma en menos de 30 segundos. Respira, registra el sueño de
              tu bebé y habla con alguien que te entiende — a la hora que sea.
            </Text>

            <View style={styles.ctaRow}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push('/auth/register')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Crear cuenta gratis"
              >
                <Text style={styles.primaryBtnText}>Crear cuenta gratis</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.text.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => router.push('/auth/login')}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Iniciar sesión"
              >
                <Text style={styles.secondaryBtnText}>Ya tengo cuenta</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.reassureRow}>
              <Ionicons name="moon" size={16} color={colors.accent.gold} />
              <Text style={styles.reassureText}>
                Miles de mamás despiertas, acompañándose entre sí.
              </Text>
            </View>
          </View>

          {/* Features */}
          <View style={[styles.features, isWide && styles.featuresWide]}>
            {FEATURES.map((f) => (
              <View key={f.title} style={[styles.card, isWide && styles.cardWide]}>
                <View style={[styles.cardIcon, { backgroundColor: f.color + '22' }]}>
                  <Ionicons name={f.icon} size={26} color={f.color} />
                </View>
                <Text style={styles.cardTitle}>{f.title}</Text>
                <Text style={styles.cardText}>{f.text}</Text>
              </View>
            ))}
          </View>

          {/* Closing CTA */}
          <View style={styles.closing}>
            <Text style={styles.closingTitle}>No tienes que hacerlo sola.</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/auth/register')}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Empezar gratis"
            >
              <Text style={styles.primaryBtnText}>Empezar ahora</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            {!!PRIVACY_URL && (
              <TouchableOpacity onPress={() => Linking.openURL(PRIVACY_URL)}>
                <Text style={styles.footerLink}>Privacidad</Text>
              </TouchableOpacity>
            )}
            {!!TERMS_URL && (
              <TouchableOpacity onPress={() => Linking.openURL(TERMS_URL)}>
                <Text style={styles.footerLink}>Términos</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.footerText}>© Nido</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  scroll: { flexGrow: 1, alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  inner: { width: '100%', maxWidth: 960 },

  hero: { alignItems: 'center', paddingVertical: spacing.xl },
  logoBadge: {
    width: 84,
    height: 84,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  brand: { fontSize: fontSize.hero, fontWeight: '800', color: colors.text.primary, textAlign: 'center' },
  tagline: { fontSize: fontSize.lg, color: colors.accent.gold, textAlign: 'center', marginTop: spacing.sm, fontWeight: '600' },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: spacing.md,
    maxWidth: 560,
  },
  ctaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md, marginTop: spacing.xl },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.terracotta,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    shadowColor: colors.accent.terracotta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: { fontSize: fontSize.md, fontWeight: '700', color: colors.text.primary },
  secondaryBtn: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.background.elevated,
  },
  secondaryBtnText: { fontSize: fontSize.md, fontWeight: '600', color: colors.text.primary },
  reassureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg },
  reassureText: { fontSize: fontSize.sm, color: colors.text.muted },

  features: { marginTop: spacing.xl, gap: spacing.md },
  featuresWide: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  card: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  cardWide: { width: 300, margin: spacing.sm },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.xs },
  cardText: { fontSize: fontSize.sm, color: colors.text.secondary, lineHeight: 21 },

  closing: { alignItems: 'center', marginTop: spacing.xxl, marginBottom: spacing.xl },
  closingTitle: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text.primary, textAlign: 'center', marginBottom: spacing.lg },

  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.background.card },
  footerLink: { fontSize: fontSize.sm, color: colors.text.secondary, textDecorationLine: 'underline' },
  footerText: { fontSize: fontSize.sm, color: colors.text.muted },
});
