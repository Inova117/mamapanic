import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { colors, fontSize, spacing, borderRadius } from '../../theme/theme';
import { useAuth } from '../../contexts/AuthContext';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function ProfileScreen() {
  const { user, isAuthenticated, login, logout, refreshUser } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('21:00');

  useEffect(() => {
    checkNotificationPermissions();
  }, []);

  const checkNotificationPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setNotificationsEnabled(status === 'granted');
  };

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status === 'granted') {
        setNotificationsEnabled(true);
        await scheduleReminder();
        Alert.alert('Recordatorios activados', 'Te recordaremos llenar tu bitácora cada noche.');
      } else {
        Alert.alert('Permisos necesarios', 'Por favor habilita las notificaciones en la configuración de tu dispositivo.');
      }
    } else {
      await Notifications.cancelAllScheduledNotificationsAsync();
      setNotificationsEnabled(false);
    }
  };

  const scheduleReminder = async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const [hours, minutes] = reminderTime.split(':').map(Number);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Hora de tu bitácora 🌙',
        body: '¿Cómo fue el día de hoy? Registra el sueño de tu bebé.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: hours,
        minute: minutes,
      },
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás segura de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cerrar sesión', onPress: logout, style: 'destructive' },
      ]
    );
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'coach':
        return { label: 'Coach', color: colors.accent.terracotta };
      case 'premium':
        return { label: 'Premium', color: colors.accent.gold };
      default:
        return { label: 'Usuario', color: colors.text.muted };
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.loginContainer}>
          <View style={styles.logoContainer}>
            <Ionicons name="heart" size={64} color={colors.accent.terracotta} />
            <Text style={styles.logoText}>MAMÁ RESPIRA</Text>
          </View>

          <Text style={styles.welcomeTitle}>Bienvenida</Text>
          <Text style={styles.welcomeText}>
            Inicia sesión para guardar tu progreso, comunicarte con tu coach y recibir recordatorios.
          </Text>

          <TouchableOpacity style={styles.googleButton} onPress={login}>
            <Ionicons name="logo-google" size={24} color={colors.text.primary} />
            <Text style={styles.googleButtonText}>Continuar con Google</Text>
          </TouchableOpacity>

          <Text style={styles.disclaimer}>
            Al iniciar sesión, aceptas nuestros términos de servicio y política de privacidad.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const roleBadge = getRoleBadge(user?.role || 'user');

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Mi Perfil</Text>
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          {user?.picture ? (
            <Image source={{ uri: user.picture }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color={colors.text.muted} />
            </View>
          )}
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleBadge.color }]}>
            <Text style={styles.roleText}>{roleBadge.label}</Text>
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recordatorios</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications" size={24} color={colors.accent.gold} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Recordatorio diario</Text>
                <Text style={styles.settingDescription}>
                  Te recordamos llenar la bitácora cada noche
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: colors.background.elevated, true: colors.accent.sage }}
              thumbColor={colors.text.primary}
            />
          </View>

          {notificationsEnabled && (
            <View style={styles.timeSelector}>
              <Ionicons name="time" size={20} color={colors.text.secondary} />
              <Text style={styles.timeText}>Hora del recordatorio: {reminderTime}</Text>
            </View>
          )}
        </View>

        {/* Premium Section */}
        {user?.role === 'user' && (
          <View style={styles.premiumCard}>
            <Ionicons name="star" size={32} color={colors.accent.gold} />
            <Text style={styles.premiumTitle}>Actualiza a Premium</Text>
            <Text style={styles.premiumDescription}>
              Comunícate directamente con tu coach de sueño y recibe atención personalizada.
            </Text>
            <TouchableOpacity style={styles.premiumButton}>
              <Text style={styles.premiumButtonText}>Ver planes</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cuenta</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={24} color={colors.text.secondary} />
            <Text style={styles.menuItemText}>Ayuda y soporte</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="document-text-outline" size={24} color={colors.text.secondary} />
            <Text style={styles.menuItemText}>Términos y condiciones</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="shield-outline" size={24} color={colors.text.secondary} />
            <Text style={styles.menuItemText}>Política de privacidad</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color={colors.accent.terracotta} />
            <Text style={[styles.menuItemText, { color: colors.accent.terracotta }]}>
              Cerrar sesión
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>MAMÁ RESPIRA v1.0.0</Text>
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
  userCard: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: spacing.md,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.background.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  userName: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  roleBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  roleText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.text.primary,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  settingLabel: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  timeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  timeText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  premiumCard: {
    alignItems: 'center',
    backgroundColor: colors.background.card,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.accent.gold,
  },
  premiumTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.accent.gold,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  premiumDescription: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  premiumButton: {
    backgroundColor: colors.accent.gold,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  premiumButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  menuItemText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text.primary,
  },
  logoutItem: {
    marginTop: spacing.md,
  },
  version: {
    fontSize: fontSize.xs,
    color: colors.text.muted,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  loginContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  welcomeTitle: {
    fontSize: fontSize.xxl,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  welcomeText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accent.sage,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
  },
  googleButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  disclaimer: {
    fontSize: fontSize.xs,
    color: colors.text.muted,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
