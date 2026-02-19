import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform,
    ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { colors, fonts, spacing } from '../../theme/theme';
import { InputValidator } from '../../utils/validator';

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const router = useRouter();

    const handleSend = async () => {
        const emailCheck = InputValidator.validateEmail(email);
        if (!emailCheck.valid) {
            Alert.alert('Error', emailCheck.error);
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(
                emailCheck.sanitized!,
                {
                    // This URL must be in Supabase's allowed redirect list
                    redirectTo: 'https://nidoes.netlify.app/auth/reset-password',
                }
            );

            if (error) throw error;
            setSent(true);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No pudimos enviar el correo. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {/* Back */}
                    <TouchableOpacity style={styles.back} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="lock-open-outline" size={32} color="#fff" />
                        </View>
                        <Text style={styles.title}>¿Olvidaste tu contraseña?</Text>
                        <Text style={styles.subtitle}>
                            Te enviaremos un correo para restablecerla.
                        </Text>
                    </View>

                    {sent ? (
                        <View style={styles.successBox}>
                            <Ionicons name="checkmark-circle" size={48} color={colors.accent.sage} />
                            <Text style={styles.successTitle}>¡Correo enviado!</Text>
                            <Text style={styles.successText}>
                                Revisa tu bandeja de entrada (y spam). El link expira en 1 hora.
                            </Text>
                            <TouchableOpacity
                                style={styles.button}
                                onPress={() => router.replace('/auth/login')}
                            >
                                <Text style={styles.buttonText}>Volver al inicio</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.form}>
                            <Text style={styles.label}>Correo electrónico</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="tu@email.com"
                                placeholderTextColor={colors.text.secondary}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                autoFocus
                            />

                            <TouchableOpacity
                                style={[styles.button, loading && styles.buttonDisabled]}
                                onPress={handleSend}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.buttonText}>Enviar correo de recuperación</Text>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.cancelLink}
                                onPress={() => router.back()}
                            >
                                <Text style={styles.cancelText}>Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.primary },
    keyboardView: { flex: 1 },
    content: { flex: 1, padding: spacing.lg },
    back: { marginBottom: spacing.lg },
    header: { alignItems: 'center', marginBottom: spacing.xl },
    iconCircle: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: colors.accent.terracotta,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: spacing.md,
    },
    title: {
        fontSize: 26,
        fontFamily: fonts.bold,
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: 15,
        fontFamily: fonts.regular,
        color: colors.text.secondary,
        textAlign: 'center',
    },
    form: { marginTop: spacing.sm },
    label: {
        fontSize: 14, fontFamily: fonts.medium,
        color: colors.text.primary, marginBottom: spacing.xs,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: spacing.md,
        fontSize: 16,
        fontFamily: fonts.regular,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        marginBottom: spacing.lg,
    },
    button: {
        backgroundColor: colors.accent.terracotta,
        borderRadius: 12,
        padding: spacing.md,
        alignItems: 'center',
        shadowColor: colors.accent.terracotta,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: '#fff', fontSize: 16, fontFamily: fonts.bold },
    cancelLink: { alignItems: 'center', marginTop: spacing.lg },
    cancelText: { color: colors.text.secondary, fontSize: 14, fontFamily: fonts.regular },
    successBox: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.md },
    successTitle: {
        fontSize: 22, fontFamily: fonts.bold,
        color: colors.text.primary, marginTop: spacing.sm,
    },
    successText: {
        fontSize: 15, fontFamily: fonts.regular,
        color: colors.text.secondary, textAlign: 'center',
        lineHeight: 22,
    },
});
