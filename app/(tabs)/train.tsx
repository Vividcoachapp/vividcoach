import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useOnboardingStore } from '../../src/stores/onboardingStore';
import { useAuthStore } from '../../src/stores/authStore';
import { FREE_COACHES } from '../../src/constants/coaches';
import { sendMessage, generateGreeting, generateObservation } from '../../src/services/ai';
import { loadMessages, saveMessage, CONTEXT_LIMIT } from '../../src/services/messages';
import { fetchRecentWorkouts } from '../../src/services/workouts';
import { fetchRecentMeals } from '../../src/services/nutrition';
import { fetchWeightLogs } from '../../src/services/weight';
import { buildUnifiedContext, hasRecentData } from '../../src/services/context';
import { colors } from '../../src/constants/colors';
import { fonts, spacing, radii } from '../../src/constants/theme';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function TrainScreen() {
  const {
    selectedCoachId,
    coachCustomName,
    vibe,
    goals,
    constraints,
    customConstraint,
    name: userName,
  } = useOnboardingStore();
  const user = useAuthStore((s) => s.user);

  const coach = FREE_COACHES.find((c) => c.id === selectedCoachId) ?? FREE_COACHES[0];
  const displayName = coachCustomName || coach.name;
  const effectiveUserName = userName || (user?.email?.split('@')[0] ?? '');

  const allConstraints = [
    ...constraints,
    ...(customConstraint.trim() ? [customConstraint.trim()] : []),
  ];

  const [messages, setMessages]     = useState<Message[]>([]);
  const [inputText, setInputText]   = useState('');
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [unifiedCtx, setUnifiedCtx] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const isConfigured = !!process.env.EXPO_PUBLIC_ANTHROPIC_KEY;

  const scrollToBottom = (animated = true) => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated }), 80);
  };

  const persist = (role: 'user' | 'assistant', content: string) => {
    if (!user?.id) return;
    saveMessage(user.id, coach.id, role, content).catch(() => {});
  };

  useEffect(() => {
    if (!isConfigured) { setIsLoading(false); return; }

    (async () => {
      try {
        // ── Load everything in parallel ──────────────────────────
        const [history, workouts, meals, lbsWeights, kgWeights] = await Promise.all([
          user?.id ? loadMessages(user.id, coach.id) : Promise.resolve([]),
          user?.id ? fetchRecentWorkouts(user.id, 10) : Promise.resolve([]),
          user?.id ? fetchRecentMeals(user.id, 14) : Promise.resolve([]),
          user?.id ? fetchWeightLogs(user.id, 'lbs', 30) : Promise.resolve([]),
          user?.id ? fetchWeightLogs(user.id, 'kg', 30) : Promise.resolve([]),
        ]);

        // Use whichever unit has more entries
        const weights = lbsWeights.length >= kgWeights.length ? lbsWeights : kgWeights;
        const ctx = buildUnifiedContext(workouts, meals, weights);
        setUnifiedCtx(ctx);

        // ── Case 1: returning user with chat history ─────────────
        if (history.length > 0) {
          setMessages(history);
          setIsLoading(false);
          scrollToBottom(false);

          // Proactive observation — once per day if there's recent logged data
          if (user?.id && ctx && hasRecentData(workouts, meals, weights)) {
            const obsKey = `@obs_date_${user.id}_${coach.id}`;
            const textKey = `@obs_text_${user.id}_${coach.id}`;
            const today = new Date().toISOString().slice(0, 10);
            const lastDate = await AsyncStorage.getItem(obsKey);

            if (lastDate !== today) {
              try {
                const obs = await generateObservation(
                  coach.name, coach.bio, vibe ?? 'warm',
                  effectiveUserName, goals, allConstraints, ctx,
                );
                const obsMsg: Message = { id: `obs-${Date.now()}`, role: 'assistant', content: obs };
                setMessages((prev) => [...prev, obsMsg]);
                persist('assistant', obs);
                scrollToBottom();
                await AsyncStorage.setItem(obsKey, today);
                await AsyncStorage.setItem(textKey, obs);
              } catch {
                // Observation failed silently — chat still loads normally
              }
            }
          }
          return;
        }

        // ── Case 2: first-time user — generate greeting ──────────
        const text = await generateGreeting(
          coach.name, coach.bio, vibe ?? 'warm',
          effectiveUserName, goals, allConstraints, ctx,
        );
        setMessages([{ id: '0', role: 'assistant', content: text }]);
        persist('assistant', text);
        scrollToBottom(false);
      } catch {
        setError('Could not connect — check your Anthropic API key in .env, then restart the server.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isLoading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInputText('');
    setIsLoading(true);
    setError(null);
    scrollToBottom();
    persist('user', text);

    const context = next
      .slice(-CONTEXT_LIMIT)
      .map(({ role, content }) => ({ role, content }));

    try {
      const reply = await sendMessage(
        context,
        coach.name, coach.bio, vibe ?? 'warm',
        effectiveUserName, goals, allConstraints, unifiedCtx,
      );
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: 'assistant', content: reply },
      ]);
      persist('assistant', reply);
      scrollToBottom();
    } catch {
      setError('Failed to get a response — try sending again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Setup screen ────────────────────────────────────────────────────────
  if (!isConfigured) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.setupContainer}>
          <View style={styles.setupIcon}>
            <Ionicons name="key-outline" size={32} color={colors.accent} />
          </View>
          <Text style={styles.setupHeading}>API key needed</Text>
          <Text style={styles.setupBody}>
            Add your Anthropic key to <Text style={styles.setupMono}>.env</Text>:
          </Text>
          <View style={styles.setupCodeBlock}>
            <Text style={styles.setupCode}>EXPO_PUBLIC_ANTHROPIC_KEY=sk-ant-...</Text>
          </View>
          <Text style={styles.setupSub}>Then restart the Expo server with --clear.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Chat screen ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitial}>{coach.name[0]}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.coachName}>{displayName}</Text>
            <Text style={styles.coachLabel}>Your coach</Text>
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {isLoading && messages.length === 0 ? (
            <View style={styles.greetingLoader}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.loaderText}>Getting {displayName} ready…</Text>
            </View>
          ) : (
            messages.map((msg) =>
              msg.role === 'assistant' ? (
                <View key={msg.id} style={styles.coachRow}>
                  <View style={styles.avatarSmall}>
                    <Text style={styles.avatarSmallInitial}>{coach.name[0]}</Text>
                  </View>
                  <View style={styles.coachBubble}>
                    <Text style={styles.coachBubbleText}>{msg.content}</Text>
                  </View>
                </View>
              ) : (
                <View key={msg.id} style={styles.userRow}>
                  <View style={styles.userBubble}>
                    <Text style={styles.userBubbleText}>{msg.content}</Text>
                  </View>
                </View>
              )
            )
          )}

          {isLoading && messages.length > 0 && (
            <View style={styles.coachRow}>
              <View style={styles.avatarSmall}>
                <Text style={styles.avatarSmallInitial}>{coach.name[0]}</Text>
              </View>
              <View style={[styles.coachBubble, styles.typingBubble]}>
                <ActivityIndicator size="small" color={colors.textSecondary} />
              </View>
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}
        </ScrollView>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={`Message ${displayName}…`}
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
            returnKeyType="send"
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
            activeOpacity={0.8}
          >
            <Ionicons
              name="arrow-up"
              size={18}
              color={!inputText.trim() || isLoading ? colors.textSecondary : colors.backgroundPrimary}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundPrimary },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.base,
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontFamily: fonts.serifDisplayItalic, fontSize: 22, color: colors.backgroundPrimary },
  headerInfo: { gap: 2 },
  coachName: { fontFamily: fonts.sansBold, fontSize: 16, color: colors.textPrimary },
  coachLabel: { fontFamily: fonts.mono, fontSize: 11, color: colors.textSecondary, letterSpacing: 0.5 },

  messages: { flex: 1 },
  messagesContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.xl,
    paddingBottom: spacing.base,
    gap: spacing.md,
  },

  greetingLoader: { flex: 1, alignItems: 'center', paddingTop: spacing['3xl'], gap: spacing.md },
  loaderText: { fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary },

  coachRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end', maxWidth: '85%' },
  avatarSmall: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginBottom: 2,
  },
  avatarSmallInitial: { fontFamily: fonts.serifDisplayItalic, fontSize: 13, color: colors.backgroundPrimary },
  coachBubble: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg, borderBottomLeftRadius: radii.sm,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
  },
  coachBubbleText: { fontFamily: fonts.sans, fontSize: 15, color: colors.textPrimary, lineHeight: 22 },
  typingBubble: {
    flex: 0, paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
    alignItems: 'center', justifyContent: 'center', minWidth: 56,
  },

  userRow: { alignSelf: 'flex-end', maxWidth: '80%' },
  userBubble: {
    backgroundColor: colors.accent,
    borderRadius: radii.lg, borderBottomRightRadius: radii.sm,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md,
  },
  userBubbleText: { fontFamily: fonts.sans, fontSize: 15, color: colors.backgroundPrimary, lineHeight: 22 },

  errorText: {
    fontFamily: fonts.sans, fontSize: 13, color: colors.warmAccent,
    textAlign: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
  },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.base, paddingVertical: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1, fontFamily: fonts.sans, fontSize: 15, color: colors.textPrimary,
    backgroundColor: colors.backgroundPrimary, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, paddingHorizontal: spacing.base,
    paddingTop: spacing.md, paddingBottom: spacing.md,
    maxHeight: 120, minHeight: 44,
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: colors.backgroundPrimary, borderWidth: 1, borderColor: colors.border,
  },

  setupContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing['2xl'], gap: spacing.base,
  },
  setupIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(216, 255, 62, 0.1)',
    borderWidth: 1, borderColor: 'rgba(216, 255, 62, 0.3)',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  setupHeading: { fontFamily: fonts.serifDisplayItalic, fontSize: 28, color: colors.textPrimary, textAlign: 'center' },
  setupBody: { fontFamily: fonts.sans, fontSize: 15, color: colors.textSecondary, textAlign: 'center' },
  setupMono: { fontFamily: fonts.mono, color: colors.textPrimary },
  setupCodeBlock: {
    backgroundColor: colors.backgroundSecondary, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.base, paddingVertical: spacing.md, width: '100%',
  },
  setupCode: { fontFamily: fonts.mono, fontSize: 11, color: colors.accent },
  setupSub: { fontFamily: fonts.sans, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
