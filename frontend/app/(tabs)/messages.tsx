import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../theme/theme';
import { useAuth } from '../../contexts/AuthContext';
import {
  getCoach,
  getDirectMessages,
  sendDirectMessage,
  subscribeToDirectMessages
} from '../../services/api';
import { Profile, DirectMessage } from '../../lib/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { RateLimiter } from '../../utils/rateLimiter';
import { InputValidator } from '../../utils/validator';
import { AuditLogger } from '../../utils/auditLogger';

export default function MessagesScreen() {
  const { user, userRole } = useAuth();
  const [coach, setCoach] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Check if user has access (Premium or Coach)
  // Note: We might want to allow free users to at least see the screen or get an upsell
  const hasAccess = userRole === 'premium' || userRole === 'coach';

  useEffect(() => {
    if (!hasAccess) {
      setLoading(false);
      return;
    }
    loadData();
  }, [hasAccess]);

  useEffect(() => {
    if (!hasAccess) return;

    // Subscribe to real-time messages
    const subscription = subscribeToDirectMessages((newMessage) => {
      // Optimistically add message if it's not already in the list
      setMessages((prev) => {
        const exists = prev.some(m => m.id === newMessage.id);
        if (exists) return prev;
        return [...prev, newMessage];
      });

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [hasAccess]);

  const loadData = async () => {
    try {
      setLoading(true);
      // 1. Find the coach
      const coachProfile = await getCoach();
      setCoach(coachProfile);

      // 2. Load message history
      const history = await getDirectMessages();
      setMessages(history);

    } catch (error) {
      console.error('Error loading chat:', error);
      Alert.alert('Error', 'No se pudieron cargar los mensajes');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || !coach) return;

    // ✅ RATE LIMITING
    const canSend = await RateLimiter.canSendMessage();
    if (!canSend) {
      AuditLogger.logRateLimitHit('send_message');
      Alert.alert(
        'Límite alcanzado',
        RateLimiter.getRateLimitMessage('send_message'),
        [{ text: 'OK' }]
      );
      return;
    }

    // ✅ INPUT VALIDATION
    const validation = InputValidator.validateMessage(inputText);
    if (!validation.valid) {
      Alert.alert('Mensaje inválido', validation.error);
      return;
    }

    const content = validation.sanitized!;
    setInputText('');
    setSending(true);

    try {
      const sentMessage = await sendDirectMessage(coach.id, content);

      if (sentMessage) {
        AuditLogger.logMessageSent(sentMessage.id, coach.id);
      } else {
        Alert.alert('Error', 'No se pudo enviar el mensaje');
        setInputText(content);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje');
      setInputText(content);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: DirectMessage }) => {
    const isMe = item.sender_id === user?.id;

    return (
      <View style={[
        styles.messageBubble,
        isMe ? styles.myMessage : styles.theirMessage
      ]}>
        <Text style={[
          styles.messageText,
          isMe ? styles.myMessageText : styles.theirMessageText
        ]}>
          {item.content}
        </Text>
        <Text style={[
          styles.messageTime,
          isMe ? styles.myMessageTime : styles.theirMessageTime
        ]}>
          {format(new Date(item.created_at), 'HH:mm', { locale: es })}
        </Text>
      </View>
    );
  };

  if (!hasAccess) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.accessDeniedContainer}>
          <Ionicons name="lock-closed" size={64} color={colors.accent.gold} />
          <Text style={styles.accessDeniedTitle}>Acceso Premium</Text>
          <Text style={styles.accessDeniedText}>
            La mensajería directa con coaches es exclusiva para usuarias Premium.
          </Text>
          {/* Upgrade button could go here */}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.coachInfo}>
          {coach?.picture ? (
            <Image source={{ uri: coach.picture }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={24} color={colors.text.inverse} />
            </View>
          )}
          <View>
            <Text style={styles.coachName}>{coach?.name || 'Tu Coach'}</Text>
            <Text style={styles.statusText}>En línea</Text>
          </View>
        </View>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                ¡Hola! Escríbele a tu coach para comenzar.
              </Text>
            </View>
          ) : null
        }
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.accent.terracotta} />
        </View>
      )}

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor={colors.text.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || sending) && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <Ionicons name="send" size={20} color={colors.text.inverse} />
            )}
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.primary,
  },
  coachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statusText: {
    fontSize: fontSize.xs,
    color: colors.accent.sage,
  },
  messagesList: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xs,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent.terracotta,
    borderBottomRightRadius: 2,
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.card,
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: fontSize.md,
    lineHeight: 20,
  },
  myMessageText: {
    color: colors.text.inverse,
  },
  theirMessageText: {
    color: colors.text.primary,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  myMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  theirMessageTime: {
    color: colors.text.muted,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.background.card,
    backgroundColor: colors.background.primary,
    gap: spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: colors.background.card,
    borderRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm, // reduced padding
    minHeight: 44, // ensures touch target
    maxHeight: 100, // limits growth
    fontSize: fontSize.md,
    color: colors.text.primary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent.terracotta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.background.card,
    opacity: 0.5,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
  emptyText: {
    color: colors.text.secondary,
    fontSize: fontSize.md,
  },
  accessDeniedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  accessDeniedTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  accessDeniedText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
  }
});
