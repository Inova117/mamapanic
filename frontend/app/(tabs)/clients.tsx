import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing } from '../../theme/theme';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

interface Client {
    id: string;
    email: string;
    name: string | null;
    role: string;
    created_at: string;
}

export default function ClientsScreen() {
    const [clients, setClients] = useState<Client[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, name, role, created_at')
                .eq('role', 'user')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching clients:', error);
            } else {
                setClients(data || []);
            }
        } catch (error) {
            console.error('Exception fetching clients:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getInitials = (name: string | null, email: string) => {
        if (name) {
            return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        }
        return email.slice(0, 2).toUpperCase();
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Clientes</Text>
                <Text style={styles.subtitle}>{clients.length} usuarios registrados</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            >
                {isLoading ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>Cargando...</Text>
                    </View>
                ) : clients.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={64} color={colors.text.muted} />
                        <Text style={styles.emptyTitle}>No hay clientes aún</Text>
                        <Text style={styles.emptyText}>
                            Los usuarios aparecerán aquí cuando se registren
                        </Text>
                    </View>
                ) : (
                    clients.map((client) => (
                        <TouchableOpacity
                            key={client.id}
                            style={styles.clientCard}
                            onPress={() => {
                                // TODO: Navigate to client detail with bitácoras
                                console.log('View client:', client.id);
                            }}
                        >
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{getInitials(client.name, client.email)}</Text>
                            </View>

                            <View style={styles.clientInfo}>
                                <Text style={styles.clientName}>{client.name || 'Usuario'}</Text>
                                <Text style={styles.clientEmail}>{client.email}</Text>
                            </View>

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
        backgroundColor: colors.accent.sage,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    avatarText: {
        fontSize: fontSize.md,
        fontWeight: '600',
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
});
