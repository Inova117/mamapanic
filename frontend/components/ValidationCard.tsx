import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../theme/theme';
import { ValidationCard as ValidationCardType } from '../types';

interface ValidationCardProps {
  validation: ValidationCardType;
  onNext?: () => void;
  onContinue?: () => void;
}

export const ValidationCard: React.FC<ValidationCardProps> = ({ 
  validation, 
  onNext,
  onContinue 
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="heart" size={48} color={colors.accent.terracotta} />
      </View>
      
      <Text style={styles.message}>{validation.message_es}</Text>
      
      <View style={styles.buttonsContainer}>
        <TouchableOpacity 
          style={styles.nextButton}
          onPress={onNext}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={24} color={colors.text.secondary} />
          <Text style={styles.nextButtonText}>Otra frase</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={onContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Me siento mejor</Text>
          <Ionicons name="checkmark-circle" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  message: {
    fontSize: fontSize.xl,
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 32,
    marginBottom: spacing.xl,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.text.muted,
  },
  nextButtonText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  continueButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent.sage,
    borderRadius: borderRadius.md,
  },
  continueButtonText: {
    fontSize: fontSize.sm,
    color: colors.text.primary,
    fontWeight: '600',
  },
});

export default ValidationCard;
