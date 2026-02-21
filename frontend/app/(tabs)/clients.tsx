import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing } from '../../theme/theme';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

interface Client {
    user_id: string;
    user_name: string;
    user_email: string;
    last_message: string;
    last_message_at: string;
    unread_count: number;
}

export default function ClientsScreen() {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const fetchClients = async () => {
        setIsLoading(true);
        try {
            // 1. Get the current coach session
            const { data: { session } } = await supabase.auth.getSession();
            const coachId = session?.user?.id;
            if (!coachId) {
                setClients([]);
                return;
            }

            // 2. Fetch all registered users
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('id, name, email')
                .eq('role', 'user');

            if (profileError || !profiles) {
                console.error('Error fetching profiles:', profileError);
                setClients([]);
                return;
            }

            // 3. Fetch all messages where the coach is involved
            const { data: messages, error } = await supabase
                .from('direct_messages')
                .select('sender_id, receiver_id, content, created_at, read')
                .or(`sender_id.eq.${coachId},receiver_id.eq.${coachId}`)
                .order('created_at', { ascending: false });

            const conversationMap: Record<string, { last_message: string; last_message_at: string; unread_count: number }> = {};

            if (messages) {
                for (const msg of messages) {
                    const otherId = msg.sender_id === coachId ? msg.receiver_id : msg.sender_id;
                    conversationMap[otherId] = conversationMap[otherId] ?? {
                        last_message: msg.content,
                        last_message_at: msg.created_at,
                        unread_count: 0,
                    };
                    if (msg.sender_id !== coachId && !msg.read) {
                        conversationMap[otherId].unread_count += 1;
                    }
                }
            }

            // 4. Merge into Client objects, those with messages move to top
            const result: Client[] = profiles.map((p) => ({
                user_id: p.id,
                user_name: p.name || 'Usuario',
                user_email: p.email || '',
                last_message: conversationMap[p.id]?.last_message ?? '',
                last_message_at: conversationMap[p.id]?.last_message_at ?? '',
                unread_count: conversationMap[p.id]?.unread_count ?? 0,
            }));

            // Sort: Active conversations first (by most recent), then alphabetical for the rest
            result.sort((a, b) => {
                if (a.last_message_at && b.last_message_at) {
                    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
                }
                if (a.last_message_at) return -1;
                if (b.last_message_at) return 1;
                return a.user_name.localeCompare(b.user_name);
            });

            setClients(result);
        } catch (e) {
            console.error('Exception in fetchClients:', e);
            setClients([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();

        // Poll every 10s for new conversations
        const interval = setInterval(fetchClients, 10000);
        return () => clearInterval(interval);
    }, []);

    const getInitials = (name: string, email: string) => {
        if (name && name !== 'Usuario') {
            return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        return email ? email.slice(0, 2).toUpperCase() : 'U';
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Conversaciones</Text>
                <Text style={styles.subtitle}>{clients.length} clientes activos</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            >
                {isLoading ? (
                    <View style={styles.emptyState}>
                        <ActivityIndicator color={colors.accent.sage} size="large" />
                    </View>
                ) : clients.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="chatbubbles-outline" size={64} color={colors.text.muted} />
                        <Text style={styles.emptyTitle}>No hay mensajes aún</Text>
                        <Text style={styles.emptyText}>
                            Cuando las mamás te envíen un mensaje, aparecerán aquí.
                        </Text>
                    </View>
                ) : (
                    clients.map((client) => (
                        <TouchableOpacity
                            key={client.user_id}
                            style={styles.clientCard}
                            onPress={() => router.push(`/messages/${client.user_id}` as any)}
                        >
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>{getInitials(client.user_name, client.user_email)}</Text>
                            </View>

                            <View style={styles.clientInfo}>
                                <Text style={styles.clientName}>{client.user_name}</Text>
                                <Text style={styles.lastMessage} numberOfLines={1}>
                                    {client.last_message || client.user_email}
                                </Text>
                            </View>

                            {client.unread_count > 0 && (
                                <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadText}>{client.unread_count}</Text>
                                </View>
                            )}
                            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
                        </TouchableOpacity>
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background.primary,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    title: {
        fontSize: fontSize.xxl,
        fontWeight: '700',
        color: colors.text.primary,
    },
    subtitle: {
        fontSize: fontSize.sm,
        color: colors.text.secondary,
        marginTop: spacing.xs,
    },
    scrollView: { flex: 1 },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: 100,
    },
    clientCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background.card,
        borderRadius: 12,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    avatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.accent.sage,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    avatarText: {
        fontSize: fontSize.md,
        fontWeight: '700',
        color: colors.text.primary,
    },
    clientInfo: { flex: 1 },
    clientName: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text.primary,
    },
    lastMessage: {
        fontSize: fontSize.sm,
        color: colors.text.secondary,
        marginTop: 2,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text.primary,
        marginTop: spacing.md,
    },
    emptyText: {
        fontSize: fontSize.sm,
        color: colors.text.secondary,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    unreadBadge: {
        backgroundColor: colors.accent.terracotta,
        borderRadius: 12,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        marginRight: spacing.sm,
    },
    unreadText: {
        fontSize: fontSize.xs,
        color: colors.text.primary,
        fontWeight: '600',
    },
});
