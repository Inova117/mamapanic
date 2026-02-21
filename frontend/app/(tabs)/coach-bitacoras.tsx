import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../theme/theme';
import { supabase } from '../../lib/supabase';
import { DailyBitacora } from '../../types';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface BitacoraWithOwner extends DailyBitacora {
    user_name: string;
    user_email: string;
}

export default function CoachBitacorasScreen() {
    const [bitacoras, setBitacoras] = useState<BitacoraWithOwner[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selected, setSelected] = useState<BitacoraWithOwner | null>(null);
    const [showModal, setShowModal] = useState(false);

    const fetchBitacoras = async () => {
        try {
            // Fetch last 50 bitácoras from all users
            const { data: bData, error: bErr } = await supabase
                .from('bitacoras')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (bErr || !bData) {
                console.error('Error fetching bitacoras:', bErr);
                setBitacoras([]);
                return;
            }

            // Get unique user IDs
            const userIds = [...new Set(bData.map((b) => b.user_id))];
            if (userIds.length === 0) { setBitacoras([]); return; }

            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, name, email')
                .in('id', userIds);

            const profileMap: Record<string, { name: string; email: string }> = {};
            for (const p of profiles ?? []) {
                profileMap[p.id] = { name: p.name || 'Usuario', email: p.email || '' };
            }

            const merged: BitacoraWithOwner[] = bData.map((b) => ({
                ...b,
                user_name: profileMap[b.user_id]?.name ?? 'Usuario',
                user_email: profileMap[b.user_id]?.email ?? '',
            }));

            setBitacoras(merged);
        } catch (e) {
            console.error('Exception in fetchBitacoras:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBitacoras();
        const interval = setInterval(fetchBitacoras, 30000);
        return () => clearInterval(interval);
    }, []);

    const moodColor = (mood?: string) => {
        if (!mood) return colors.text.muted;
        if (mood.includes('irritable') || mood.includes('Muy irritable')) return colors.accent.terracotta;
        if (mood.includes('Cansado')) return colors.accent.gold;
        return colors.accent.sage;
    };

    const renderRow = (b: BitacoraWithOwner) => (
        <TouchableOpacity
            key={b.id}
            style={styles.card}
            onPress={() => { setSelected(b); setShowModal(true); }}
        >
            <View style={styles.cardLeft}>
                <Text style={styles.cardDay}>Día #{b.day_number}</Text>
                <Text style={styles.cardDate}>
                    {format(new Date(b.date), "d 'de' MMMM", { locale: es })}
                </Text>
            </View>

            <View style={styles.cardCenter}>
                <Text style={styles.cardUser} numberOfLines={1}>{b.user_name}</Text>
                {b.baby_mood && (
                    <View style={[styles.moodBadge, { backgroundColor: moodColor(b.baby_mood) + '33' }]}>
                        <Text style={[styles.moodText, { color: moodColor(b.baby_mood) }]}>{b.baby_mood}</Text>
                    </View>
                )}
            </View>

            <View style={styles.cardRight}>
                <Text style={styles.timeAgo}>
                    {formatDistanceToNow(new Date(b.created_at), { addSuffix: true, locale: es })}
                </Text>
                {b.number_of_wakings !== undefined && (
                    <View style={styles.wakingsRow}>
                        <Ionicons name="moon-outline" size={12} color={colors.text.muted} />
                        <Text style={styles.wakingsText}>{b.number_of_wakings}x</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Bitácoras</Text>
                <Text style={styles.subtitle}>Registros diarios de clientes</Text>
            </View>

            {isLoading ? (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.accent.sage} size="large" />
                </View>
            ) : bitacoras.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="journal-outline" size={64} color={colors.text.muted} />
                    <Text style={styles.emptyTitle}>Sin bitácoras aún</Text>
                    <Text style={styles.emptyText}>Los registros de tus clientes aparecerán aquí.</Text>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                >
                    {bitacoras.map(renderRow)}
                </ScrollView>
            )}

            {/* Detail Modal */}
            <Modal
                visible={showModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowModal(false)}
            >
                {selected && (
                    <SafeAreaView style={styles.modal}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Ionicons name="close" size={28} color={colors.text.secondary} />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>{selected.user_name} — Día #{selected.day_number}</Text>
                            <View style={{ width: 28 }} />
                        </View>

                        <ScrollView contentContainerStyle={styles.modalContent}>
                            <Text style={styles.modalDate}>
                                {format(new Date(selected.date), "EEEE d 'de' MMMM yyyy", { locale: es })}
                            </Text>

                            {/* Stats row */}
                            <View style={styles.statsRow}>
                                {selected.number_of_wakings !== undefined && (
                                    <View style={styles.statChip}>
                                        <Ionicons name="moon" size={16} color={colors.accent.terracotta} />
                                        <Text style={styles.statChipText}>{selected.number_of_wakings} despertares</Text>
                                    </View>
                                )}
                                {selected.baby_mood && (
                                    <View style={styles.statChip}>
                                        <Ionicons name="happy-outline" size={16} color={colors.accent.sage} />
                                        <Text style={styles.statChipText}>{selected.baby_mood}</Text>
                                    </View>
                                )}
                                {selected.time_to_fall_asleep_minutes !== undefined && (
                                    <View style={styles.statChip}>
                                        <Ionicons name="time-outline" size={16} color={colors.accent.gold} />
                                        <Text style={styles.statChipText}>{selected.time_to_fall_asleep_minutes} min en dormirse</Text>
                                    </View>
                                )}
                            </View>

                            {/* Sleep schedule */}
                            <Section label="Rutina nocturna">
                                {row('Acostado para dormir', selected.laid_down_for_bed)}
                                {row('Se durmió', selected.fell_asleep_at)}
                                {row('Despertó mañana', selected.morning_wake_time)}
                            </Section>

                            {/* Naps */}
                            {(selected.nap_1 || selected.nap_2 || selected.nap_3) && (
                                <Section label="Siestas">
                                    {selected.nap_1?.duration_minutes && row('Siesta 1', `${selected.nap_1.duration_minutes} min`)}
                                    {selected.nap_2?.duration_minutes && row('Siesta 2', `${selected.nap_2.duration_minutes} min`)}
                                    {selected.nap_3?.duration_minutes && row('Siesta 3', `${selected.nap_3.duration_minutes} min`)}
                                </Section>
                            )}

                            {/* Feeding */}
                            {selected.how_baby_ate && (
                                <Section label="Alimentación">
                                    {row('Cómo comió', selected.how_baby_ate)}
                                    {row('Última toma', selected.last_feeding_time)}
                                </Section>
                            )}

                            {/* Notes */}
                            {selected.notes && (
                                <Section label="Notas">
                                    <Text style={styles.notesText}>{selected.notes}</Text>
                                </Section>
                            )}

                            {/* AI Summary */}
                            {selected.ai_summary && (
                                <View style={styles.aiBox}>
                                    <View style={styles.aiHeader}>
                                        <Ionicons name="flask" size={16} color={colors.accent.sage} />
                                        <Text style={styles.aiLabel}>Resumen IA</Text>
                                    </View>
                                    <Text style={styles.aiText}>{selected.ai_summary}</Text>
                                </View>
                            )}
                        </ScrollView>
                    </SafeAreaView>
                )}
            </Modal>
        </SafeAreaView>
    );
}

// ─── Helper sub-components ────────────────────────────────────────────────────
function Section({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionLabel}>{label}</Text>
            {children}
        </View>
    );
}

