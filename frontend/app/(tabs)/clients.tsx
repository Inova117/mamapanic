import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../theme/theme';
import { useRouter } from 'expo-router';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Client {
    user_id: string;
    user_name: string;
    user_email: string;
    user_picture?: string;
    last_message?: string;
    last_message_at?: string;
    unread_count: number;
}

export default function ClientsScreen() {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const getAuthHeaders = async () => {
        const token = Platform.OS === 'web'
            ? localStorage.getItem('session_token')
            : null;
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const fetchClients = async () => {
        setIsLoading(true);
        try {
            const headers = await getAuthHeaders();
            const response = await axios.get(`${API_URL}/api/coach/clients`, { headers });
            setClients(response.data);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
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
                            {client.user_picture ? (
                                <Image source={{ uri: client.user_picture }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>{getInitials(client.user_name, client.user_email)}</Text>
                                </View>
                            )}

                            <View style={styles.clientInfo}>
                                <Text style={styles.clientName}>{client.user_name || 'Usuario'}</Text>
                                {client.last_message ? (
                                    <Text style={styles.lastMessage} numberOfLines={1}>{client.last_message}</Text>
                                ) : (
                                    <Text style={styles.clientEmail} numberOfLines={1}>{client.user_email}</Text>
                                )}
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
    scrollView: {
        flex: 1,
    },
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
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        marginRight: spacing.md,
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
    clientInfo: {
        flex: 1,
    },
    clientName: {
        fontSize: fontSize.md,
        fontWeight: '600',
        color: colors.text.primary,
    },
    clientEmail: {
        fontSize: fontSize.sm,
        color: colors.text.secondary,
        marginTop: 2,
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
