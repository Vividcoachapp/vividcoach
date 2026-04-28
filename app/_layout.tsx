import 'react-native-url-polyfill/auto';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet as RNStyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Fraunces_400Regular,
  Fraunces_700Bold,
  Fraunces_700Bold_Italic,
} from '@expo-google-fonts/fraunces';
import {
  InterTight_400Regular,
  InterTight_500Medium,
  InterTight_600SemiBold,
  InterTight_700Bold,
} from '@expo-google-fonts/inter-tight';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import { supabase } from '../src/services/supabase';
import { useAuthStore } from '../src/stores/authStore';
import { useOnboardingStore } from '../src/stores/onboardingStore';
import { fetchUserProfile } from '../src/services/profile';
import { configureNotificationHandler } from '../src/services/notifications';

SplashScreen.preventAutoHideAsync();
configureNotificationHandler();

// ── Root error boundary — catches uncaught render errors ─────────────────────
class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('[VividCoach]', error.message); }
  render() {
    if (this.state.error) {
      return (
        <View style={ebStyles.container}>
          <Text style={ebStyles.heading}>Something went sideways</Text>
          <Text style={ebStyles.body}>An unexpected error occurred.</Text>
          <TouchableOpacity style={ebStyles.btn} onPress={() => this.setState({ error: null })}>
            <Text style={ebStyles.btnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
const ebStyles = RNStyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#0e100f' },
  heading: { fontFamily: 'Fraunces_700Bold_Italic', fontSize: 24, color: '#f4f1ea', textAlign: 'center', marginBottom: 8 },
  body: { fontFamily: 'InterTight_400Regular', fontSize: 14, color: '#8c8a82', textAlign: 'center', marginBottom: 24 },
  btn: { backgroundColor: '#d8ff3e', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 },
  btnText: { fontFamily: 'InterTight_700Bold', fontSize: 15, color: '#0e100f' },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fraunces_400Regular,
    Fraunces_700Bold,
    Fraunces_700Bold_Italic,
    InterTight_400Regular,
    InterTight_500Medium,
    InterTight_600SemiBold,
    InterTight_700Bold,
    JetBrainsMono_400Regular,
  });

  const { setSession, setInitialized, initialized, user } = useAuthStore();
  const hydrateFromProfile = useOnboardingStore((s) => s.hydrateFromProfile);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        setSession(session);
        if (session?.user?.id) {
          try {
            const profile = await fetchUserProfile(session.user.id);
            if (active && profile) hydrateFromProfile(profile);
          } catch {}
        }
      } catch {}
      if (active) setInitialized(true);
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' && session?.user?.id) {
        if (!useOnboardingStore.getState().selectedCoachId) {
          try {
            const profile = await fetchUserProfile(session.user.id);
            if (profile) useOnboardingStore.getState().hydrateFromProfile(profile);
          } catch {}
        }
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // Navigation guard: redirect when auth state doesn't match current route
  useEffect(() => {
    if (!initialized) return;

    const inAuthFlow = segments[0] === 'auth' || segments[0] === 'onboarding';
    const inTabs = segments[0] === '(tabs)';

    if (user && inAuthFlow) {
      // Signed in but on auth/onboarding — go to app
      router.replace('/home');
    } else if (!user && inTabs) {
      // Signed out but in app — go to onboarding
      router.replace('/onboarding');
    }
  }, [user, initialized, segments]);

  useEffect(() => {
    if (fontsLoaded && initialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, initialized]);

  if (!fontsLoaded || !initialized) return null;

  return (
    <RootErrorBoundary>
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="coach-roster" />
        <Stack.Screen name="workout-share" />
        <Stack.Screen name="weekly-recap" />
        <Stack.Screen name="log-workout" />
        <Stack.Screen name="log-meal" />
        <Stack.Screen name="log-weight" />
        <Stack.Screen name="paywall" />
        <Stack.Screen name="coach-notes" />
      </Stack>
    </SafeAreaProvider>
    </RootErrorBoundary>
  );
}
