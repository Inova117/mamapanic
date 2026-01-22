import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../theme/theme';
import SleepCoachBitacora from '../../components/SleepCoachBitacora';
import { getBitacoras, getTodayBitacora } from '../../services/api';
import { DailyBitacora } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function BitacoraScreen() {
  const [showInput, setShowInput] = useState(false);
  const [todayBitacora, setTodayBitacora] = useState<DailyBitacora | null>(null);
  const [recentBitacoras, setRecentBitacoras] = useState<DailyBitacora[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [today, recent] = await Promise.all([
        getTodayBitacora(),
        getBitacoras(7),
      ]);
      setTodayBitacora(today);
      setRecentBitacoras(recent);
    } catch (error) {
      console.error('Error fetching bitacoras:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleBitacoraComplete = (bitacora: DailyBitacora) => {
    setTodayBitacora(bitacora);
    fetchData();
  };

  const handleClose = () => {
    setShowInput(false);
    fetchData();
  };

  if (showInput) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.inputHeader}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={handleClose}
          >
            <Ionicons name="close" size={28} color={colors.text.secondary} />
          </TouchableOpacity>
          <Text style={styles.inputTitle}>Bitácora del Día</Text>
          <View style={{ width: 40 }} />
        </View>
        <SleepCoachBitacora 
          onComplete={handleBitacoraComplete}
          onClose={handleClose}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Bitácora de Sueño</Text>
          <Text style={styles.subtitle}>Registro diario para tu coach</Text>
        </View>

        {/* Today's Status */}
        <View style={styles.todayCard}>
          {todayBitacora ? (
            <>
              <View style={styles.todayHeader}>
                <Ionicons name="checkmark-circle" size={24} color={colors.accent.sage} />
                <Text style={styles.todayTitle}>Día #{todayBitacora.day_number} registrado</Text>
              </View>
              <View style={styles.todaySummary}>
                {todayBitacora.morning_wake_time && (
                  <View style={styles.summaryItem}>
                    <Ionicons name="sunny-outline" size={18} color={colors.accent.gold} />
                    <Text style={styles.summaryText}>Despertó: {todayBitacora.morning_wake_time}</Text>
                  </View>
                )}
                {todayBitacora.number_of_wakings !== undefined && (
                  <View style={styles.summaryItem}>
                    <Ionicons name="moon-outline" size={18} color={colors.accent.terracotta} />
                    <Text style={styles.summaryText}>{todayBitacora.number_of_wakings} despertares</Text>
                  </View>
                )}
                {todayBitacora.baby_mood && (
                  <View style={styles.summaryItem}>
                    <Ionicons name="happy-outline" size={18} color={colors.accent.sage} />
                    <Text style={styles.summaryText}>Humor: {todayBitacora.baby_mood}</Text>
                  </View>
                )}
              </View>
              {todayBitacora.ai_summary && (
                <View style={styles.aiSummaryCard}>
                  <Text style={styles.aiSummaryLabel}>Resumen para la coach:</Text>
                  <Text style={styles.aiSummaryText}>{todayBitacora.ai_summary}</Text>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.todayHeader}>
                <Ionicons name="add-circle" size={24} color={colors.accent.gold} />
                <Text style={styles.todayTitle}>Registra el día de hoy</Text>
              </View>
              <Text style={styles.todaySubtext}>
                Tu coach necesita estos datos para ayudarte mejor
              </Text>
            </>
          )}
        </View>

        {/* What to register */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>¿Qué registrarás?</Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Ionicons name="sunny" size={20} color={colors.accent.gold} />
              <Text style={styles.infoText}>Hora de despertar</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="bed" size={20} color={colors.accent.sage} />
              <Text style={styles.infoText}>3 Siestas del día</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="nutrition" size={20} color={colors.accent.gold} />
              <Text style={styles.infoText}>Alimentación</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="moon" size={20} color={colors.accent.terracotta} />
              <Text style={styles.infoText}>Rutina nocturna</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="notifications" size={20} color={colors.accent.terracotta} />
              <Text style={styles.infoText}>Despertares nocturnos</Text>
            </View>
          </View>
        </View>

        {/* Recent Bitácoras */}
        {recentBitacoras.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Historial reciente</Text>
            {recentBitacoras.map((bitacora) => (
              <View key={bitacora.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyDay}>Día #{bitacora.day_number}</Text>
                  <Text style={styles.historyDate}>
                    {format(new Date(bitacora.date), "d 'de' MMMM", { locale: es })}
                  </Text>
                </View>
                <View style={styles.historyStats}>
                  {bitacora.number_of_wakings !== undefined && (
                    <View style={styles.statBadge}>
                      <Ionicons name="moon" size={14} color={colors.accent.terracotta} />
                      <Text style={styles.statText}>{bitacora.number_of_wakings} despertares</Text>
                    </View>
                  )}
                  {bitacora.baby_mood && (
                    <View style={styles.statBadge}>
                      <Ionicons name="happy" size={14} color={colors.accent.sage} />
                      <Text style={styles.statText}>{bitacora.baby_mood}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* New Bitácora Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => setShowInput(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={colors.text.primary} />
          <Text style={styles.fabText}>
            {todayBitacora ? 'Nueva bitácora' : 'Registrar hoy'}
          </Text>
        </TouchableOpacity>
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
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  todayCard: {
    backgroundColor: colors.background.card,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  todayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  todayTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  todaySubtext: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  todaySummary: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  aiSummaryCard: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent.sage,
  },
  aiSummaryLabel: {
    fontSize: fontSize.xs,
    color: colors.accent.sage,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  aiSummaryText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: colors.background.card,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  infoTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  infoList: {
    gap: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  historySection: {
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  historyCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  historyDay: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  historyDate: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
    textTransform: 'capitalize',
  },
  historyStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background.elevated,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
  },
  statText: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },
  fabContainer: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.sage,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    shadowColor: colors.accent.sage,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  fabText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
