import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { colors, fonts, spacing } from '../../theme/theme';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { signUp } = useAuth();
    const router = useRouter();

    const handleRegister = async () => {
        if (!name || !email || !password) {
            Alert.alert('Error', 'Por favor completa todos los campos');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
            return;
        }

        try {
            setLoading(true);
            await signUp(email, password, name);
            Alert.alert('Éxito', 'Cuenta creada. Por favor verifica tu email o inicia sesión.');
            // Depending on Supabase settings, email confirmation might be required
            // If auto-confirm is on, AuthContext will handle navigation
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error de Registro', error.message || 'Ocurrió un error al crear la cuenta');
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
                    <View style={styles.header}>
                        <Link href="/auth/login" asChild>
                            <TouchableOpacity style={styles.backButton}>
                                <Text style={styles.backButtonText}>← Volver</Text>
                            </TouchableOpacity>
                        </Link>
                    </View>

                    <View style={styles.titles}>
                        <Text style={styles.title}>Crear Cuenta</Text>
                        <Text style={styles.subtitle}>Únete a la comunidad de Mamá Respira</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Nombre completo</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="María Pérez"
                                placeholderTextColor={colors.text.secondary}
                                value={name}
                                onChangeText={setName}
                                autoCapitalize="words"
                            />
                        </View>

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
                            style={[styles.button, loading && styles.buttonDisabled]}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Registrarse</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
                            <Link href="/auth/login" asChild>
                                <TouchableOpacity>
                                    <Text style={styles.linkText}>Inicia Sesión</Text>
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
    header: {
        marginBottom: spacing.lg,
    },
    backButton: {
        padding: spacing.xs,
    },
    backButtonText: {
        fontSize: 16,
        color: colors.accent.sage,
        fontFamily: fonts.medium,
    },
    titles: {
        marginBottom: spacing.xl,
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
        marginTop: spacing.md,
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
    button: {
        backgroundColor: colors.accent.terracotta,
        borderRadius: 12,
        padding: spacing.md,
        alignItems: 'center',
        marginTop: spacing.lg,
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
