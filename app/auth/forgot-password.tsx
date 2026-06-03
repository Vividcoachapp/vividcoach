import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { supabase } from '../../src/services/supabase';
import { Button } from '../../src/components/ui/Button';
import { colors } from '../../src/constants/colors';
import { fonts, spacing, radii } from '../../src/constants/theme';

const RESET_REDIRECT = 'vividcoach://auth/reset-password';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const isSupabaseConfigured =
    !!process.env.EXPO_PUBLIC_SUPABASE_URL &&
    !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  const handleReset = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert(
        'Supabase not configured',
        'Add your EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to the .env file, then restart the server.',
        [{ text: 'Got it' }],
      );
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Enter the email you signed up with.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      trimmedEmail,
      { redirectTo: RESET_REDIRECT },
    );

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setSent(true);
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.emailSentContainer}>
          <View style={styles.emailIconWrap}>
            <Ionicons name="mail-outline" size={40} color={colors.accent} />
          </View>
          <Text style={styles.emailSentHeading}>Check your email.</Text>
          <Text style={styles.emailSentBody}>
            If an account exists for{'\n'}
            <Text style={styles.emailHighlight}>{email.trim().toLowerCase()}</Text>
            {'\n'}we sent a password reset link.
          </Text>
          <Text style={styles.emailSentSub}>
            Tap the link in the email to choose a new password, then sign in again.
          </Text>
          <Button
            label="Back to sign in"
            onPress={() => router.replace('/auth/signin')}
            variant="primary"
            style={{ marginBottom: spacing.xl }}
          />
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.heading}>Reset your password.</Text>
          <Text style={styles.subtext}>
            Enter the email tied to your account and we'll send you a reset link.
          </Text>

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
                autoFocus
                onSubmitEditing={handleReset}
                returnKeyType="send"
              />
            </View>
          </View>

          <Button
            label="Send reset link"
            onPress={handleReset}
            variant="primary"
            loading={loading}
            style={{ marginBottom: spacing.xl }}
          />

          <TouchableOpacity
            style={styles.signinLink}
            onPress={() => router.replace('/auth/signin')}
          >
            <Text style={styles.signinLinkText}>
              Remembered it? <Text style={styles.signinLinkAccent}>Sign in</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing['5xl'],
  },
  backLink: { marginBottom: spacing['2xl'] },
  backLinkText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textSecondary,
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
