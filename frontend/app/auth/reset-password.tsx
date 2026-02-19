import React, { useState, useEffect } from 'react';
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

export default function ResetPasswordScreen() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Supabase handles the token from the URL hash automatically.
        // Listen for the PASSWORD_RECOVERY event.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'PASSWORD_RECOVERY') {
                    setSessionReady(true);
                }
            }
        );
        return () => subscription.unsubscribe();
    }, []);

    const handleReset = async () => {
        const pwCheck = InputValidator.validatePassword(password);
        if (!pwCheck.valid) {
            Alert.alert('Contraseña débil', pwCheck.error);
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Error', 'Las contraseñas no coinciden');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setDone(true);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'No pudimos actualizar la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    // Waiting for Supabase to process the recovery token
    if (!sessionReady && !done) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.accent.terracotta} />
                    <Text style={styles.waitText}>Verificando enlace...</Text>
                    <Text style={styles.waitSub}>
                        Si nada pasa, el enlace puede haber expirado.
                    </Text>
                    <TouchableOpacity onPress={() => router.replace('/auth/forgot-password' as any)}>
                        <Text style={styles.linkText}>Solicitar nuevo enlace</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {done ? (
                        <View style={styles.successBox}>
                            <Ionicons name="checkmark-circle" size={64} color={colors.accent.sage} />
                            <Text style={styles.successTitle}>¡Contraseña actualizada!</Text>
                            <Text style={styles.successText}>
                                Tu contraseña fue cambiada exitosamente.
                            </Text>
                            <TouchableOpacity
                                style={styles.button}
                                onPress={() => router.replace('/auth/login')}
                            >
                                <Text style={styles.buttonText}>Iniciar sesión</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <>
                            <View style={styles.header}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="lock-closed-outline" size={32} color="#fff" />
                                </View>
                                <Text style={styles.title}>Nueva contraseña</Text>
                                <Text style={styles.subtitle}>
                                    Crea una contraseña segura para tu cuenta.
                                </Text>
                            </View>

                            <View style={styles.form}>
                                <Text style={styles.label}>Nueva contraseña</Text>
                                <View style={styles.passwordRow}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Mínimo 8 chars, 1 mayúscula, 1 número"
                                        placeholderTextColor={colors.text.secondary}
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                    />
                                    <TouchableOpacity
                                        style={styles.eyeBtn}
                                        onPress={() => setShowPassword(v => !v)}
                                    >
                                        <Ionicons
                                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={20}
                                            color={colors.text.secondary}
                                        />
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.label}>Confirmar contraseña</Text>
                                <TextInput
                                    style={[styles.input, { marginBottom: spacing.lg }]}
                                    placeholder="Repite tu contraseña"
                                    placeholderTextColor={colors.text.secondary}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showPassword}
                                />

                                <TouchableOpacity
                                    style={[styles.button, loading && styles.buttonDisabled]}
                                    onPress={handleReset}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.buttonText}>Guardar contraseña</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background.primary },
    keyboardView: { flex: 1 },
    content: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
    centered: {
        flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    waitText: {
        fontSize: 18, fontFamily: fonts.bold, color: colors.text.primary,
    },
    waitSub: {
        fontSize: 14, fontFamily: fonts.regular,
        color: colors.text.secondary, textAlign: 'center',
    },
    linkText: { color: colors.accent.sage, fontSize: 14, fontFamily: fonts.bold },
    header: { alignItems: 'center', marginBottom: spacing.xl },
    iconCircle: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: colors.accent.terracotta,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: spacing.md,
    },
    title: {
        fontSize: 26, fontFamily: fonts.bold,
        color: colors.text.primary, textAlign: 'center',
        marginBottom: spacing.sm,
    },
    subtitle: {
        fontSize: 15, fontFamily: fonts.regular,
        color: colors.text.secondary, textAlign: 'center',
    },
    form: {},
    label: {
        fontSize: 14, fontFamily: fonts.medium,
        color: colors.text.primary, marginBottom: spacing.xs,
    },
    passwordRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    input: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: spacing.md,
        fontSize: 16,
        fontFamily: fonts.regular,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    eyeBtn: { position: 'absolute', right: spacing.md },
    button: {
        backgroundColor: colors.accent.terracotta,
        borderRadius: 12, padding: spacing.md,
        alignItems: 'center', elevation: 4,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: '#fff', fontSize: 16, fontFamily: fonts.bold },
    successBox: {
        alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg,
    },
    successTitle: {
        fontSize: 22, fontFamily: fonts.bold, color: colors.text.primary,
    },
    successText: {
        fontSize: 15, fontFamily: fonts.regular,
        color: colors.text.secondary, textAlign: 'center',
    },
});
