import { Platform, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '../../services/supabase';
import { colors } from '../../constants/colors';
import { radii } from '../../constants/theme';

interface AppleSignInButtonProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export function AppleSignInButton({ onSuccess, onError }: AppleSignInButtonProps) {
  const [available, setAvailable] = useState<boolean | null>(null);

  if (Platform.OS !== 'ios') return null;

  if (available === null) {
    AppleAuthentication.isAvailableAsync()
      .then((ok) => setAvailable(ok))
      .catch(() => setAvailable(false));
    return null;
  }
  if (!available) return null;

  const handlePress = async () => {
    try {
      const rawNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${Date.now()}-${Math.random()}`,
      );
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: rawNonce,
      });

      if (!credential.identityToken) {
        onError?.('Apple did not return an identity token. Try again.');
        return;
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) {
        onError?.(error.message);
        return;
      }

      onSuccess?.();
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err?.code === 'ERR_REQUEST_CANCELED') return;
      onError?.(err?.message ?? 'Sign in with Apple failed.');
    }
  };

  return (
    <View style={styles.wrap}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={radii.md}
        style={styles.button}
        onPress={handlePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  button: { width: '100%', height: 50, backgroundColor: colors.textPrimary },
});
