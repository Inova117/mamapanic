import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Image, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { colors, fonts, spacing } from '../../theme/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();
    const router = useRouter();

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Por favor ingresa email y contraseña');
            return;
        }

        try {
            setLoading(true);
            await signIn(email, password);
            // Navigation is handled by AuthContext
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error de Login', error.message || 'Ocurrió un error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    <View style={styles.logoContainer}>
                        {/* Placeholder for logo */}
                        <View style={styles.logoPlaceholder}>
                            <Text style={styles.logoText}>M</Text>
                        </View>
                        <Text style={styles.title}>Mamá Respira</Text>
                        <Text style={styles.subtitle}>Tu santuario de calma en el posparto</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="tu@email.com"
                                placeholderTextColor={colors.text.secondary}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Contraseña</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="********"
                                placeholderTextColor={colors.text.secondary}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.forgotPassword}
                            onPress={() => Alert.alert('Próximamente', 'Función de recuperar contraseña en construcción')}
                        >
                            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Iniciar Sesión</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>¿No tienes cuenta? </Text>
                            <Link href="/auth/register" asChild>
                                <TouchableOpacity>
                                    <Text style={styles.linkText}>Regístrate aquí</Text>
                                </TouchableOpacity>
                            </Link>
                        </View>
                    </View>
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
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: spacing.lg,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    logoPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.accent.terracotta,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    logoText: {
        fontSize: 40,
        color: '#fff',
        fontWeight: 'bold',
    },
    title: {
        fontSize: 32,
        fontFamily: fonts.bold,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: colors.text.secondary,
    },
    form: {
        marginTop: spacing.lg,
    },
    inputContainer: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: 14,
        fontFamily: fonts.medium,
        color: colors.text.primary,
        marginBottom: spacing.xs,
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: spacing.md,
        fontSize: 16,
        fontFamily: fonts.regular,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: spacing.xl,
    },
    forgotPasswordText: {
        color: colors.accent.sage,
        fontSize: 14,
        fontFamily: fonts.medium,
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
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: fonts.bold,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing.xl,
    },
    footerText: {
        color: colors.text.secondary,
        fontFamily: fonts.regular,
        fontSize: 16,
    },
    linkText: {
        color: colors.accent.sage,
        fontFamily: fonts.bold,
        fontSize: 16,
    },
});
