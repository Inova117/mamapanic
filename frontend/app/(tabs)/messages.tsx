import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../theme/theme';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export default function MessagesScreen() {
  const { user, isAuthenticated, login } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [coachName, setCoachName] = useState<string>('Coach');
  const scrollViewRef = useRef<ScrollView>(null);

  const getAuthHeaders = async () => {
    const token = Platform.OS === 'web'
      ? localStorage.getItem('session_token')
      : null; // SecureStore for mobile
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchCoachId = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(`${API_URL}/api/messages/coach-id`, { headers });
      setCoachId(response.data.coach_id);
      setCoachName(response.data.coach_name);
    } catch (error) {
      console.error('Error fetching coach:', error);
    }
  };

  const fetchMessages = async () => {
    if (!coachId || !user) return;
    
    setIsLoading(true);
    try {
      const headers = await getAuthHeaders();
      const response = await axios.get(
        `${API_URL}/api/messages/conversation/${coachId}`,
        { headers }
      );
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchCoachId();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (coachId && user) {
      fetchMessages();
      // Poll for new messages every 30 seconds
      const interval = setInterval(fetchMessages, 30000);
      return () => clearInterval(interval);
    }
  }, [coachId, user]);

  const handleSend = async () => {
    if (!inputText.trim() || !coachId || isSending) return;

    const isPremium = user?.role === 'premium' || user?.role === 'coach';
    if (!isPremium) {
      alert('Solo usuarios premium pueden enviar mensajes a la coach');
      return;
    }

    setIsSending(true);
    try {
      const headers = await getAuthHeaders();
      await axios.post(
        `${API_URL}/api/messages`,
        { receiver_id: coachId, content: inputText.trim() },
        { headers }
      );
      setInputText('');
      await fetchMessages();
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Error al enviar mensaje');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loginPrompt}>
          <Ionicons name="mail" size={64} color={colors.accent.gold} />
          <Text style={styles.loginTitle}>Mensajes con tu Coach</Text>
          <Text style={styles.loginText}>
            Inicia sesión para comunicarte directamente con tu coach de sueño.
          </Text>
          <TouchableOpacity style={styles.loginButton} onPress={login}>
            <Ionicons name="logo-google" size={20} color={colors.text.primary} />
            <Text style={styles.loginButtonText}>Iniciar sesión con Google</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isPremium = user?.role === 'premium' || user?.role === 'coach';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerAvatar}>
          <Ionicons name="person-circle" size={40} color={colors.accent.sage} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{coachName}</Text>
          <Text style={styles.headerSubtitle}>Tu Coach de Sueño</Text>
        </View>
      </View>

      {/* Premium Banner */}
      {!isPremium && (
        <View style={styles.premiumBanner}>
          <Ionicons name="star" size={20} color={colors.accent.gold} />
          <Text style={styles.premiumText}>
            Actualiza a Premium para enviar mensajes a tu coach
          </Text>
        </View>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.messagesContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.accent.sage} size="large" />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.text.muted} />
              <Text style={styles.emptyTitle}>Sin mensajes aún</Text>
              <Text style={styles.emptyText}>
                {isPremium
                  ? 'Envía un mensaje a tu coach para comenzar la conversación.'
                  : 'Actualiza a premium para comunicarte con tu coach.'}
              </Text>
            </View>
          ) : (
            messages.map((message, index) => {
              const isMe = message.sender_id === user?.user_id;
              const showDate = index === 0 ||
                formatDate(message.created_at) !== formatDate(messages[index - 1].created_at);

              return (
                <View key={message.id}>
                  {showDate && (
                    <Text style={styles.dateLabel}>{formatDate(message.created_at)}</Text>
                  )}
                  <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.coachBubble]}>
                    <Text style={styles.messageText}>{message.content}</Text>
                    <Text style={styles.messageTime}>{formatTime(message.created_at)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Input */}
        {isPremium && (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Escribe tu mensaje..."
              placeholderTextColor={colors.text.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || isSending) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || isSending}
            >
              {isSending ? (
                <ActivityIndicator color={colors.text.primary} size="small" />
              ) : (
                <Ionicons name="send" size={20} color={colors.text.primary} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.card,
  },
  headerAvatar: {
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  premiumBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  premiumText: {
    fontSize: fontSize.sm,
    color: colors.accent.gold,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  dateLabel: {
    fontSize: fontSize.xs,
    color: colors.text.muted,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent.sage,
    borderBottomRightRadius: 4,
  },
  coachBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.card,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    lineHeight: 22,
  },
  messageTime: {
    fontSize: fontSize.xs,
    color: colors.text.muted,
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background.card,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text.primary,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent.sage,
    borderRadius: borderRadius.full,
  },
  sendButtonDisabled: {
    backgroundColor: colors.background.elevated,
  },
  loginPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  loginTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  loginText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accent.sage,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  loginButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
