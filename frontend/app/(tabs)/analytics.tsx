import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing } from '../../theme/theme';

export default function AnalyticsScreen() {
    // TODO: Fetch real analytics data from Supabase
    const stats = {
        totalUsers: 0,
        activeToday: 0,
        bitacorasThisWeek: 0,
        avgSleepHours: 0,
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Dashboard</Text>
                    <Text style={styles.subtitle}>Vista general de analytics</Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Ionicons name="people" size={32} color={colors.accent.sage} />
                        <Text style={styles.statNumber}>{stats.totalUsers}</Text>
                        <Text style={styles.statLabel}>Total Usuarios</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Ionicons name="pulse" size={32} color={colors.accent.gold} />
                        <Text style={styles.statNumber}>{stats.activeToday}</Text>
                        <Text style={styles.statLabel}>Activos Hoy</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Ionicons name="book" size={32} color={colors.accent.terracotta} />
                        <Text style={styles.statNumber}>{stats.bitacorasThisWeek}</Text>
                        <Text style={styles.statLabel}>Bitácoras (7d)</Text>
                    </View>

                    <View style={styles.statCard}>
                        <Ionicons name="moon" size={32} color={colors.accent.sageLight} />
                        <Text style={styles.statNumber}>{stats.avgSleepHours.toFixed(1)}h</Text>
                        <Text style={styles.statLabel}>Promedio Sueño</Text>
                    </View>
                </View>

                {/* Coming Soon */}
                <View style={styles.comingSoon}>
                    <Ionicons name="bar-chart" size={48} color={colors.text.muted} />
                    <Text style={styles.comingSoonTitle}>Analytics Detallados</Text>
                    <Text style={styles.comingSoonText}>
                        Gráficos, tendencias y reportes estarán disponibles pronto.
                    </Text>
                </View>
            </ScrollView>
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
    content: {
        paddingHorizontal: spacing.lg,
        paddingBottom: 100,
    },
    header: {
        paddingVertical: spacing.lg,
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
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
        marginBottom: spacing.xl,
    },
    statCard: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: colors.background.card,
        borderRadius: 16,
        padding: spacing.lg,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: fontSize.xxl,
        fontWeight: '700',
        color: colors.text.primary,
        marginTop: spacing.sm,
    },
    statLabel: {
        fontSize: fontSize.sm,
        color: colors.text.secondary,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    comingSoon: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    comingSoonTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text.primary,
        marginTop: spacing.md,
    },
    comingSoonText: {
        fontSize: fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
});
