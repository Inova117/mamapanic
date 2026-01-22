import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../theme/theme';
import { useAppStore } from '../store/useAppStore';
import { getCommunityPresence } from '../services/api';

export const CommunityBar: React.FC = () => {
  const { communityPresence, setCommunityPresence } = useAppStore();

  useEffect(() => {
    const fetchPresence = async () => {
      try {
        const presence = await getCommunityPresence();
        setCommunityPresence(presence);
      } catch (error) {
        // Fallback data
        setCommunityPresence({
          online_count: 42,
          sample_names: ['Ana', 'María', 'Carmen'],
          message: 'Ana y 41 mamás más están despiertas contigo ahora mismo.',
        });
      }
    };

    fetchPresence();
    
    // Refresh every 2 minutes
    const interval = setInterval(fetchPresence, 120000);
    return () => clearInterval(interval);
  }, []);

  if (!communityPresence) return null;

  return (
    <View style={styles.container}>
      <View style={styles.dot} />
      <Ionicons name="people" size={16} color={colors.accent.sage} />
      <Text style={styles.text}>{communityPresence.message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent.sage,
  },
  text: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    flex: 1,
  },
});

export default CommunityBar;
