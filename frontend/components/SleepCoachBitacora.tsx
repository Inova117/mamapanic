import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius, touchTarget } from '../theme/theme';
import { createBitacora } from '../services/api';
import { 
  NapEntry, 
  NightWaking, 
  DailyBitacoraCreate,
  DailyBitacora,
  HOW_FELL_ASLEEP_OPTIONS,
  HOW_BABY_ATE_OPTIONS,
  BABY_MOOD_OPTIONS
} from '../types';
import { format } from 'date-fns';

interface SleepCoachBitacoraProps {
  onComplete?: (bitacora: DailyBitacora) => void;
  onClose?: () => void;
}

type Section = 'sleep' | 'naps' | 'night' | 'complete';

// Time picker options (12-hour format with AM/PM)
const HOURS_12 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
const MINUTES = ['00', '10', '20', '30', '40', '50'];
const PERIODS = ['AM', 'PM'];

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  label: string;
  icon: string;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, label, icon }) => {
  // Convert 24h to 12h format for display
  const convert24to12 = (time24?: string) => {
    if (!time24) return { hour: '8', minute: '00', period: 'PM' };
    const [h, m] = time24.split(':');
    const hour24 = parseInt(h);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    return { hour: hour12.toString(), minute: m, period };
  };

  // Convert 12h to 24h format for storage
  const convert12to24 = (hour12: string, minute: string, period: string) => {
    let hour24 = parseInt(hour12);
    if (period === 'AM' && hour24 === 12) hour24 = 0;
    if (period === 'PM' && hour24 !== 12) hour24 += 12;
    return `${hour24.toString().padStart(2, '0')}:${minute}`;
  };

  const initial = convert24to12(value);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [period, setPeriod] = useState(initial.period);

  // Sync internal state when value prop changes
  useEffect(() => {
    const updated = convert24to12(value);
    setHour(updated.hour);
    setMinute(updated.minute);
    setPeriod(updated.period);
  }, [value]);

  const handleHourChange = (h: string) => {
    setHour(h);
    onChange(convert12to24(h, minute, period));
  };

  const handleMinuteChange = (m: string) => {
    setMinute(m);
    onChange(convert12to24(hour, m, period));
  };

  const handlePeriodChange = (p: string) => {
    setPeriod(p);
    onChange(convert12to24(hour, minute, p));
  };

  return (
    <View style={styles.timePickerContainer}>
      <Text style={styles.inputLabel}>
        <Ionicons name={icon as any} size={18} color={colors.accent.gold} /> {label}
      </Text>
      <View style={styles.timePickerInline}>
        <View style={styles.timeInputGroup}>
          <Text style={styles.timeInputLabel}>Hora</Text>
          <View style={styles.timeButtonsRow}>
            {HOURS_12.map((h) => (
              <TouchableOpacity
                key={h}
                style={[styles.timeQuickButton, hour === h && styles.timeQuickButtonSelected]}
                onPress={() => handleHourChange(h)}
              >
                <Text style={[styles.timeQuickText, hour === h && styles.timeQuickTextSelected]}>
                  {h}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.timeInputGroup}>
          <Text style={styles.timeInputLabel}>Minutos</Text>
          <View style={styles.timeButtonsRow}>
            {MINUTES.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.timeQuickButton, minute === m && styles.timeQuickButtonSelected]}
                onPress={() => handleMinuteChange(m)}
              >
                <Text style={[styles.timeQuickText, minute === m && styles.timeQuickTextSelected]}>
                  {m}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.timeInputGroup}>
          <Text style={styles.timeInputLabel}>AM/PM</Text>
          <View style={styles.timeButtonsRow}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.timePeriodButton, period === p && styles.timePeriodButtonSelected]}
                onPress={() => handlePeriodChange(p)}
              >
                <Text style={[styles.timePeriodText, period === p && styles.timePeriodTextSelected]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.timeDisplay}>
        <Ionicons name="time" size={20} color={colors.accent.sage} />
        <Text style={styles.timeDisplayText}>{hour}:{minute} {period}</Text>
      </View>
    </View>
  );
};

interface OptionSelectorProps {
  options: string[];
  value?: string;
  onChange: (value: string) => void;
  label: string;
  icon: string;
}

