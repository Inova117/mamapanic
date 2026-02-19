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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontSize, spacing, borderRadius } from '../../theme/theme';
import { useAppStore } from '../../store/useAppStore';
import { sendChatMessage, getChatHistory } from '../../services/api';
import { ChatMessage } from '../../types';
import { InputValidator } from '../../utils/validator';
import { DebugLogger, LogEntry } from '../../utils/debugLogger';
// Note: Rate limiting removed from chat to avoid Android AbortError from network calls

export default function ChatScreen() {
  const { chatSessionId } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showDebug, setShowDebug] = useState(false);
  const [debugLogs, setDebugLogs] = useState<LogEntry[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const debugScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadChatHistory();
    // Subscribe to debug logs
    const unsub = DebugLogger.subscribe(logs => setDebugLogs([...logs]));
    setDebugLogs(DebugLogger.getLogs());
    return unsub;
  }, [chatSessionId]);

  const loadChatHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const history = await getChatHistory(chatSessionId);
      setMessages(history);
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    DebugLogger.info('[ChatScreen] handleSend: starting');

    // ✅ INPUT VALIDATION
    const validation = InputValidator.validateMessage(inputText);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const userMessage: ChatMessage = {
      id: `temp_${Date.now()}`,
      session_id: chatSessionId,
      role: 'user',
      content: validation.sanitized!,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const response = await sendChatMessage(chatSessionId, userMessage.content);
      setMessages((prev) => [...prev, response]);
    } catch (error) {
      DebugLogger.error('[ChatScreen] handleSend catch:', String(error));
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        session_id: chatSessionId,
        role: 'assistant',
        content: 'Lo siento, no pude responder. Inténtalo de nuevo. Estás haciendo un gran trabajo. 💛',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    return (
      <View
        key={message.id}
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        {!isUser && (
          <View style={styles.assistantHeader}>
            <Ionicons name="heart-circle" size={20} color={colors.accent.terracotta} />
            <Text style={styles.assistantName}>Abuela Sabia</Text>
          </View>
        )}
        <Text style={[
          styles.messageText,
          isUser && styles.userMessageText,
        ]}>
          {message.content}
        </Text>
      </View>
    );
  };

  const logColor = (level: string) => {
    if (level === 'error') return '#ff6b6b';
    if (level === 'warn') return '#ffd93d';
    return '#a8e6cf';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Ionicons name="heart-circle" size={40} color={colors.accent.terracotta} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Abuela Sabia</Text>
          <Text style={styles.headerSubtitle}>Aquí para escucharte</Text>
        </View>
        {/* 🐛 Debug button */}
        <TouchableOpacity
          style={styles.debugButton}
          onPress={() => setShowDebug(true)}
        >
          <Text style={styles.debugButtonText}>🐛</Text>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.messagesContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {isLoadingHistory ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.accent.sage} size="large" />
            </View>
          ) : messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.text.muted} />
              <Text style={styles.emptyTitle}>Hola, querida</Text>
              <Text style={styles.emptyText}>
                Soy la Abuela Sabia. Estoy aquí para escucharte sin juzgarte.
                Cuéntame cómo te sientes.
              </Text>
              <View style={styles.suggestionsContainer}>
                <TouchableOpacity
                  style={styles.suggestion}
                  onPress={() => setInputText('No puedo más, estoy agotada')}
                >
                  <Text style={styles.suggestionText}>Estoy agotada</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.suggestion}
                  onPress={() => setInputText('Mi bebé no para de llorar')}
                >
                  <Text style={styles.suggestionText}>Mi bebé no para de llorar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.suggestion}
                  onPress={() => setInputText('Me siento sola')}
                >
                  <Text style={styles.suggestionText}>Me siento sola</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            messages.map(renderMessage)
          )}

          {isLoading && (
            <View style={styles.typingIndicator}>
              <Ionicons name="heart-circle" size={20} color={colors.accent.terracotta} />
              <Text style={styles.typingText}>Abuela Sabia está escribiendo...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Escribe cómo te sientes..."
            placeholderTextColor={colors.text.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() && !isLoading ? colors.text.primary : colors.text.muted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 🐛 Debug Log Modal */}
      <Modal
        visible={showDebug}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowDebug(false)}
      >
        <SafeAreaView style={styles.debugModal}>
          <View style={styles.debugHeader}>
            <Text style={styles.debugTitle}>🐛 Debug Logs</Text>
            <View style={styles.debugActions}>
              <TouchableOpacity onPress={() => DebugLogger.clear()} style={styles.debugClearBtn}>
                <Text style={styles.debugClearText}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowDebug(false)} style={styles.debugCloseBtn}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView
            ref={debugScrollRef}
            style={styles.debugScroll}
            contentContainerStyle={{ padding: spacing.sm }}
          >
            {debugLogs.length === 0 ? (
              <Text style={styles.debugEmpty}>Sin logs todavía. Envía un mensaje.</Text>
            ) : (
              debugLogs.map(log => (
                <View key={log.id} style={styles.logEntry}>
                  <Text style={[styles.logLevel, { color: logColor(log.level) }]}>
                    [{log.timestamp}] {log.level.toUpperCase()}
                  </Text>
                  <Text style={styles.logMessage}>{log.message}</Text>
                </View>
              ))
            )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.card,
  },
  headerIcon: {
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
  debugButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugButtonText: {
    fontSize: 18,
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
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  suggestion: {
    backgroundColor: colors.background.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
  },
  suggestionText: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent.sage,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.card,
    borderBottomLeftRadius: 4,
  },
  assistantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  assistantName: {
    fontSize: fontSize.xs,
    color: colors.accent.terracotta,
    fontWeight: '600',
  },
  messageText: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    lineHeight: 22,
  },
  userMessageText: {
    color: colors.text.primary,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  typingText: {
    fontSize: fontSize.sm,
    color: colors.text.muted,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingBottom: Platform.OS === 'android' ? 110 : 90,
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
  // Debug modal styles
  debugModal: {
    flex: 1,
    backgroundColor: '#0d0d0d',
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  debugTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: '#fff',
  },
  debugActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  debugClearBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: '#333',
    borderRadius: 6,
  },
  debugClearText: {
    color: '#aaa',
    fontSize: fontSize.sm,
  },
  debugCloseBtn: {
    padding: 4,
  },
  debugScroll: {
    flex: 1,
  },
  debugEmpty: {
    color: '#555',
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: fontSize.sm,
  },
  logEntry: {
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    paddingBottom: spacing.xs,
  },
  logLevel: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
  logMessage: {
    fontSize: 12,
    color: '#ddd',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
