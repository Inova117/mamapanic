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
  /** Existing entry to edit (pre-fills the form). */
  initial?: DailyBitacora;
}

/** Build a nested NapEntry from the flat DB columns of an existing bitácora. */
const napFromFlat = (b: DailyBitacora | undefined, n: 1 | 2 | 3): NapEntry => {
  if (!b) return {};
  const e: NapEntry = {};
  const src = b as unknown as Record<string, unknown>;
  const dur = src[`nap_${n}_duration_minutes`];
  if (dur != null) e.duration_minutes = dur as number;
  const ld = src[`nap_${n}_laid_down`];
  if (ld) e.laid_down_time = ld as string;
  const fa = src[`nap_${n}_fell_asleep`];
  if (fa) e.fell_asleep_time = fa as string;
  const hf = src[`nap_${n}_how_fell_asleep`];
  if (hf) e.how_fell_asleep = hf as string;
  const wu = src[`nap_${n}_woke_up`];
  if (wu) e.woke_up_time = wu as string;
  return e;
};

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
  // Track whether a time was actually chosen. Without this, the picker showed a
  // default "8:00 PM" that was NEVER emitted unless tapped → the parent kept
  // `undefined` and the time saved as NULL. Now nothing is highlighted/saved
  // until the mother taps.
  const [isSet, setIsSet] = useState(value !== undefined);

  // Sync internal state when value prop changes
  useEffect(() => {
    const updated = convert24to12(value);
    setHour(updated.hour);
    setMinute(updated.minute);
    setPeriod(updated.period);
    setIsSet(value !== undefined);
  }, [value]);

  const handleHourChange = (h: string) => {
    setHour(h);
    setIsSet(true);
    onChange(convert12to24(h, minute, period));
  };

  const handleMinuteChange = (m: string) => {
    setMinute(m);
    setIsSet(true);
    onChange(convert12to24(hour, m, period));
  };

  const handlePeriodChange = (p: string) => {
    setPeriod(p);
    setIsSet(true);
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
                style={[styles.timeQuickButton, isSet && hour === h && styles.timeQuickButtonSelected]}
                onPress={() => handleHourChange(h)}
              >
                <Text style={[styles.timeQuickText, isSet && hour === h && styles.timeQuickTextSelected]}>
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
                style={[styles.timeQuickButton, isSet && minute === m && styles.timeQuickButtonSelected]}
                onPress={() => handleMinuteChange(m)}
              >
                <Text style={[styles.timeQuickText, isSet && minute === m && styles.timeQuickTextSelected]}>
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
                style={[styles.timePeriodButton, isSet && period === p && styles.timePeriodButtonSelected]}
                onPress={() => handlePeriodChange(p)}
              >
                <Text style={[styles.timePeriodText, isSet && period === p && styles.timePeriodTextSelected]}>
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.timeDisplay}>
        <Ionicons name="time" size={20} color={isSet ? colors.accent.sage : colors.text.muted} />
        <Text style={styles.timeDisplayText}>
          {isSet ? `${hour}:${minute} ${period}` : 'Sin seleccionar — toca una hora'}
        </Text>
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
  const hasData = nap.duration_minutes || nap.woke_up_time || nap.laid_down_time || nap.fell_asleep_time || nap.how_fell_asleep;
  
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
          label="Le acosté a las"
          icon="bed-outline"
          value={nap.laid_down_time}
          onChange={(time) => onChange({ ...nap, laid_down_time: time })}
        />

        <TimePicker
          label="Se durmió a las"
          icon="moon-outline"
          value={nap.fell_asleep_time}
          onChange={(time) => onChange({ ...nap, fell_asleep_time: time })}
        />

        <OptionSelector
          label="¿Cómo se durmió?"
          icon="hand-left-outline"
          options={HOW_FELL_ASLEEP_OPTIONS}
          value={nap.how_fell_asleep}
          onChange={(v) => onChange({ ...nap, how_fell_asleep: v })}
        />

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

