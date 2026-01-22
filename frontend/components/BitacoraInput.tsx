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
import { createCheckIn } from '../services/api';
import { MoodType, DailyCheckIn } from '../types';

interface BitacoraInputProps {
  onComplete?: (checkIn: DailyCheckIn) => void;
}

type Step = 'mood' | 'sleep' | 'brain_dump' | 'complete';

const MOOD_OPTIONS = [
  { value: 1 as MoodType, emoji: '😢', label: 'Difícil', color: colors.mood.sad },
  { value: 2 as MoodType, emoji: '😐', label: 'Regular', color: colors.mood.neutral },
  { value: 3 as MoodType, emoji: '🙂', label: 'Bien', color: colors.mood.happy },
];

const SLEEP_OPTIONS = [
  { value: 0, label: 'Nada' },
  { value: 1, label: '1-2h' },
  { value: 2, label: '2-4h' },
  { value: 3, label: '4-6h' },
  { value: 4, label: '+6h' },
];

const WAKEUP_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export const BitacoraInput: React.FC<BitacoraInputProps> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('mood');
  const [mood, setMood] = useState<MoodType | null>(null);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [wakeups, setWakeups] = useState<number | null>(null);
  const [brainDump, setBrainDump] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DailyCheckIn | null>(null);

  const handleMoodSelect = (selectedMood: MoodType) => {
    setMood(selectedMood);
    setTimeout(() => setStep('sleep'), 300);
  };

  const handleSleepSelect = (hours: number) => {
    setSleepHours(hours);
  };

  const handleWakeupSelect = (count: number) => {
    setWakeups(count);
  };

  const handleContinueToSleep = () => {
    if (sleepHours !== null) {
      setStep('brain_dump');
    }
  };

  const handleSubmit = async () => {
    if (mood === null) return;
    
    setIsLoading(true);
    try {
      const checkIn = await createCheckIn({
        mood,
        baby_wakeups: wakeups ?? undefined,
        brain_dump: brainDump || undefined,
      });
      setResult(checkIn);
      setStep('complete');
      onComplete?.(checkIn);
    } catch (error) {
      console.error('Error creating check-in:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipBrainDump = () => {
    handleSubmit();
  };

  const renderMoodStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.questionText}>¿Cómo fue tu noche?</Text>
      <Text style={styles.hintText}>Toca cómo te sientes ahora</Text>
      
      <View style={styles.moodContainer}>
        {MOOD_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.moodButton,
              mood === option.value && { backgroundColor: option.color },
            ]}
            onPress={() => handleMoodSelect(option.value)}
            activeOpacity={0.8}
          >
            <Text style={styles.moodEmoji}>{option.emoji}</Text>
            <Text style={[
              styles.moodLabel,
              mood === option.value && { color: colors.text.primary }
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSleepStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.questionText}>¿Cuánto dormiste?</Text>
      <Text style={styles.hintText}>Aproximadamente, no tiene que ser exacto</Text>
      
      <View style={styles.sleepContainer}>
        {SLEEP_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.sleepButton,
              sleepHours === option.value && styles.sleepButtonSelected,
            ]}
            onPress={() => handleSleepSelect(option.value)}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.sleepLabel,
              sleepHours === option.value && styles.sleepLabelSelected
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.questionText, { marginTop: spacing.xl }]}>
        ¿Cuántas veces despertó el bebé?
      </Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.wakeupScroll}
        contentContainerStyle={styles.wakeupContainer}
      >
        {WAKEUP_OPTIONS.map((count) => (
          <TouchableOpacity
            key={count}
            style={[
              styles.wakeupButton,
              wakeups === count && styles.wakeupButtonSelected,
            ]}
            onPress={() => handleWakeupSelect(count)}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.wakeupLabel,
              wakeups === count && styles.wakeupLabelSelected
            ]}>
              {count === 8 ? '8+' : count}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity 
        style={[
          styles.continueButton,
          sleepHours === null && styles.continueButtonDisabled
        ]}
        onPress={handleContinueToSleep}
        disabled={sleepHours === null}
        activeOpacity={0.8}
      >
        <Text style={styles.continueButtonText}>Continuar</Text>
        <Ionicons name="arrow-forward" size={20} color={colors.text.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderBrainDumpStep = () => (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.stepContainer}
    >
      <Text style={styles.questionText}>¿Algo que quieras desahogar?</Text>
      <Text style={styles.hintText}>Escribe lo que sientes. Nadie te juzga.</Text>
      
      <TextInput
        style={styles.textInput}
        placeholder="Estoy agotada porque..."
        placeholderTextColor={colors.text.muted}
        multiline
        numberOfLines={4}
        value={brainDump}
        onChangeText={setBrainDump}
        textAlignVertical="top"
      />

      <View style={styles.submitContainer}>
        <TouchableOpacity 
          style={styles.skipButton}
          onPress={handleSkipBrainDump}
          activeOpacity={0.8}
        >
          <Text style={styles.skipButtonText}>Saltar</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.text.primary} />
          ) : (
            <>
              <Text style={styles.submitButtonText}>Guardar</Text>
              <Ionicons name="checkmark" size={20} color={colors.text.primary} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderCompleteStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.completeContainer}>
        <Ionicons name="heart" size={64} color={colors.accent.sage} />
        <Text style={styles.completeTitle}>Gracias por compartir</Text>
        {result?.ai_response && (
          <View style={styles.aiResponseContainer}>
            <Text style={styles.aiResponseText}>{result.ai_response}</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 'mood':
        return renderMoodStep();
      case 'sleep':
        return renderSleepStep();
      case 'brain_dump':
        return renderBrainDumpStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return null;
    }
  };

  // Progress indicator
  const stepNumber = { mood: 1, sleep: 2, brain_dump: 3, complete: 4 }[step];

  return (
    <View style={styles.container}>
      {step !== 'complete' && (
        <View style={styles.progressContainer}>
          {[1, 2, 3].map((num) => (
            <View
              key={num}
              style={[
                styles.progressDot,
                num <= stepNumber && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      )}
      
      {renderStep()}

      {step !== 'mood' && step !== 'complete' && (
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (step === 'sleep') setStep('mood');
            if (step === 'brain_dump') setStep('sleep');
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.secondary} />
          <Text style={styles.backButtonText}>Atrás</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background.elevated,
  },
  progressDotActive: {
    backgroundColor: colors.accent.gold,
  },
  stepContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  questionText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  hintText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
  },
  moodButton: {
    width: 100,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  moodEmoji: {
    fontSize: 48,
  },
  moodLabel: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  sleepContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  sleepButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    minWidth: touchTarget.comfortable,
  },
  sleepButtonSelected: {
    backgroundColor: colors.accent.gold,
  },
  sleepLabel: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  sleepLabelSelected: {
    color: colors.text.inverse,
    fontWeight: '600',
  },
  wakeupScroll: {
    marginTop: spacing.md,
  },
  wakeupContainer: {
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  wakeupButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.full,
  },
  wakeupButtonSelected: {
    backgroundColor: colors.accent.terracotta,
  },
  wakeupLabel: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  wakeupLabelSelected: {
    color: colors.text.primary,
    fontWeight: '600',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.sage,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.xl,
  },
  continueButtonDisabled: {
    backgroundColor: colors.background.elevated,
  },
  continueButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  textInput: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: fontSize.md,
    color: colors.text.primary,
    minHeight: 120,
    marginBottom: spacing.lg,
  },
  submitContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  skipButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.text.muted,
  },
  skipButtonText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent.sage,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  submitButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  completeContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  completeTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
  },
  aiResponseContainer: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent.sage,
  },
  aiResponseText: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    lineHeight: 24,
    fontStyle: 'italic',
  },
});

export default BitacoraInput;
