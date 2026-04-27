import 'react-native-url-polyfill/auto';
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

SplashScreen.preventAutoHideAsync();

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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      // Restore coach + profile data for returning users (store is always empty on app start)
      if (session?.user?.id) {
        try {
          const profile = await fetchUserProfile(session.user.id);
          if (profile) hydrateFromProfile(profile);
        } catch {}
      }
      setInitialized(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      // Hydrate on sign-in if the store is still empty (e.g. signing back in after sign-out)
      if (event === 'SIGNED_IN' && session?.user?.id) {
        if (!useOnboardingStore.getState().selectedCoachId) {
          try {
            const profile = await fetchUserProfile(session.user.id);
            if (profile) useOnboardingStore.getState().hydrateFromProfile(profile);
          } catch {}
        }
      }
    });

    return () => subscription.unsubscribe();
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
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
