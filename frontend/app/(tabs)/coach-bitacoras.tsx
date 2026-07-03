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
import { getClientBitacoras } from '../../services/api';
import { safeDate, groupByPeriod } from '../../utils/date';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PAGE = 14;

interface ClientRow {
    id: string;
    name: string;
    email: string;
    latestDate?: string;
    latestDay?: number;
}

export default function CoachBitacorasScreen() {
    // Level 1 — client list
    const [clients, setClients] = useState<ClientRow[]>([]);
    const [loadingClients, setLoadingClients] = useState(true);

    // Level 2 — one client's timeline
    const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
    const [clientBitacoras, setClientBitacoras] = useState<DailyBitacora[]>([]);
    const [loadingClient, setLoadingClient] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);

    // Detail modal
    const [selected, setSelected] = useState<DailyBitacora | null>(null);
    const [showModal, setShowModal] = useState(false);

    // ── Level 1: clients with their latest bitácora ──────────────────────────
    const fetchClients = async () => {
        try {
            const [{ data: profiles }, { data: recent }] = await Promise.all([
                supabase.from('profiles').select('id, name, email').in('role', ['user', 'premium']),
                supabase.from('bitacoras').select('user_id, date, day_number').order('date', { ascending: false }).limit(500),
            ]);

            // recent is date DESC → the first row seen per user is their latest.
            const latest: Record<string, { date: string; day: number }> = {};
            for (const b of recent ?? []) {
                if (!latest[b.user_id]) latest[b.user_id] = { date: b.date, day: b.day_number };
            }

            const rows: ClientRow[] = (profiles ?? []).map((p) => ({
                id: p.id,
                name: p.name || 'Usuario',
                email: p.email || '',
                latestDate: latest[p.id]?.date,
                latestDay: latest[p.id]?.day,
            }));

            // Clients who logged recently float to the top (newest first); the
            // rest fall to an alphabetical tail.
            rows.sort((a, b) => {
                if (a.latestDate && b.latestDate) return a.latestDate < b.latestDate ? 1 : -1;
                if (a.latestDate) return -1;
                if (b.latestDate) return 1;
                return a.name.localeCompare(b.name);
            });

            setClients(rows);
        } catch (e) {
            console.error('Error fetching clients:', e);
        } finally {
            setLoadingClients(false);
        }
    };

    useEffect(() => {
        fetchClients();
        const interval = setInterval(fetchClients, 30000);
        return () => clearInterval(interval);
    }, []);

    // ── Level 2: one client's paginated timeline ─────────────────────────────
    const openClient = async (c: ClientRow) => {
        setSelectedClient(c);
        setClientBitacoras([]);
        setHasMore(false);
        setLoadingClient(true);
        try {
            const first = await getClientBitacoras(c.id, PAGE);
            setClientBitacoras(first);
            setHasMore(first.length === PAGE);
        } catch (e) {
            console.error('Error loading client bitacoras:', e);
        } finally {
            setLoadingClient(false);
        }
    };

    const loadMoreClient = async () => {
        if (!selectedClient || clientBitacoras.length === 0 || loadingMore) return;
        const before = clientBitacoras[clientBitacoras.length - 1].date;
        setLoadingMore(true);
        try {
            const next = await getClientBitacoras(selectedClient.id, PAGE, before);
            setClientBitacoras((prev) => [...prev, ...next]);
            setHasMore(next.length === PAGE);
        } catch (e) {
            console.error('Error loading more bitacoras:', e);
        } finally {
            setLoadingMore(false);
        }
    };

    const backToClients = () => {
        setSelectedClient(null);
        setClientBitacoras([]);
    };

    const moodColor = (mood?: string) => {
        if (!mood) return colors.text.muted;
        if (mood.includes('irritable') || mood.includes('Muy irritable')) return colors.accent.terracotta;
        if (mood.includes('Cansado')) return colors.accent.gold;
        return colors.accent.sage;
    };

    const initials = (name: string) =>
        name && name !== 'Usuario'
            ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
            : 'U';

    // ── Renders ──────────────────────────────────────────────────────────────
    const renderClientRow = (c: ClientRow) => (
        <TouchableOpacity key={c.id} style={styles.clientRow} onPress={() => openClient(c)}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials(c.name)}</Text></View>
            <View style={{ flex: 1 }}>
                <Text style={styles.clientName} numberOfLines={1}>{c.name}</Text>
                <Text style={styles.clientMeta} numberOfLines={1}>
                    {c.latestDate
                        ? `Última: Día #${c.latestDay} · ${safeDate(c.latestDate) ? format(safeDate(c.latestDate)!, "d 'de' MMM", { locale: es }) : ''}`
                        : 'Sin registros aún'}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
        </TouchableOpacity>
    );

    const renderTimelineCard = (b: DailyBitacora) => (
        <TouchableOpacity key={b.id} style={styles.card} onPress={() => { setSelected(b); setShowModal(true); }}>
            <View style={styles.cardLeft}>
                <Text style={styles.cardDay}>Día #{b.day_number}</Text>
                <Text style={styles.cardDate}>
                    {safeDate(b.date) ? format(safeDate(b.date)!, "d 'de' MMMM", { locale: es }) : ''}
                </Text>
            </View>
            <View style={styles.cardRight}>
                {b.baby_mood && (
                    <View style={[styles.moodBadge, { backgroundColor: moodColor(b.baby_mood) + '33' }]}>
                        <Text style={[styles.moodText, { color: moodColor(b.baby_mood) }]}>{b.baby_mood}</Text>
                    </View>
                )}
                {b.number_of_wakings != null && (
                    <View style={styles.wakingsRow}>
                        <Ionicons name="moon-outline" size={12} color={colors.text.muted} />
                        <Text style={styles.wakingsText}>{b.number_of_wakings} despertares</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {!selectedClient ? (
                // ─── LEVEL 1: client list ───────────────────────────────────
                <>
                    <View style={styles.header}>
                        <Text style={styles.title}>Bitácoras</Text>
                        <Text style={styles.subtitle}>Elige una clienta para ver su historial</Text>
                    </View>

                    {loadingClients ? (
                        <View style={styles.center}><ActivityIndicator color={colors.accent.sage} size="large" /></View>
                    ) : clients.length === 0 ? (
                        <View style={styles.center}>
                            <Ionicons name="journal-outline" size={64} color={colors.text.muted} />
                            <Text style={styles.emptyTitle}>Sin clientas aún</Text>
                            <Text style={styles.emptyText}>Cuando se registren, aparecerán aquí.</Text>
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                            {clients.map(renderClientRow)}
                        </ScrollView>
                    )}
                </>
            ) : (
                // ─── LEVEL 2: one client's timeline ─────────────────────────
                <>
                    <View style={styles.timelineHeader}>
                        <TouchableOpacity style={styles.backBtn} onPress={backToClients} accessibilityRole="button" accessibilityLabel="Volver a clientas">
                            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                        </TouchableOpacity>
                        <View style={styles.timelineTitleWrap}>
                            <Text style={styles.timelineName} numberOfLines={1}>{selectedClient.name}</Text>
                            <Text style={styles.subtitle}>Historial de sueño</Text>
                        </View>
                        <View style={{ width: 40 }} />
                    </View>

                    {loadingClient ? (
                        <View style={styles.center}><ActivityIndicator color={colors.accent.sage} size="large" /></View>
                    ) : clientBitacoras.length === 0 ? (
                        <View style={styles.center}>
                            <Ionicons name="journal-outline" size={64} color={colors.text.muted} />
                            <Text style={styles.emptyTitle}>Sin bitácoras</Text>
                            <Text style={styles.emptyText}>Esta clienta aún no ha registrado ningún día.</Text>
                        </View>
                    ) : (
                        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
                            {groupByPeriod(clientBitacoras).map((group) => (
                                <View key={group.key} style={styles.periodGroup}>
                                    <Text style={styles.periodLabel}>{group.label}</Text>
                                    {group.items.map(renderTimelineCard)}
                                </View>
                            ))}
                            {hasMore && (
                                <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMoreClient} disabled={loadingMore} accessibilityRole="button">
                                    {loadingMore ? (
                                        <ActivityIndicator color={colors.accent.sage} size="small" />
                                    ) : (
                                        <>
                                            <Ionicons name="chevron-down" size={16} color={colors.accent.sage} />
                                            <Text style={styles.loadMoreText}>Cargar más</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            )}
                        </ScrollView>
                    )}
                </>
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
                            <Text style={styles.modalTitle}>{selectedClient?.name} — Día #{selected.day_number}</Text>
                            <View style={{ width: 28 }} />
                        </View>

                        <ScrollView contentContainerStyle={styles.modalContent}>
                            <Text style={styles.modalDate}>
                                {safeDate(selected.date) ? format(safeDate(selected.date)!, "EEEE d 'de' MMMM yyyy", { locale: es }) : ''}
                            </Text>

                            <View style={styles.statsRow}>
                                {selected.number_of_wakings != null && (
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
                                {selected.time_to_fall_asleep_minutes != null && (
                                    <View style={styles.statChip}>
                                        <Ionicons name="time-outline" size={16} color={colors.accent.gold} />
                                        <Text style={styles.statChipText}>{selected.time_to_fall_asleep_minutes} min en dormirse</Text>
                                    </View>
                                )}
                            </View>

                            <Section label="Rutina nocturna">
                                {row('Acostado para dormir', selected.laid_down_for_bed)}
                                {row('Se durmió', selected.fell_asleep_at)}
                                {row('Despertó mañana', selected.morning_wake_time)}
                            </Section>

                            {(selected.nap_1_duration_minutes || selected.nap_2_duration_minutes || selected.nap_3_duration_minutes) && (
                                <Section label="Siestas">
                                    {selected.nap_1_duration_minutes ? row('Siesta 1', `${selected.nap_1_duration_minutes} min`) : null}
                                    {selected.nap_2_duration_minutes ? row('Siesta 2', `${selected.nap_2_duration_minutes} min`) : null}
                                    {selected.nap_3_duration_minutes ? row('Siesta 3', `${selected.nap_3_duration_minutes} min`) : null}
                                </Section>
                            )}

                            {selected.how_baby_ate && (
                                <Section label="Alimentación">
                                    {row('Cómo comió', selected.how_baby_ate)}
                                    {row('Última toma', selected.last_feeding_time)}
                                </Section>
                            )}

                            {selected.notes && (
                                <Section label="Notas">
                                    <Text style={styles.notesText}>{selected.notes}</Text>
                                </Section>
                            )}

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
    emptyText: { fontSize: fontSize.sm, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.xl },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },

    // Client list rows
    clientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        gap: spacing.md,
    },
    avatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.accent.sage,
        alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { fontSize: fontSize.md, fontWeight: '700', color: colors.text.primary },
    clientName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text.primary },
    clientMeta: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: 2 },

    // Timeline header (level 2)
    timelineHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
    },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    timelineTitleWrap: { flex: 1, alignItems: 'center' },
    timelineName: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text.primary },

    // Period groups + timeline cards
    periodGroup: { marginBottom: spacing.md },
    periodLabel: {
        fontSize: fontSize.xs, fontWeight: '700', color: colors.accent.sage,
        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm,
    },
    card: {
        flexDirection: 'row',
        backgroundColor: colors.background.card,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        alignItems: 'center',
    },
    cardLeft: { flex: 1 },
    cardDay: { fontSize: fontSize.md, fontWeight: '700', color: colors.text.primary },
    cardDate: { fontSize: fontSize.xs, color: colors.text.muted, marginTop: 2, textTransform: 'capitalize' },
    cardRight: { alignItems: 'flex-end', gap: 4 },
    moodBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    moodText: { fontSize: fontSize.xs, fontWeight: '600' },
    wakingsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    wakingsText: { fontSize: fontSize.xs, color: colors.text.muted },

    loadMoreBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: spacing.xs, paddingVertical: spacing.md, marginTop: spacing.xs,
    },
    loadMoreText: { color: colors.accent.sage, fontWeight: '600', fontSize: fontSize.sm },

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
