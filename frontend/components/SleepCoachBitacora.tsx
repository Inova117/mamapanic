import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
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

type Section = 'morning' | 'naps' | 'feeding' | 'night' | 'wakings' | 'complete';

// Time picker options (simplified)
const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  label: string;
  icon: string;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, label, icon }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedHour, setSelectedHour] = useState(value?.split(':')[0] || '08');
  const [selectedMinute, setSelectedMinute] = useState(value?.split(':')[1] || '00');

  const handleConfirm = () => {
    onChange(`${selectedHour}:${selectedMinute}`);
    setShowPicker(false);
  };

  return (
    <View style={styles.timePickerContainer}>
      <Text style={styles.inputLabel}>
        <Ionicons name={icon as any} size={16} color={colors.accent.gold} /> {label}
      </Text>
      <TouchableOpacity 
        style={styles.timeButton}
        onPress={() => setShowPicker(!showPicker)}
      >
        <Text style={styles.timeButtonText}>
          {value || 'Seleccionar'}
        </Text>
        <Ionicons name="time-outline" size={20} color={colors.text.secondary} />
      </TouchableOpacity>
      
      {showPicker && (
        <View style={styles.timePickerDropdown}>
          <View style={styles.timePickerRow}>
            <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false}>
              {HOURS.map((h) => (
                <TouchableOpacity
                  key={h}
                  style={[styles.timeOption, selectedHour === h && styles.timeOptionSelected]}
                  onPress={() => setSelectedHour(h)}
                >
                  <Text style={[styles.timeOptionText, selectedHour === h && styles.timeOptionTextSelected]}>
                    {h}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.timeSeparator}>:</Text>
            <ScrollView style={styles.timeColumn} showsVerticalScrollIndicator={false}>
              {MINUTES.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.timeOption, selectedMinute === m && styles.timeOptionSelected]}
                  onPress={() => setSelectedMinute(m)}
                >
                  <Text style={[styles.timeOptionText, selectedMinute === m && styles.timeOptionTextSelected]}>
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <TouchableOpacity style={styles.timeConfirmButton} onPress={handleConfirm}>
            <Text style={styles.timeConfirmText}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      )}
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
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.napContainer}>
      <TouchableOpacity 
        style={styles.napHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={styles.napTitle}>SIESTA {napNumber}</Text>
        <Ionicons 
          name={expanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color={colors.text.secondary} 
        />
      </TouchableOpacity>
      
      {expanded && (
        <View style={styles.napContent}>
          <TimePicker
            label="Acosté a las"
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
            icon="heart-outline"
            options={HOW_FELL_ASLEEP_OPTIONS}
            value={nap.how_fell_asleep}
            onChange={(value) => onChange({ ...nap, how_fell_asleep: value })}
          />
          <TimePicker
            label="Se despertó"
            icon="sunny-outline"
            value={nap.woke_up_time}
            onChange={(time) => onChange({ ...nap, woke_up_time: time })}
          />
          <View style={styles.durationContainer}>
            <Text style={styles.inputLabel}>
              <Ionicons name="timer-outline" size={16} color={colors.accent.gold} /> Duración (minutos)
            </Text>
            <View style={styles.durationButtons}>
              {[15, 30, 45, 60, 90, 120].map((min) => (
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
                    {min}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export const SleepCoachBitacora: React.FC<SleepCoachBitacoraProps> = ({ onComplete, onClose }) => {
  const [section, setSection] = useState<Section>('morning');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DailyBitacora | null>(null);
  
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
      console.error('Error saving bitacora:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMorningSection = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>
        <Ionicons name="sunny" size={24} color={colors.accent.gold} /> Mañana Anterior
      </Text>
      <Text style={styles.sectionSubtitle}>
        ¿A qué hora despertó el bebé ayer?
      </Text>
      
      <TimePicker
        label="Hora de despertar día anterior"
        icon="sunny-outline"
        value={previousDayWakeTime}
        onChange={setPreviousDayWakeTime}
      />
      
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
        <Ionicons name="moon" size={24} color={colors.accent.sage} /> Siestas del Día
      </Text>
      <Text style={styles.sectionSubtitle}>
        Toca cada siesta para expandir los detalles
      </Text>
      
      <NapSection napNumber={1} nap={nap1} onChange={setNap1} />
      <NapSection napNumber={2} nap={nap2} onChange={setNap2} />
      <NapSection napNumber={3} nap={nap3} onChange={setNap3} />
      
      <View style={styles.navigationButtons}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setSection('morning')}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.nextButton}
          onPress={() => setSection('feeding')}
        >
          <Text style={styles.nextButtonText}>Siguiente</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFeedingSection = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>
        <Ionicons name="nutrition" size={24} color={colors.accent.gold} /> Alimentación
      </Text>
      
      <OptionSelector
        label="¿Cómo comió a lo largo del día?"
        icon="restaurant-outline"
        options={HOW_BABY_ATE_OPTIONS}
        value={howBabyAte}
        onChange={setHowBabyAte}
      />
      
      <View style={styles.navigationButtons}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setSection('naps')}
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
        <Ionicons name="bed" size={24} color={colors.accent.terracotta} /> Rutina Nocturna
      </Text>
      
      <TimePicker
        label="Rutina relajante comenzó"
        icon="water-outline"
        value={relaxingRoutineStart}
        onChange={setRelaxingRoutineStart}
      />
      
      <OptionSelector
        label="Humor del bebé"
        icon="happy-outline"
        options={BABY_MOOD_OPTIONS}
        value={babyMood}
        onChange={setBabyMood}
      />
      
      <TimePicker
        label="Última toma del día"
        icon="cafe-outline"
        value={lastFeedingTime}
        onChange={setLastFeedingTime}
      />
      
      <TimePicker
        label="Le acosté"
        icon="bed-outline"
        value={laidDownForBed}
        onChange={setLaidDownForBed}
      />
      
      <TimePicker
        label="Se durmió"
        icon="moon-outline"
        value={fellAsleepAt}
        onChange={setFellAsleepAt}
      />
      
      <View style={styles.durationContainer}>
        <Text style={styles.inputLabel}>
          <Ionicons name="hourglass-outline" size={16} color={colors.accent.gold} /> Tardó en dormirse (min)
        </Text>
        <View style={styles.durationButtons}>
          {[5, 10, 15, 20, 30, 45, 60].map((min) => (
            <TouchableOpacity
              key={min}
              style={[
                styles.durationButton,
                timeToFallAsleep === min && styles.durationButtonSelected
              ]}
              onPress={() => setTimeToFallAsleep(min)}
            >
              <Text style={[
                styles.durationText,
                timeToFallAsleep === min && styles.durationTextSelected
              ]}>
                {min}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.navigationButtons}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setSection('feeding')}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.nextButton}
          onPress={() => setSection('wakings')}
        >
          <Text style={styles.nextButtonText}>Siguiente</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderWakingsSection = () => (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>
        <Ionicons name="alert-circle" size={24} color={colors.accent.terracotta} /> Despertares Nocturnos
      </Text>
      
      <View style={styles.wakingsCountContainer}>
        <Text style={styles.inputLabel}>
          <Ionicons name="notifications-outline" size={16} color={colors.accent.gold} /> # de Despertares
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
      
      <TimePicker
        label="Hora de despertar hoy"
        icon="sunny-outline"
        value={morningWakeTime}
        onChange={setMorningWakeTime}
      />
      
      <View style={styles.notesContainer}>
        <Text style={styles.inputLabel}>
          <Ionicons name="create-outline" size={16} color={colors.accent.gold} /> Notas adicionales
        </Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Algo que quieras agregar para la coach..."
          placeholderTextColor={colors.text.muted}
          multiline
          numberOfLines={3}
          value={notes}
          onChangeText={setNotes}
          textAlignVertical="top"
        />
      </View>
      
      <View style={styles.navigationButtons}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => setSection('night')}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text.secondary} />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.text.primary} />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Guardar</Text>
              <Ionicons name="checkmark-circle" size={20} color={colors.text.primary} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCompleteSection = () => (
    <View style={styles.completeContainer}>
      <Ionicons name="checkmark-circle" size={80} color={colors.accent.sage} />
      <Text style={styles.completeTitle}>¡Bitácora guardada!</Text>
      <Text style={styles.completeSubtitle}>Día #{result?.day_number}</Text>
      
      {result?.ai_summary && (
        <View style={styles.aiSummaryContainer}>
          <Text style={styles.aiSummaryLabel}>Resumen para la coach:</Text>
          <Text style={styles.aiSummaryText}>{result.ai_summary}</Text>
        </View>
      )}
      
      <TouchableOpacity 
        style={styles.doneButton}
        onPress={onClose}
      >
        <Text style={styles.doneButtonText}>Listo</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSection = () => {
    switch (section) {
      case 'morning': return renderMorningSection();
      case 'naps': return renderNapsSection();
      case 'feeding': return renderFeedingSection();
      case 'night': return renderNightSection();
      case 'wakings': return renderWakingsSection();
      case 'complete': return renderCompleteSection();
    }
  };

  // Progress indicator
  const sectionOrder: Section[] = ['morning', 'naps', 'feeding', 'night', 'wakings'];
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
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.background.elevated,
  },
  progressDotActive: {
    backgroundColor: colors.accent.gold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  sectionContainer: {
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  timePickerContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  timeButtonText: {
    fontSize: fontSize.md,
    color: colors.text.primary,
  },
  timePickerDropdown: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    padding: spacing.md,
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeColumn: {
    height: 120,
    width: 60,
  },
  timeSeparator: {
    fontSize: fontSize.xl,
    color: colors.text.primary,
    marginHorizontal: spacing.md,
  },
  timeOption: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  timeOptionSelected: {
    backgroundColor: colors.accent.gold,
    borderRadius: borderRadius.sm,
  },
  timeOptionText: {
    fontSize: fontSize.lg,
    color: colors.text.secondary,
  },
  timeOptionTextSelected: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  timeConfirmButton: {
    backgroundColor: colors.accent.sage,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  timeConfirmText: {
    color: colors.text.primary,
    fontWeight: '600',
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
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  napHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  napTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  napContent: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background.elevated,
  },
  durationContainer: {
    marginBottom: spacing.md,
  },
  durationButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  durationButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
  },
  durationButtonSelected: {
    backgroundColor: colors.accent.gold,
  },
  durationText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  durationTextSelected: {
    color: colors.text.inverse,
    fontWeight: '600',
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
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.full,
  },
  wakingButtonSelected: {
    backgroundColor: colors.accent.terracotta,
  },
  wakingText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  wakingTextSelected: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  notesContainer: {
    marginBottom: spacing.lg,
  },
  notesInput: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text.primary,
    minHeight: 80,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.text.muted,
  },
  backButtonText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.sage,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  nextButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.terracotta,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  completeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  completeTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.lg,
  },
  completeSubtitle: {
    fontSize: fontSize.lg,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  aiSummaryContainer: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.sage,
    marginBottom: spacing.lg,
    width: '100%',
  },
  aiSummaryLabel: {
    fontSize: fontSize.sm,
    color: colors.accent.sage,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  aiSummaryText: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    lineHeight: 22,
  },
  doneButton: {
    backgroundColor: colors.accent.sage,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.md,
  },
  doneButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

export default SleepCoachBitacora;
