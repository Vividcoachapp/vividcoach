import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/authStore';
import { useOnboardingStore } from '../src/stores/onboardingStore';

export default function Root() {
  const user = useAuthStore((s) => s.user);
  const isComplete = useOnboardingStore((s) => s.isComplete);

  if (user) return <Redirect href="/home" />;
  if (isComplete) return <Redirect href="/auth/signup" />;
  return <Redirect href="/onboarding" />;
}
