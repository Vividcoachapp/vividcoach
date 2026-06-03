import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import * as Linking from 'expo-linking';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '../../src/services/supabase';
import { Button } from '../../src/components/ui/Button';
import { colors } from '../../src/constants/colors';
import { fonts, spacing, radii } from '../../src/constants/theme';

type Phase = 'loading' | 'ready' | 'invalid';

const MIN_PASSWORD_LENGTH = 8;

// Supabase puts recovery tokens in the URL fragment (implicit flow):
// vividcoach://auth/reset-password#access_token=...&refresh_token=...&type=recovery
function parseHashParams(url: string): Record<string, string> {
  const hashIdx = url.indexOf('#');
  if (hashIdx === -1) return {};
  const fragment = url.slice(hashIdx + 1);
  const result: Record<string, string> = {};
  for (const pair of fragment.split('&')) {
    if (!pair) continue;
    const eqIdx = pair.indexOf('=');
    const k = eqIdx === -1 ? pair : pair.slice(0, eqIdx);
    const v = eqIdx === -1 ? '' : pair.slice(eqIdx + 1);
    if (k) result[decodeURIComponent(k)] = decodeURIComponent(v);
  }
  return result;
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    let adopted = false;

    const adoptRecoveryFromUrl = async (url: string | null) => {
      if (!url || adopted) return false;
      const params = parseHashParams(url);
      const accessToken = params.access_token;
      const refreshToken = params.refresh_token;
      if (!accessToken || !refreshToken) return false;
      adopted = true;
      const { error: setErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (!active) return true;
      if (setErr) {
        setError(setErr.message);
        setPhase('invalid');
        return true;
      }
      setPhase('ready');
      return true;
    };

    const sub = Linking.addEventListener('url', ({ url }) => {
      void adoptRecoveryFromUrl(url);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY' && active) setPhase('ready');
      },
    );

    (async () => {
      const initial = await Linking.getInitialURL();
      const handled = await adoptRecoveryFromUrl(initial);
      if (handled || !active) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      if (session) {
        setPhase('ready');
      } else {
        setError(
          'This reset link is missing or expired. Request a new one from the sign-in screen.',
        );
        setPhase('invalid');
      }
    })();

    return () => {
      active = false;
      sub.remove();
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdate = async () => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.replace('/home');
  };

  if (phase === 'loading') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (phase === 'invalid') {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.invalidContainer}>
          <View style={styles.invalidIconWrap}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.warmAccent} />
          </View>
          <Text style={styles.invalidHeading}>Link expired.</Text>
          <Text style={styles.invalidBody}>
            {error || 'This reset link is no longer valid. Request a new one and try again.'}
          </Text>
          <Button
            label="Request a new link"
            onPress={() => router.replace('/auth/forgot-password')}
            variant="primary"
            style={{ marginBottom: spacing.base }}
          />
          <TouchableOpacity
            style={styles.signinLink}
            onPress={() => router.replace('/auth/signin')}
          >
            <Text style={styles.signinLinkText}>
              <Text style={styles.signinLinkAccent}>Back to sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.heading}>Choose a new password.</Text>
          <Text style={styles.subtext}>
            Pick something you'll remember — at least {MIN_PASSWORD_LENGTH} characters.
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.fields}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder="Type it again"
                placeholderTextColor={colors.textSecondary}
                value={confirm}
                onChangeText={setConfirm}
                secureTextEntry
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleUpdate}
                returnKeyType="go"
              />
            </View>
          </View>

          <Button
            label="Update password"
            onPress={handleUpdate}
            variant="primary"
            loading={loading}
            style={{ marginBottom: spacing.base }}
          />

          <TouchableOpacity
            style={styles.signinLink}
            onPress={() => router.replace('/auth/signin')}
          >
            <Text style={styles.signinLinkText}>
              <Text style={styles.signinLinkAccent}>Cancel</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundPrimary },
  flex: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['3xl'],
    paddingBottom: spacing['5xl'],
  },
  heading: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 32,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  subtext: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing['2xl'],
    lineHeight: 22,
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
  invalidContainer: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['5xl'],
    paddingBottom: spacing['5xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  invalidIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 122, 90, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 122, 90, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
  },
  invalidHeading: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 32,
    color: colors.textPrimary,
    marginBottom: spacing.base,
    textAlign: 'center',
  },
  invalidBody: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: spacing['3xl'],
    paddingHorizontal: spacing.md,
  },
});
