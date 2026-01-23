import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, spacing, borderRadius } from '../theme/theme';
import { useAppStore } from '../store/useAppStore';
import { getRandomValidation } from '../services/api';
import { ValidationCard as ValidationCardType, CrisisPhase } from '../types';
import BreathingCircle from './BreathingCircle';
import ValidationCard from './ValidationCard';
import CommunityBar from './CommunityBar';
import { router } from 'expo-router';

export const CrisisModeScreen: React.FC = () => {
  const { crisisPhase, setCrisisPhase } = useAppStore();
  const [validation, setValidation] = useState<ValidationCardType | null>(null);
  const [showModal, setShowModal] = useState(false);

  const fetchValidation = async () => {
    try {
      const card = await getRandomValidation();
      setValidation(card);
    } catch (error) {
      setValidation({
        id: 'fallback',
        message_es: 'No lo estás haciendo mal. Eres suficiente tal como eres.',
        category: 'general',
        created_at: new Date().toISOString(),
      });
    }
  };

  const handlePanicPress = () => {
    setCrisisPhase('breathing');
    setShowModal(true);
  };

  const handleBreathingComplete = () => {
    setCrisisPhase('validation');
    fetchValidation();
  };

  const handleNextValidation = () => {
    fetchValidation();
  };

  const handleFeelBetter = () => {
    setCrisisPhase('community');
  };

  const handleConnectCommunity = () => {
    setShowModal(false);
    setCrisisPhase('idle');
    router.push('/chat');
  };

  const handleClose = () => {
    setShowModal(false);
    setCrisisPhase('idle');
  };

  const renderPhaseContent = () => {
    switch (crisisPhase) {
      case 'breathing':
        return (
          <View style={styles.phaseContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={28} color={colors.text.secondary} />
            </TouchableOpacity>
            <Text style={styles.phaseTitle}>Respira conmigo</Text>
            <Text style={styles.phaseSubtitle}>Técnica 4-7-8 para calmar tu sistema nervioso</Text>
            <BreathingCircle onComplete={handleBreathingComplete} cycles={2} />
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleBreathingComplete}
            >
              <Text style={styles.skipButtonText}>Ya me siento mejor, saltar</Text>
            </TouchableOpacity>
          </View>
        );

      case 'validation':
        return (
          <View style={styles.phaseContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={28} color={colors.text.secondary} />
            </TouchableOpacity>
            <Text style={styles.phaseTitle}>Recuerda esto</Text>
            {validation && (
              <ValidationCard
                validation={validation}
                onNext={handleNextValidation}
                onContinue={handleFeelBetter}
              />
            )}
          </View>
        );

      case 'community':
        return (
          <View style={styles.phaseContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={28} color={colors.text.secondary} />
            </TouchableOpacity>
            <View style={styles.communityContent}>
              <Ionicons name="heart-circle" size={80} color={colors.accent.sage} />
              <Text style={styles.phaseTitle}>No estás sola</Text>
              <CommunityBar />
              <Text style={styles.communityText}>
                Hay una comunidad de mamás que entienden exactamente lo que estás viviendo.
              </Text>
              <TouchableOpacity
                style={styles.connectButton}
                onPress={handleConnectCommunity}
              >
                <Ionicons name="chatbubbles" size={24} color={colors.text.primary} />
                <Text style={styles.connectButtonText}>Hablar con la Abuela Sabia</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.doneButton}
                onPress={handleClose}
              >
                <Text style={styles.doneButtonText}>Estoy bien por ahora</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Main Panic Button */}
      <TouchableOpacity
        style={styles.panicButton}
        onPress={handlePanicPress}
        activeOpacity={0.8}
      >
        <View style={styles.panicButtonInner}>
          <Ionicons name="pulse" size={32} color={colors.text.primary} />
          <Text style={styles.panicButtonText}>PÁNICO</Text>
          <Text style={styles.panicButtonSubtext}>Toca si necesitas calma</Text>
        </View>
      </TouchableOpacity>

      {/* Crisis Modal */}
      <Modal
        visible={showModal}
        animationType="fade"
        transparent={false}
        statusBarTranslucent
      >
        <SafeAreaView style={styles.modalContainer}>
          {renderPhaseContent()}
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  panicButton: {
    backgroundColor: colors.accent.terracotta,
    borderRadius: borderRadius.xl,
    padding: spacing.md, // Reduced from lg
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.accent.terracotta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  panicButtonInner: {
    alignItems: 'center',
    gap: spacing.xs, // Reduced from sm
  },
  panicButtonText: {
    fontSize: fontSize.xl, // Reduced from xxl
    fontWeight: '700',
    color: colors.text.primary,
  },
  panicButtonSubtext: {
    fontSize: fontSize.xs, // Reduced from sm
    color: colors.text.primary,
    opacity: 0.8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  phaseContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  closeButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    padding: spacing.sm,
  },
  phaseTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  phaseSubtitle: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  skipButton: {
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  skipButtonText: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
    textDecorationLine: 'underline',
  },
  communityContent: {
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  communityText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accent.sage,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  connectButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  doneButton: {
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  doneButtonText: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
  },
});

export default CrisisModeScreen;
