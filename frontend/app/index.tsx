import { Redirect } from 'expo-router';

// This is the initial entry point. 
// Navigation logic in `contexts/AuthContext.tsx` will handle redirection based on auth state.
// If auth state is not yet determined, it will show a loading screen (handled in _layout or inside AuthProvider).
// If determined:
// - Authenticated: Redirects to /(tabs) by AuthContext
// - Unauthenticated: Redirects to /auth/login by AuthContext

// However, we need a default fallback here.
export default function Index() {
    return <Redirect href="/auth/login" />;
}
