import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { fonts, spacing, radii } from '../constants/theme';

interface Props {
  children: React.ReactNode;
  fallbackLabel?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[VividCoach] Uncaught error:', error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>💫</Text>
          <Text style={styles.heading}>Something went sideways</Text>
          <Text style={styles.body}>
            {this.props.fallbackLabel ?? 'This part of the app ran into an issue.'}
          </Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => this.setState({ error: null })}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
    gap: spacing.md,
    backgroundColor: '#0e100f',
  },
  emoji: { fontSize: 40, marginBottom: spacing.sm },
  heading: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 24,
    color: '#f4f1ea',
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: '#8c8a82',
    textAlign: 'center',
    lineHeight: 21,
  },
  btn: {
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: spacing['2xl'],
    paddingVertical: spacing.md,
  },
  btnText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: '#0e100f',
  },
});
