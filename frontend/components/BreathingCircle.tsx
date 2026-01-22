import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { colors, fontSize, spacing } from '../theme/theme';

interface BreathingCircleProps {
  onComplete?: () => void;
  cycles?: number;
}

type BreathPhase = 'inhale' | 'hold' | 'exhale';

const PHASE_DURATIONS = {
  inhale: 4000,  // 4 seconds
  hold: 7000,    // 7 seconds
  exhale: 8000,  // 8 seconds
};

const PHASE_LABELS = {
  inhale: 'INHALA',
  hold: 'SOSTÉN',
  exhale: 'EXHALA',
};

const PHASE_COLORS = {
  inhale: colors.breathing.inhale,
  hold: colors.breathing.hold,
  exhale: colors.breathing.exhale,
};

export const BreathingCircle: React.FC<BreathingCircleProps> = ({ 
  onComplete, 
  cycles = 3 
}) => {
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [cycle, setCycle] = useState(1);
  const [countdown, setCountdown] = useState(4);
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;
    let phaseTimeout: NodeJS.Timeout;

    const runPhase = (currentPhase: BreathPhase) => {
      const duration = PHASE_DURATIONS[currentPhase];
      const seconds = Math.floor(duration / 1000);
      setCountdown(seconds);

      // Animate the circle
      if (currentPhase === 'inhale') {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();
      } else if (currentPhase === 'exhale') {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.5,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.6,
            duration: duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]).start();
      }

      // Countdown timer
      countdownInterval = setInterval(() => {
        setCountdown((prev) => Math.max(0, prev - 1));
      }, 1000);

      // Move to next phase
      phaseTimeout = setTimeout(() => {
        clearInterval(countdownInterval);
        
        if (currentPhase === 'inhale') {
          setPhase('hold');
        } else if (currentPhase === 'hold') {
          setPhase('exhale');
        } else {
          // End of exhale - check if more cycles
          if (cycle < cycles) {
            setCycle((prev) => prev + 1);
            setPhase('inhale');
          } else {
            onComplete?.();
          }
        }
      }, duration);
    };

    runPhase(phase);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(phaseTimeout);
    };
  }, [phase, cycle]);

  const currentColor = PHASE_COLORS[phase];

  return (
    <View style={styles.container}>
      <Text style={styles.cycleText}>
        Ciclo {cycle} de {cycles}
      </Text>
      
      <View style={styles.circleContainer}>
        <Animated.View
          style={[
            styles.circle,
            {
              backgroundColor: currentColor,
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Text style={styles.countdownText}>{countdown}</Text>
        </Animated.View>
        
        {/* Outer ring */}
        <View style={[styles.outerRing, { borderColor: currentColor }]} />
      </View>
      
      <Text style={[styles.phaseText, { color: currentColor }]}>
        {PHASE_LABELS[phase]}
      </Text>
      
      <Text style={styles.instructionText}>
        {phase === 'inhale' && 'Respira profundamente por la nariz'}
        {phase === 'hold' && 'Mantén el aire en tus pulmones'}
        {phase === 'exhale' && 'Suelta el aire lentamente por la boca'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  cycleText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  circleContainer: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xl,
  },
  circle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    opacity: 0.3,
  },
  countdownText: {
    fontSize: fontSize.hero,
    fontWeight: '700',
    color: colors.text.primary,
  },
  phaseText: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  instructionText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
  },
});

export default BreathingCircle;
