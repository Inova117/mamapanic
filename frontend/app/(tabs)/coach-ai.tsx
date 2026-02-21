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
import { getCoachChatResponse } from '../../services/groq';
import { ChatMessage } from '../../types';
import { InputValidator } from '../../utils/validator';
import { DebugLogger, LogEntry } from '../../utils/debugLogger';

export default function CoachAIScreen() {
    const { chatSessionId } = useAppStore(); // Reusing the same session logic, or could be separate
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    const [debugLogs, setDebugLogs] = useState<LogEntry[]>([]);
    const scrollViewRef = useRef<ScrollView>(null);
    const debugScrollRef = useRef<ScrollView>(null);

    useEffect(() => {
        // We don't necessarily load history from the DB for the coach AI unless requested,
        // to keep it fast and ephemeral, or we could load a specific coach session.
        // For now, it's an ephemeral expert session.

        // Subscribe to debug logs
        const unsub = DebugLogger.subscribe(logs => setDebugLogs([...logs]));
        setDebugLogs(DebugLogger.getLogs());
        return unsub;
    }, []);

    const handleSend = async () => {
        if (!inputText.trim() || isLoading) return;

        DebugLogger.info('[CoachAI] handleSend: starting');

        const validation = InputValidator.validateMessage(inputText);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }

        const userMessage: ChatMessage = {
            id: `temp_${Date.now()}`,
            session_id: 'coach_session',
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
            // Map history for context
            const history = messages.map(m => ({ role: m.role, content: m.content }));

            const responseText = await getCoachChatResponse(userMessage.content, history);

            const assistantMessage: ChatMessage = {
                id: `assistant_${Date.now()}`,
                session_id: 'coach_session',
                role: 'assistant',
                content: responseText,
                created_at: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            DebugLogger.error('[CoachAI] handleSend catch:', String(error));
            const errorMessage: ChatMessage = {
                id: `error_${Date.now()}`,
                session_id: 'coach_session',
                role: 'assistant',
                content: 'Hubo un error al procesar tu consulta clínica. Intenta de nuevo.',
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
                        <Ionicons name="flask" size={18} color={colors.accent.sage} />
                        <Text style={styles.assistantName}>Coach AI</Text>
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
                    <Ionicons name="flask" size={40} color={colors.accent.sage} />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Asistente Clínico AI</Text>
                    <Text style={styles.headerSubtitle}>Base de conocimientos experta</Text>
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
                    {messages.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="albums-outline" size={48} color={colors.text.muted} />
                            <Text style={styles.emptyTitle}>Base de Conocimientos</Text>
                            <Text style={styles.emptyText}>
                                Soy tu Asistente Clínico AI. Estoy entrenado en pediatría básica, psicología clínica, terapia cognitivo-conductual y asesoría en sueño y lactancia.
                            </Text>
                            <View style={styles.suggestionsContainer}>
                                <TouchableOpacity
                                    style={styles.suggestion}
                                    onPress={() => setInputText('¿Cuál es el protocolo recomendado para la regresión de sueño de los 4 meses?')}
                                >
                                    <Text style={styles.suggestionText}>Regresión de los 4 meses</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.suggestion}
                                    onPress={() => setInputText('Redacta un mensaje empático para una mamá que sufre mastitis y siente culpa.')}
                                >
                                    <Text style={styles.suggestionText}>Mensaje empático mastitis</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.suggestion}
                                    onPress={() => setInputText('Resume técnicas de TCC para la ansiedad postparto leve.')}
                                >
                                    <Text style={styles.suggestionText}>Técnicas TCC postparto</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        messages.map(renderMessage)
                    )}

                    {isLoading && (
                        <View style={styles.typingIndicator}>
                            <Ionicons name="flask" size={20} color={colors.accent.sage} />
                            <Text style={styles.typingText}>Consultando protocolos...</Text>
                        </View>
                    )}
                </ScrollView>

                {/* Input */}
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Pregunta sobre protocolos o pide redactar mensajes..."
                        placeholderTextColor={colors.text.muted}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={1000}
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

            {/* 🐛 Debug Modal */}
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
    // Coach specific bubble colors
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: colors.background.card,
        borderBottomRightRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    assistantBubble: {
        alignSelf: 'flex-start',
        backgroundColor: colors.accent.sage,
        opacity: 0.95,
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
        color: colors.background.primary,
        fontWeight: '700',
    },
    messageText: {
        fontSize: fontSize.md,
        color: colors.text.primary,
        lineHeight: 24,
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
        maxHeight: 120,
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