function row(label: string, value?: string | null) {
    if (!value) return null;
    return (
        <View key={label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.primary },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    title: { fontSize: fontSize.xxl, fontWeight: '700', color: colors.text.primary },
    subtitle: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing.xs },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text.primary, marginTop: spacing.md },
    emptyText: { fontSize: fontSize.sm, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm },
    list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },

    // Card
    card: {
        flexDirection: 'row',
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        alignItems: 'center',
    },
    cardLeft: { marginRight: spacing.md, minWidth: 60 },
    cardDay: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text.primary },
    cardDate: { fontSize: fontSize.xs, color: colors.text.muted, marginTop: 2 },
    cardCenter: { flex: 1 },
    cardUser: { fontSize: fontSize.md, fontWeight: '600', color: colors.text.primary },
    moodBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
    moodText: { fontSize: fontSize.xs, fontWeight: '600' },
    cardRight: { alignItems: 'flex-end', marginLeft: spacing.sm },
    timeAgo: { fontSize: fontSize.xs, color: colors.text.muted },
    wakingsRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
    wakingsText: { fontSize: fontSize.xs, color: colors.text.muted },

    // Modal
    modal: { flex: 1, backgroundColor: colors.background.primary },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.background.elevated,
    },
    modalTitle: { fontSize: fontSize.md, fontWeight: '600', color: colors.text.primary, flex: 1, textAlign: 'center' },
    modalContent: { padding: spacing.lg, paddingBottom: 60 },
    modalDate: { fontSize: fontSize.md, color: colors.text.secondary, marginBottom: spacing.md, textTransform: 'capitalize' },

    statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
    statChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.background.card,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    statChipText: { fontSize: fontSize.sm, color: colors.text.secondary },

    section: { marginBottom: spacing.lg },
    sectionLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.accent.sage, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.background.elevated },
    detailLabel: { fontSize: fontSize.sm, color: colors.text.secondary },
    detailValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text.primary },
    notesText: { fontSize: fontSize.md, color: colors.text.secondary, lineHeight: 22 },

    aiBox: { backgroundColor: colors.background.card, borderRadius: borderRadius.md, padding: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.accent.sage },
    aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
    aiLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.accent.sage },
    aiText: { fontSize: fontSize.sm, color: colors.text.secondary, lineHeight: 20 },
});
