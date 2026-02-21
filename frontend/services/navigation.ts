import { supabase } from '../lib/supabase';

/**
 * Get user's role from profile
 */
export async function getUserRole(): Promise<'user' | 'premium' | 'coach' | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    return profile?.role || 'user';
}

/**
 * Check if current user is a coach
 */
export async function isCoach(): Promise<boolean> {
    const role = await getUserRole();
    return role === 'coach';
}

/**
 * Get the appropriate home route based on user role
 * All roles go to /(tabs) because the tab layout handles the role-based UI
 */
export async function getHomeRoute(): Promise<string> {
    const role = await getUserRole();
    // Default route for everyone is the tabs layout
    return '/(tabs)';
}

/**
 * Navigate to appropriate home screen based on user role
 * Use this after login/signup
 */
export async function navigateToHome(router: any) {
    const homeRoute = await getHomeRoute();
    router.replace(homeRoute);
}
