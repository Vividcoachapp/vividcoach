import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '../../src/services/supabase';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { FREE_COACHES } from '../../src/constants/coaches';
import { colors } from '../../src/constants/colors';
import { fonts, spacing, radii } from '../../src/constants/theme';

async function saveOnboardingToSupabase(userId: string, store: ReturnType<typeof useOnboardingStore.getState>) {
  const {
    name, goals, constraints, customConstraint,
    selectedCoachId, coachCustomName, vibe,
  } = store;

  await supabase.from('profiles').upsert({
    id: userId,
    full_name: name,
  });

  if (selectedCoachId && vibe) {
    await supabase.from('coach_selections').insert({
      user_id: userId,
      coach_id: selectedCoachId,
      coach_custom_name: coachCustomName || null,
      vibe,
      is_active: true,
    });
  }

  const memoryRows: object[] = [];

  if (goals.trim()) {
    memoryRows.push({
      user_id: userId,
      coach_id: selectedCoachId ?? 1,
      memory_type: 'goal',
      content: goals.trim(),
      confidence: 1.0,
    });
  }

  const allConstraints = [
    ...constraints,
    ...(customConstraint.trim() ? [customConstraint.trim()] : []),
  ];

  for (const c of allConstraints) {
    memoryRows.push({
      user_id: userId,
      coach_id: selectedCoachId ?? 1,
      memory_type: 'constraint',
      content: c,
      confidence: 1.0,
    });
  }

  if (memoryRows.length > 0) {
    await supabase.from('coach_memory').insert(memoryRows);
  }
}

export default function SignUpScreen() {
  const router = useRouter();
  const onboardingStore = useOnboardingStore();
  const { selectedCoachId, coachCustomName } = onboardingStore;

  const coach = FREE_COACHES.find((c) => c.id === selectedCoachId) ?? FREE_COACHES[0];
  const displayName = coachCustomName || coach.name;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailSent, setShowEmailSent] = useState(false);

  const isSupabaseConfigured =
    !!process.env.EXPO_PUBLIC_SUPABASE_URL &&
    !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const handleSignUp = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert(
        'Supabase not configured',
        'Add your EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to the .env file, then restart the server.',
        [{ text: 'Got it' }]
      );
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError('Email and password are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user && data.session) {
      // Session created immediately — save onboarding data then go to app
      try {
        await saveOnboardingToSupabase(data.user.id, useOnboardingStore.getState());
      } catch (e) {
        console.warn('[Supabase] Failed to save onboarding data:', e);
      }
      router.replace('/home');
      return;
    } else if (data.user && !data.session) {
      // Email confirmation still required — show check-email screen
      setLoading(false);
      setShowEmailSent(true);
      return;
    }

    setLoading(false);
  };

  // ── Check-email confirmation screen ──────────────────────────────────────
  if (showEmailSent) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.emailSentContainer}>
          <View style={styles.emailIconWrap}>
            <Ionicons name="mail-outline" size={40} color={colors.accent} />
          </View>
          <Text style={styles.emailSentHeading}>Check your email.</Text>
          <Text style={styles.emailSentBody}>
            We sent a confirmation link to{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>
          <Text style={styles.emailSentSub}>
            Tap the link in the email to activate your account, then come back and sign in.
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.replace('/auth/signin')}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaText}>Go to sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Sign-up form ──────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Coach intro */}
          <View style={styles.coachRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{coach.name[0]}</Text>
            </View>
            <View style={styles.bubble}>
              <Text style={styles.bubbleText}>
                One last thing — let's save your progress so {displayName} can find you next time.
              </Text>
            </View>
          </View>

          <Text style={styles.heading}>Create your account.</Text>

          {!isSupabaseConfigured && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                Supabase not configured yet. Add your keys to .env and restart the server to enable sign-up.
              </Text>
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.fields}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>EMAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                onSubmitEditing={handleSignUp}
                returnKeyType="go"
              />
            </View>
          </View>

          {/* ── Trial disclosure — legally required for App Store / Play Store ── */}
          <View style={styles.trialDisclosure}>
            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} style={styles.trialIcon} />
            <Text style={styles.trialText}>
              Your first 7 days are completely free — no card needed. After that, add a card to continue your 21-day trial. You won't be charged until day 21.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.backgroundPrimary} />
            ) : (
              <Text style={styles.ctaText}>Create account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signinLink}
            onPress={() => router.replace('/auth/signin')}
          >
            <Text style={styles.signinLinkText}>
              Already have an account? <Text style={styles.signinLinkAccent}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundPrimary },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['5xl'],
  },

  // Coach intro
  coachRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
    alignItems: 'flex-start',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarInitial: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 22,
    color: colors.backgroundPrimary,
  },
  bubble: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  bubbleText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 21,
  },

  // Form
  heading: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 32,
    color: colors.textPrimary,
    marginBottom: spacing['2xl'],
  },
  warningBox: {
    backgroundColor: 'rgba(255, 106, 61, 0.1)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.warmAccent,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  warningText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.warmAccent,
    lineHeight: 19,
  },
  errorText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.warmAccent,
    marginBottom: spacing.base,
  },
  fields: { gap: spacing.xl, marginBottom: spacing['2xl'] },
  fieldGroup: { gap: spacing.sm },
  fieldLabel: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  input: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.base,
  },
  trialDisclosure: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.base,
  },
  trialIcon: { marginTop: 1, flexShrink: 0 },
  trialText: {
    flex: 1,
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  ctaButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  ctaText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.backgroundPrimary,
  },
  signinLink: { alignItems: 'center', paddingVertical: spacing.sm },
  signinLinkText: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
  },
  signinLinkAccent: {
    color: colors.accent,
    fontFamily: fonts.sansMedium,
  },

  // Check-email screen
  emailSentContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['5xl'],
    paddingBottom: spacing['5xl'],
    alignItems: 'center',
  },
  emailIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(216, 255, 62, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(216, 255, 62, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  emailSentHeading: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 32,
    color: colors.textPrimary,
    marginBottom: spacing.base,
    textAlign: 'center',
  },
  emailSentBody: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: spacing.base,
  },
  emailHighlight: {
    color: colors.textPrimary,
    fontFamily: fonts.sansMedium,
  },
  emailSentSub: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing['3xl'],
    paddingHorizontal: spacing.md,
  },
});
