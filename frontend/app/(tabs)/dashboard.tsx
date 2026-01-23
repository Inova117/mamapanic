import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../theme/theme';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

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

interface Bitacora {
  id: string;
  day_number: number;
  date: string;
  number_of_wakings?: number;
  baby_mood?: string;
  ai_summary?: string;
  created_at: string;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientBitacoras, setClientBitacoras] = useState<Bitacora[]>([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [loadingBitacoras, setLoadingBitacoras] = useState(false);

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

  const fetchClientBitacoras = async (userId: string) => {
    setLoadingBitacoras(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_URL}/api/coach/client/${userId}/bitacoras`, { headers });
      setClientBitacoras(response.data);
    } catch (error) {
      console.error('Error fetching bitacoras:', error);
    } finally {
      setLoadingBitacoras(false);
    }
  };

  const togglePremium = async (userId: string, currentRole: string) => {
    try {
      const headers = await getAuthHeaders();
      const newRole = currentRole === 'premium' ? 'user' : 'premium';
      await axios.put(
        `${API_URL}/api/coach/client/${userId}/role`,
        { role: newRole },
        { headers }
      );
      fetchClients();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  useEffect(() => {
    if (userRole === 'coach') {
      fetchClients();
    }
  }, [userRole]);

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setShowClientModal(true);
    fetchClientBitacoras(client.user_id);
  };

  if (userRole !== 'coach') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={64} color={colors.text.muted} />
          <Text style={styles.accessDeniedText}>Acceso solo para coach</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Dashboard Coach</Text>
          <Text style={styles.subtitle}>{clients.length} clientes registradas</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color={colors.accent.sage} />
            <Text style={styles.statNumber}>{clients.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="star" size={24} color={colors.accent.gold} />
            <Text style={styles.statNumber}>
              {clients.filter(c => c.last_message).length}
            </Text>
            <Text style={styles.statLabel}>Activas</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="mail-unread" size={24} color={colors.accent.terracotta} />
            <Text style={styles.statNumber}>
              {clients.reduce((acc, c) => acc + c.unread_count, 0)}
            </Text>
            <Text style={styles.statLabel}>Sin leer</Text>
          </View>
        </View>

        {/* Clients List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clientes</Text>

          {isLoading ? (
            <ActivityIndicator color={colors.accent.sage} size="large" />
          ) : clients.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.text.muted} />
              <Text style={styles.emptyText}>No hay clientes registradas aún</Text>
            </View>
          ) : (
            clients.map((client) => (
              <TouchableOpacity
                key={client.user_id}
                style={styles.clientCard}
                onPress={() => handleSelectClient(client)}
              >
                {client.user_picture ? (
                  <Image source={{ uri: client.user_picture }} style={styles.clientAvatar} />
                ) : (
                  <View style={styles.clientAvatarPlaceholder}>
                    <Ionicons name="person" size={24} color={colors.text.muted} />
                  </View>
                )}
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>{client.user_name}</Text>
                  <Text style={styles.clientEmail}>{client.user_email}</Text>
                  {client.last_message && (
                    <Text style={styles.lastMessage} numberOfLines={1}>
                      {client.last_message}
                    </Text>
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
        </View>
      </ScrollView>

      {/* Client Detail Modal */}
      <Modal
        visible={showClientModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowClientModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowClientModal(false)}>
              <Ionicons name="close" size={28} color={colors.text.secondary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedClient?.user_name}</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Client Info */}
            <View style={styles.modalClientInfo}>
              {selectedClient?.user_picture ? (
                <Image source={{ uri: selectedClient.user_picture }} style={styles.modalAvatar} />
              ) : (
                <View style={styles.modalAvatarPlaceholder}>
                  <Ionicons name="person" size={40} color={colors.text.muted} />
                </View>
              )}
              <Text style={styles.modalClientName}>{selectedClient?.user_name}</Text>
              <Text style={styles.modalClientEmail}>{selectedClient?.user_email}</Text>
            </View>

            {/* Bitácoras */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Bitácoras recientes</Text>

              {loadingBitacoras ? (
                <ActivityIndicator color={colors.accent.sage} />
              ) : clientBitacoras.length === 0 ? (
                <Text style={styles.noBitacoras}>No hay bitácoras registradas</Text>
              ) : (
                clientBitacoras.map((bitacora) => (
                  <View key={bitacora.id} style={styles.bitacoraCard}>
                    <View style={styles.bitacoraHeader}>
                      <Text style={styles.bitacoraDay}>Día #{bitacora.day_number}</Text>
                      <Text style={styles.bitacoraDate}>
                        {format(new Date(bitacora.date), "d 'de' MMMM", { locale: es })}
                      </Text>
                    </View>
                    <View style={styles.bitacoraStats}>
                      {bitacora.number_of_wakings !== undefined && (
                        <View style={styles.bitacoraStat}>
                          <Ionicons name="moon" size={16} color={colors.accent.terracotta} />
                          <Text style={styles.bitacoraStatText}>
                            {bitacora.number_of_wakings} despertares
                          </Text>
                        </View>
                      )}
                      {bitacora.baby_mood && (
                        <View style={styles.bitacoraStat}>
                          <Ionicons name="happy" size={16} color={colors.accent.sage} />
                          <Text style={styles.bitacoraStatText}>{bitacora.baby_mood}</Text>
                        </View>
                      )}
                    </View>
                    {bitacora.ai_summary && (
                      <Text style={styles.bitacoraSummary}>{bitacora.ai_summary}</Text>
                    )}
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    fontSize: fontSize.md,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },
  section: {
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.text.muted,
    marginTop: spacing.md,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  clientAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  clientName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  clientEmail: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
  },
  lastMessage: {
    fontSize: fontSize.xs,
    color: colors.text.muted,
    marginTop: spacing.xs,
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
  accessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessDeniedText: {
    fontSize: fontSize.lg,
    color: colors.text.muted,
    marginTop: spacing.md,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.card,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalContent: {
    flex: 1,
  },
  modalClientInfo: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.card,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  modalAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalClientName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  modalClientEmail: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  modalSection: {
    padding: spacing.lg,
  },
  modalSectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  noBitacoras: {
    fontSize: fontSize.md,
    color: colors.text.muted,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  bitacoraCard: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  bitacoraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  bitacoraDay: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  bitacoraDate: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
  },
  bitacoraStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  bitacoraStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  bitacoraStatText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  bitacoraSummary: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    fontStyle: 'italic',
    lineHeight: 20,
    borderTopWidth: 1,
    borderTopColor: colors.background.elevated,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
});
