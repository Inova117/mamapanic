import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import LandingScreen from '../components/LandingScreen';

export default function Index() {
  const { user, isLoading } = useAuth();

  // While the session resolves, render nothing — the splash overlay in the root
  // layout covers the screen. Logged-in users go straight into the app; everyone
  // else sees the public landing/welcome page.
  if (isLoading) return null;
  if (user) return <Redirect href="/(tabs)" />;
  return <LandingScreen />;
}
