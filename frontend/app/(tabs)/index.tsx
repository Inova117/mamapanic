import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../theme/theme';
import CrisisModeScreen from '../../components/CrisisModeScreen';
import CommunityBar from '../../components/CommunityBar';
import { BitacoraInput } from '../../components/BitacoraInput';

export default function HomeScreen() {
  const [showCheckIn, setShowCheckIn] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="heart" size={32} color={colors.accent.terracotta} />
          <Text style={styles.logoText}>Entresueños</Text>
        </View>
        <Text style={styles.subtitle}>Estás haciendo un gran trabajo</Text>
      </View>

      {/* Community Bar */}
      <View style={styles.communityContainer}>
        <CommunityBar />
      </View>

      {/* Main Content — fills remaining space */}
      <View style={styles.mainContent}>
        <Text style={styles.promptText}>
          ¿Cómo te sientes ahora mismo?
        </Text>
        <Text style={styles.promptSubtext}>
          Si te sientes abrumada, toca el botón de abajo
        </Text>

        {/* Daily mood check-in */}
        <TouchableOpacity
          style={styles.checkInCard}
          onPress={() => setShowCheckIn(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Registrar cómo me siento hoy"
        >
          <Ionicons name="sunny" size={22} color={colors.accent.gold} />
          <Text style={styles.checkInText}>¿Cómo amaneciste hoy?</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
        </TouchableOpacity>
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

      {/* Crisis Mode Button — the tab bar reserves its own space now */}
      <View style={styles.panicContainer}>
        <CrisisModeScreen />
      </View>

      {/* Daily check-in modal */}
      <Modal
        visible={showCheckIn}
        animationType="slide"
        onRequestClose={() => setShowCheckIn(false)}
      >
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowCheckIn(false)}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={28} color={colors.text.secondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Check-in de hoy</Text>
            <View style={{ width: 28 }} />
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <BitacoraInput onComplete={() => { /* keep modal open so she sees the response; she closes with X */ }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
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
    flex: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
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
  checkInCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    alignSelf: 'stretch',
  },
  checkInText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  tipsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
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
    paddingHorizontal: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.card,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
