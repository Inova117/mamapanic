import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSize, spacing } from '../../theme/theme';
import { useAuth } from '../../contexts/AuthContext';

export default function TabLayout() {
  const { user, userRole } = useAuth();
  const isCoach = userRole === 'coach';
  const insets = useSafeAreaInsets();

  // Debug logging
  useEffect(() => {
    console.log('📱 TabLayout - userRole:', userRole, '| isCoach:', isCoach);
  }, [userRole, isCoach]);

  // Calculate proper bottom padding for the tab bar
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 40 : 0);
  const tabBarHeight = 70 + bottomPadding;

  const tabBarOptions = {
    headerShown: false,
    tabBarStyle: {
      backgroundColor: colors.background.secondary,
      borderTopColor: colors.background.card,
      borderTopWidth: 1,
      height: tabBarHeight,
      paddingBottom: bottomPadding,
      paddingTop: spacing.xs,
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      elevation: 8,
    },
    tabBarActiveTintColor: colors.accent.gold,
    tabBarInactiveTintColor: colors.text.muted,
    tabBarLabelStyle: {
      fontSize: fontSize.xs,
      fontWeight: '600' as const,
      marginBottom: Platform.OS === 'android' ? 4 : 0,
    },
    tabBarIconStyle: {
      marginTop: Platform.OS === 'android' ? 4 : 0,
    },
    sceneStyle: {
      backgroundColor: colors.background.primary,
    },
  };

  // COACH LAYOUT
  if (isCoach) {
    return (
      <Tabs screenOptions={tabBarOptions}>
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Panel',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stats-chart" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="coach-ai"
          options={{
            title: 'Coach AI',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="flask" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="clients"
          options={{
            title: 'Clientes',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />

        {/* Hide user screens from coaches */}
        <Tabs.Screen name="index" options={{ href: null }} />
        <Tabs.Screen name="chat" options={{ href: null }} />
        <Tabs.Screen name="bitacora" options={{ href: null }} />
        <Tabs.Screen name="messages" options={{ href: null }} />
        <Tabs.Screen name="analytics" options={{ href: null }} />
      </Tabs>
    );
  }

  // USER LAYOUT (Default)
  return (
    <Tabs screenOptions={tabBarOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Abuela',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-ellipses" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bitacora"
        options={{
          title: 'Bitácora',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="journal" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Coach',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mail" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />

      {/* Hidden Utility/Coach Screens */}
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="clients" options={{ href: null }} />
      <Tabs.Screen name="coach-ai" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  // Add any needed styles here if necessary (currently relying on inline or theme)
});
