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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, fontSize, spacing, borderRadius } from '../../theme/theme';
import { DirectMessage } from '../../types';
import { getDirectMessages, sendDirectMessage } from '../../services/api';
import { InputValidator } from '../../utils/validator';

export default function CoachClientChatScreen() {
    const { id: clientId } = useLocalSearchParams();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [messages, setMessages] = useState<DirectMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [clientName, setClientName] = useState('Cliente');

    const scrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (!clientId) return;
        fetchClientName();
        loadMessages();

        // Set up polling because realtime is flaky on PWA
        const interval = setInterval(() => {
            loadMessages(true);
        }, 5000);

        return () => clearInterval(interval);
    }, [clientId]);

    const fetchClientName = async () => {
        try {
            const { data } = await supabase
                .from('profiles')
                .select('name')
                .eq('id', clientId)
                .single();
            if (data?.name) {
                setClientName(data.name);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const loadMessages = async (silent = false) => {
        if (!silent) setIsLoadingHistory(true);
        try {
            const allMsgs = await getDirectMessages();
            // Filter messages specifically for this client
            const clientMsgs = allMsgs.filter(
                (m) => m.sender_id === clientId || m.receiver_id === clientId
            );
            setMessages(clientMsgs);
        } catch (error) {
            console.error('Error loading direct messages:', error);
        } finally {
            setIsLoadingHistory(false);
            if (!silent) {
                setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: false }), 200);
            }
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() || !clientId || isSending) return;

        const validation = InputValidator.validateMessage(inputText);
        if (!validation.valid) {
            alert(validation.error);
            return;
        }

        setIsSending(true);
        const textToSend = validation.sanitized!;
        setInputText('');

        try {
            await sendDirectMessage(clientId as string, textToSend);
            await loadMessages(true);
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
        } catch (error) {
            console.error('Error sending DM:', error);
            alert('Error enviando mensaje');
            setInputText(textToSend); // Restore
        } finally {
            setIsSending(false);
        }
    };

    const currentUserId = messages.length > 0
        ? (messages.find(m => m.sender_id !== clientId)?.sender_id)
        : undefined;

    const renderMessage = (msg: DirectMessage) => {
        const isMe = msg.sender_id !== clientId;

        return (
            <View
                key={msg.id}
                style={[
                    styles.messageBubble,
                    isMe ? styles.myBubble : styles.theirBubble,
                ]}
            >
                <Text style={[styles.messageText, isMe && styles.myMessageText]}>
                    {msg.content}
                </Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{clientName}</Text>
                    <Text style={styles.headerSubtitle}>Conversación directa</Text>
                </View>
                <View style={{ width: 40 }} /> {/* spacer */}
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardAvoid}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messagesList}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
                >
                    {isLoadingHistory ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator color={colors.accent.sage} size="large" />
                        </View>
                    ) : messages.length === 0 ? (
                        <View style={styles.centerContainer}>
                            <Ionicons name="chatbubbles-outline" size={48} color={colors.text.muted} />
                            <Text style={styles.emptyText}>No hay mensajes aún.</Text>
                        </View>
                    ) : (
                        messages.map(renderMessage)
                    )}
                </ScrollView>

                <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
                    <TextInput
                        style={styles.input}
                        placeholder="Escribe un mensaje..."
                        placeholderTextColor={colors.text.muted}
                        value={inputText}
                        onChangeText={setInputText}
                        multiline
                        maxLength={1000}
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            (!inputText.trim() || isSending) && styles.sendButtonDisabled,
                        ]}
                        onPress={handleSend}
                        disabled={!inputText.trim() || isSending}
                    >
                        {isSending ? (
                            <ActivityIndicator color={colors.background.primary} size="small" />
                        ) : (
                            <Ionicons
                                name="send"
                                size={20}
                                color={inputText.trim() ? colors.text.primary : colors.text.muted}
                            />
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.background.elevated,
    },
    backButton: {
        padding: spacing.xs,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: fontSize.lg,
        fontWeight: '600',
        color: colors.text.primary,
    },
    headerSubtitle: {
        fontSize: fontSize.xs,
        color: colors.accent.sage,
    },
    keyboardAvoid: {
        flex: 1,
    },
    messagesList: {
        flex: 1,
    },
    messagesContent: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
    },
    centerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
    },
    emptyText: {
        fontSize: fontSize.md,
        color: colors.text.muted,
        marginTop: spacing.sm,
    },
    messageBubble: {
        maxWidth: '85%',
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
    theirBubble: {
        alignSelf: 'flex-start',
        backgroundColor: colors.background.card,
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: fontSize.md,
        color: colors.text.primary,
        lineHeight: 20,
    },
    myMessageText: {
        color: '#000',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
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
        minHeight: 44,
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
});
