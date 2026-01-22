import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../theme/theme';
import BitacoraInput from '../../components/BitacoraInput';
import { getCheckIns, getTodayCheckIn } from '../../services/api';
import { DailyCheckIn } from '../../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function BitacoraScreen() {
  const [showInput, setShowInput] = useState(false);
  const [todayCheckIn, setTodayCheckIn] = useState<DailyCheckIn | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<DailyCheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [today, recent] = await Promise.all([
        getTodayCheckIn(),
        getCheckIns(7),
      ]);
      setTodayCheckIn(today);
      setRecentCheckIns(recent);
    } catch (error) {
      console.error('Error fetching check-ins:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCheckInComplete = (checkIn: DailyCheckIn) => {
    setTodayCheckIn(checkIn);
    setShowInput(false);
    fetchData();
  };

  const getMoodEmoji = (mood: number) => {
    switch (mood) {
      case 1: return '😢';
      case 2: return '😐';
      case 3: return '🙂';
      default: return '😐';
    }
  };

  const getMoodColor = (mood: number) => {
    switch (mood) {
      case 1: return colors.mood.sad;
      case 2: return colors.mood.neutral;
      case 3: return colors.mood.happy;
      default: return colors.mood.neutral;
    }
  };

  if (showInput) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.inputHeader}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => setShowInput(false)}
          >
            <Ionicons name="close" size={28} color={colors.text.secondary} />
          </TouchableOpacity>
          <Text style={styles.inputTitle}>Check-in Diario</Text>
        </View>
        <BitacoraInput onComplete={handleCheckInComplete} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tu Bitácora</Text>
          <Text style={styles.subtitle}>Un espacio para desahogarte</Text>
        </View>

        {/* Today's Status */}
        <View style={styles.todayCard}>
          {todayCheckIn ? (
            <>
              <View style={styles.todayHeader}>
                <Ionicons name="checkmark-circle" size={24} color={colors.accent.sage} />
                <Text style={styles.todayTitle}>Hoy ya registraste</Text>
              </View>
              <View style={styles.todayContent}>
                <Text style={styles.todayMood}>{getMoodEmoji(todayCheckIn.mood)}</Text>
                {todayCheckIn.ai_response && (
                  <Text style={styles.todayResponse}>{todayCheckIn.ai_response}</Text>
                )}
              </View>
            </>
          ) : (
            <>
              <View style={styles.todayHeader}>
                <Ionicons name="add-circle" size={24} color={colors.accent.gold} />
                <Text style={styles.todayTitle}>¿Cómo fue tu noche?</Text>
              </View>
              <Text style={styles.todaySubtext}>
                Toca abajo para registrar cómo te sientes
              </Text>
            </>
          )}
        </View>

        {/* Recent Check-ins */}
        {recentCheckIns.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.sectionTitle}>Historial reciente</Text>
            {recentCheckIns.map((checkIn) => (
              <View key={checkIn.id} style={styles.historyCard}>
                <View 
                  style={[
                    styles.moodIndicator, 
                    { backgroundColor: getMoodColor(checkIn.mood) }
                  ]} 
                />
                <View style={styles.historyContent}>
                  <Text style={styles.historyDate}>
                    {format(new Date(checkIn.created_at), "EEEE d 'de' MMMM", { locale: es })}
                  </Text>
                  <Text style={styles.historyMood}>{getMoodEmoji(checkIn.mood)}</Text>
                  {checkIn.brain_dump && (
                    <Text style={styles.historyNote} numberOfLines={2}>
                      {checkIn.brain_dump}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* New Check-in Button */}
      <View style={styles.fabContainer}>
        <TouchableOpacity 
          style={styles.fab}
          onPress={() => setShowInput(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={colors.text.primary} />
          <Text style={styles.fabText}>
            {todayCheckIn ? 'Nuevo registro' : 'Registrar hoy'}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
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
  todayContent: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  todayMood: {
    fontSize: 48,
  },
  todayResponse: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 22,
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
    flexDirection: 'row',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  moodIndicator: {
    width: 4,
  },
  historyContent: {
    flex: 1,
    padding: spacing.md,
  },
  historyDate: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: 'capitalize',
  },
  historyMood: {
    fontSize: fontSize.xl,
    marginBottom: spacing.xs,
  },
  historyNote: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
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