export const SleepCoachBitacora: React.FC<SleepCoachBitacoraProps> = ({ onComplete, onClose, initial }) => {
  const [section, setSection] = useState<Section>('sleep');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DailyBitacora | null>(null);

  // Animation refs for success screen
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Form state — pre-filled from `initial` when editing an existing day.
  const [previousDayWakeTime, setPreviousDayWakeTime] = useState<string | undefined>(initial?.previous_day_wake_time);
  const [nap1, setNap1] = useState<NapEntry>(() => napFromFlat(initial, 1));
  const [nap2, setNap2] = useState<NapEntry>(() => napFromFlat(initial, 2));
  const [nap3, setNap3] = useState<NapEntry>(() => napFromFlat(initial, 3));
  const [howBabyAte, setHowBabyAte] = useState<string | undefined>(initial?.how_baby_ate);
  const [relaxingRoutineStart, setRelaxingRoutineStart] = useState<string | undefined>(initial?.relaxing_routine_start);
  const [babyMood, setBabyMood] = useState<string | undefined>(initial?.baby_mood);
  const [lastFeedingTime, setLastFeedingTime] = useState<string | undefined>(initial?.last_feeding_time);
  const [laidDownForBed, setLaidDownForBed] = useState<string | undefined>(initial?.laid_down_for_bed);
  const [fellAsleepAt, setFellAsleepAt] = useState<string | undefined>(initial?.fell_asleep_at);
  const [timeToFallAsleep, setTimeToFallAsleep] = useState<number | undefined>(initial?.time_to_fall_asleep_minutes);
  const [numberOfWakings, setNumberOfWakings] = useState<number>(initial?.number_of_wakings ?? 0);
  const [nightWakings, setNightWakings] = useState<NightWaking[]>(initial?.night_wakings ?? []);
  const [morningWakeTime, setMorningWakeTime] = useState<string | undefined>(initial?.morning_wake_time);
  const [notes, setNotes] = useState(initial?.notes ?? '');

  // Keep the per-waking detail list in sync with the count the mother picks.
  const handleWakingsCount = (num: number) => {
    setNumberOfWakings(num);
    setNightWakings((prev) => {
      const next = [...prev];
      if (num < next.length) return next.slice(0, num);
      while (next.length < num) next.push({});
      return next;
    });
  };
  const updateWaking = (i: number, patch: Partial<NightWaking>) => {
    setNightWakings((prev) => prev.map((w, idx) => (idx === i ? { ...w, ...patch } : w)));
  };

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

      const saved = await createBitacora(bitacora);
      setResult(saved);
      setSection('complete');
      onComplete?.(saved);
    } catch (error) {
      Alert.alert(
        'Error al guardar',
        error instanceof Error ? error.message : 'Error desconocido. Por favor intenta de nuevo.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
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
          label="Inició la rutina relajante"
          icon="water-outline"
          value={relaxingRoutineStart}
          onChange={setRelaxingRoutineStart}
        />
      </View>

      <View style={styles.fieldCard}>
        <TimePicker
          label="Última toma del día"
          icon="restaurant-outline"
          value={lastFeedingTime}
          onChange={setLastFeedingTime}
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
          <Ionicons name="time-outline" size={18} color={colors.accent.gold} /> ¿Cuánto tardó en dormirse? (min)
        </Text>
        <View style={styles.wakingsButtons}>
          {[5, 10, 15, 20, 30, 45, 60].map((min) => (
            <TouchableOpacity
              key={min}
              style={[styles.wakingButton, timeToFallAsleep === min && styles.wakingButtonSelected]}
              onPress={() => setTimeToFallAsleep(min)}
            >
              <Text style={[styles.wakingText, timeToFallAsleep === min && styles.wakingTextSelected]}>
                {min}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
              onPress={() => handleWakingsCount(num)}
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

      {nightWakings.length > 0 && (
        <View style={styles.fieldCard}>
          <Text style={styles.inputLabel}>
            <Ionicons name="moon-outline" size={18} color={colors.accent.gold} /> Detalle de cada despertar (opcional)
          </Text>
          {nightWakings.map((w, i) => (
            <View
              key={i}
              style={{ marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.background.elevated, paddingTop: spacing.sm }}
            >
              <Text style={{ fontSize: fontSize.sm, fontWeight: '600', color: colors.text.secondary, marginBottom: spacing.xs }}>
                Despertar {i + 1}
              </Text>
              <TimePicker
                label="¿A qué hora?"
                icon="time-outline"
                value={w.time}
                onChange={(t) => updateWaking(i, { time: t })}
              />
              <TextInput
                style={styles.notesInput}
                placeholder="¿Qué hiciste? (opcional)"
                placeholderTextColor={colors.text.muted}
                value={w.what_was_done ?? ''}
                onChangeText={(t) => updateWaking(i, { what_was_done: t })}
              />
            </View>
          ))}
        </View>
      )}

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
          onPress={handleSubmit}
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