const OptionSelector: React.FC<OptionSelectorProps> = ({ options, value, onChange, label, icon }) => {
  return (
    <View style={styles.optionSelectorContainer}>
      <Text style={styles.inputLabel}>
        <Ionicons name={icon as any} size={16} color={colors.accent.gold} /> {label}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionsScroll}>
        <View style={styles.optionsRow}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.optionButton, value === option && styles.optionButtonSelected]}
              onPress={() => onChange(option)}
            >
              <Text style={[styles.optionText, value === option && styles.optionTextSelected]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

interface NapSectionProps {
  napNumber: number;
  nap: NapEntry;
  onChange: (nap: NapEntry) => void;
}

const NapSection: React.FC<NapSectionProps> = ({ napNumber, nap, onChange }) => {
  const hasData = nap.duration_minutes || nap.woke_up_time;
  
  return (
    <View style={styles.napContainer}>
      <View style={styles.napHeader}>
        <View style={styles.napTitleRow}>
          <Ionicons name="bed" size={20} color={colors.accent.sage} />
          <Text style={styles.napTitle}>Siesta {napNumber}</Text>
          {hasData && <Ionicons name="checkmark-circle" size={18} color={colors.accent.sage} />}
        </View>
        <Text style={styles.napOptional}>Opcional</Text>
      </View>
      
      <View style={styles.napContent}>
        <View style={styles.durationContainer}>
          <Text style={styles.inputLabel}>
            <Ionicons name="timer-outline" size={18} color={colors.accent.gold} /> ¿Cuánto durmió?
          </Text>
          <View style={styles.durationButtons}>
            {[15, 30, 45, 60, 90, 120, 150, 180].map((min) => (
              <TouchableOpacity
                key={min}
                style={[
                  styles.durationButton,
                  nap.duration_minutes === min && styles.durationButtonSelected
                ]}
                onPress={() => onChange({ ...nap, duration_minutes: min })}
              >
                <Text style={[
                  styles.durationText,
                  nap.duration_minutes === min && styles.durationTextSelected
                ]}>
                  {min}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <TimePicker
          label="Se despertó a las"
          icon="sunny-outline"
          value={nap.woke_up_time}
          onChange={(time) => onChange({ ...nap, woke_up_time: time })}
        />
      </View>
    </View>
  );
};

export const SleepCoachBitacora: React.FC<SleepCoachBitacoraProps> = ({ onComplete, onClose }) => {
  const [section, setSection] = useState<Section>('sleep');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DailyBitacora | null>(null);
  
  // Animation refs for success screen
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Form state
  const [previousDayWakeTime, setPreviousDayWakeTime] = useState<string>();
  const [nap1, setNap1] = useState<NapEntry>({});
  const [nap2, setNap2] = useState<NapEntry>({});
  const [nap3, setNap3] = useState<NapEntry>({});
  const [howBabyAte, setHowBabyAte] = useState<string>();
  const [relaxingRoutineStart, setRelaxingRoutineStart] = useState<string>();
  const [babyMood, setBabyMood] = useState<string>();
  const [lastFeedingTime, setLastFeedingTime] = useState<string>();
  const [laidDownForBed, setLaidDownForBed] = useState<string>();
  const [fellAsleepAt, setFellAsleepAt] = useState<string>();
  const [timeToFallAsleep, setTimeToFallAsleep] = useState<number>();
  const [numberOfWakings, setNumberOfWakings] = useState<number>(0);
  const [nightWakings, setNightWakings] = useState<NightWaking[]>([]);
  const [morningWakeTime, setMorningWakeTime] = useState<string>();
  const [notes, setNotes] = useState('');

  // Trigger animation when section changes to 'complete'
  useEffect(() => {
    if (section === 'complete') {
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [section]);

  const handleSubmit = async () => {
    console.log('🔵 handleSubmit called');
    setIsLoading(true);
    try {
      const bitacora: DailyBitacoraCreate = {
        date: format(new Date(), 'yyyy-MM-dd'),
        previous_day_wake_time: previousDayWakeTime,
        nap_1: Object.keys(nap1).length > 0 ? nap1 : undefined,
        nap_2: Object.keys(nap2).length > 0 ? nap2 : undefined,
        nap_3: Object.keys(nap3).length > 0 ? nap3 : undefined,
        how_baby_ate: howBabyAte,
        relaxing_routine_start: relaxingRoutineStart,
        baby_mood: babyMood,
        last_feeding_time: lastFeedingTime,
        laid_down_for_bed: laidDownForBed,
        fell_asleep_at: fellAsleepAt,
        time_to_fall_asleep_minutes: timeToFallAsleep,
        number_of_wakings: numberOfWakings,
        night_wakings: nightWakings.length > 0 ? nightWakings : undefined,
        morning_wake_time: morningWakeTime,
        notes: notes || undefined,
      };
      
      console.log('📝 Bitacora data:', JSON.stringify(bitacora, null, 2));
      console.log('🚀 Calling createBitacora...');
      
      const saved = await createBitacora(bitacora);
      
      console.log('✅ Bitacora saved:', saved);
      setResult(saved);
      setSection('complete');
      onComplete?.(saved);
    } catch (error) {
      console.error('❌ Error saving bitacora:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      Alert.alert(
        'Error al guardar',
        error instanceof Error ? error.message : 'Error desconocido. Por favor intenta de nuevo.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
      console.log('🔵 handleSubmit finished, isLoading:', false);
    }
  };

  const renderSleepSection = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>
        <Ionicons name="sunny" size={28} color={colors.accent.gold} /> Horarios de Sueño
      </Text>
      <Text style={styles.sectionSubtitle}>
        Cuéntanos sobre el sueño del bebé
      </Text>
      
      <View style={styles.fieldCard}>
        <TimePicker
          label="¿A qué hora despertó ayer?"
          icon="sunny-outline"
          value={previousDayWakeTime}
          onChange={setPreviousDayWakeTime}
        />
      </View>

      <View style={styles.fieldCard}>
        <TimePicker
          label="¿A qué hora despertó hoy?"
          icon="sunny"
          value={morningWakeTime}
          onChange={setMorningWakeTime}
        />
      </View>
      
      <TouchableOpacity 
        style={styles.nextButton}
        onPress={() => setSection('naps')}
      >
        <Text style={styles.nextButtonText}>Siguiente: Siestas</Text>
        <Ionicons name="arrow-forward" size={20} color={colors.text.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderNapsSection = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>
        <Ionicons name="moon" size={28} color={colors.accent.sage} /> Siestas del Día
      </Text>
      <Text style={styles.sectionSubtitle}>
        Registra las siestas que tuvo (todas son opcionales)
      </Text>
      
      <NapSection napNumber={1} nap={nap1} onChange={setNap1} />
      <NapSection napNumber={2} nap={nap2} onChange={setNap2} />
      <NapSection napNumber={3} nap={nap3} onChange={setNap3} />
      
      <View style={styles.navigationButtons}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setSection('sleep')}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.nextButton}
          onPress={() => setSection('night')}
        >
          <Text style={styles.nextButtonText}>Siguiente</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );


  const renderNightSection = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>
        <Ionicons name="moon" size={28} color={colors.accent.terracotta} /> Noche y Despertares
      </Text>
      <Text style={styles.sectionSubtitle}>
        Última información del día
      </Text>
      
      <View style={styles.fieldCard}>
        <OptionSelector
          label="¿Cómo comió durante el día?"
          icon="restaurant-outline"
          options={HOW_BABY_ATE_OPTIONS}
          value={howBabyAte}
          onChange={setHowBabyAte}
        />
      </View>

      <View style={styles.fieldCard}>
        <OptionSelector
          label="Humor del bebé"
          icon="happy-outline"
          options={BABY_MOOD_OPTIONS}
          value={babyMood}
          onChange={setBabyMood}
        />
      </View>
      
      <View style={styles.fieldCard}>
        <TimePicker
          label="Le acosté a dormir"
          icon="bed-outline"
          value={laidDownForBed}
          onChange={setLaidDownForBed}
        />
      </View>
      
      <View style={styles.fieldCard}>
        <TimePicker
          label="Se durmió"
          icon="moon-outline"
          value={fellAsleepAt}
          onChange={setFellAsleepAt}
        />
      </View>
      
      <View style={styles.wakingsCountContainer}>
        <Text style={styles.inputLabel}>
          <Ionicons name="notifications-outline" size={18} color={colors.accent.gold} /> ¿Cuántas veces despertó?
        </Text>
        <View style={styles.wakingsButtons}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.wakingButton,
                numberOfWakings === num && styles.wakingButtonSelected
              ]}
              onPress={() => setNumberOfWakings(num)}
            >
              <Text style={[
                styles.wakingText,
                numberOfWakings === num && styles.wakingTextSelected
              ]}>
                {num === 8 ? '8+' : num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.notesContainer}>
        <Text style={styles.inputLabel}>
          <Ionicons name="create-outline" size={18} color={colors.accent.gold} /> Notas para la coach (opcional)
        </Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Algo importante que quieras compartir..."
          placeholderTextColor={colors.text.muted}
          multiline
          numberOfLines={4}
          value={notes}
          onChangeText={setNotes}
          textAlignVertical="top"
        />
      </View>
      
      <View style={styles.navigationButtons}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setSection('naps')}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={() => {
            console.log('🔴 BUTTON PRESSED - onPress triggered');
            handleSubmit();
          }}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.text.primary} />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Guardar Bitácora</Text>
              <Ionicons name="checkmark-circle" size={22} color={colors.text.primary} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );


  const renderCompleteSection = () => (
    <View style={styles.completeContainer}>
      <Animated.View style={[styles.successIconContainer, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons name="checkmark-circle" size={100} color={colors.accent.sage} />
      </Animated.View>
      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center', width: '100%' }}>
        <Text style={styles.completeTitle}>¡Bitácora guardada con éxito!</Text>
        <Text style={styles.completeSubtitle}>Día #{result?.day_number}</Text>
        <Text style={styles.completeMessage}>
          Tu registro ha sido enviado a tu coach y está disponible en tu historial.
        </Text>
        
        {result?.ai_summary && (
          <View style={styles.aiSummaryContainer}>
            <View style={styles.aiSummaryHeader}>
              <Ionicons name="sparkles" size={20} color={colors.accent.gold} />
              <Text style={styles.aiSummaryLabel}>Resumen IA para tu coach</Text>
            </View>
            <Text style={styles.aiSummaryText}>{result.ai_summary}</Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.doneButton}
          onPress={onClose}
        >
          <Ionicons name="checkmark" size={20} color={colors.text.primary} />
          <Text style={styles.doneButtonText}>Listo</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  const renderSection = () => {
    switch (section) {
      case 'sleep': return renderSleepSection();
      case 'naps': return renderNapsSection();
      case 'night': return renderNightSection();
      case 'complete': return renderCompleteSection();
    }
  };

  // Progress indicator
  const sectionOrder: Section[] = ['sleep', 'naps', 'night'];
  const currentIndex = sectionOrder.indexOf(section);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Progress bar */}
      {section !== 'complete' && (
        <View style={styles.progressContainer}>
          {sectionOrder.map((s, i) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                i <= currentIndex && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      )}
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderSection()}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  progressDot: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.background.elevated,
  },
  progressDotActive: {
    backgroundColor: colors.accent.sage,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  sectionContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginBottom: spacing.xl,
  },
  fieldCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  timePickerContainer: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  timePickerInline: {
    gap: spacing.lg,
  },
  timeInputGroup: {
    marginBottom: spacing.sm,
  },
  timeInputLabel: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  timeQuickButton: {
    minWidth: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timeQuickButtonSelected: {
    backgroundColor: colors.accent.sage,
    borderColor: colors.accent.gold,
  },
  timeQuickText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  timeQuickTextSelected: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background.elevated,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  timeDisplayText: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.accent.sage,
  },
  timePeriodButton: {
    minWidth: 80,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  timePeriodButtonSelected: {
    backgroundColor: colors.accent.gold,
    borderColor: colors.accent.sage,
  },
  timePeriodText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text.secondary,
  },
  timePeriodTextSelected: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  optionSelectorContainer: {
    marginBottom: spacing.md,
  },
  optionsScroll: {
    marginTop: spacing.xs,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  optionButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.full,
  },
  optionButtonSelected: {
    backgroundColor: colors.accent.sage,
  },
  optionText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  optionTextSelected: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  napContainer: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  napHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  napTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  napTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  napOptional: {
    fontSize: fontSize.xs,
    color: colors.text.muted,
    backgroundColor: colors.background.elevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  napContent: {
    gap: spacing.md,
  },
  durationContainer: {
    marginBottom: spacing.sm,
  },
  durationButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  durationButton: {
    minWidth: 64,
    height: 56,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  durationButtonSelected: {
    backgroundColor: colors.accent.gold,
    borderColor: colors.accent.sage,
  },
  durationText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  durationTextSelected: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  wakingsCountContainer: {
    marginBottom: spacing.lg,
  },
  wakingsButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  wakingButton: {
    minWidth: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  wakingButtonSelected: {
    backgroundColor: colors.accent.terracotta,
    borderColor: colors.accent.gold,
  },
  wakingText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  wakingTextSelected: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  notesContainer: {
    marginBottom: spacing.lg,
  },
  notesInput: {
    backgroundColor: colors.background.elevated,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text.primary,
    minHeight: 100,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.background.elevated,
    minHeight: 56,
  },
  backButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.sage,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    minHeight: 56,
    shadowColor: colors.accent.sage,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  nextButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.sage,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    minHeight: 56,
    shadowColor: colors.accent.sage,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  completeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  successIconContainer: {
    marginBottom: spacing.lg,
    transform: [{ scale: 1 }],
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  completeSubtitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.accent.sage,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  completeMessage: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  aiSummaryContainer: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.gold,
    marginBottom: spacing.xl,
    width: '100%',
  },
  aiSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  aiSummaryLabel: {
    fontSize: fontSize.md,
    color: colors.accent.gold,
    fontWeight: '700',
  },
  aiSummaryText: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    lineHeight: 22,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.sage,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
    minHeight: 56,
    minWidth: 200,
    shadowColor: colors.accent.sage,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  doneButtonText: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
  },
});

export default SleepCoachBitacora;
