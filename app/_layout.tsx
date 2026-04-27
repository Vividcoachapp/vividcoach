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
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
