import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useOnboardingStore } from '../src/stores/onboardingStore';
import { ALL_COACHES } from '../src/constants/coaches';
import { Exercise, exerciseMeta } from '../src/services/workouts';
import { generateWorkoutQuote } from '../src/services/ai';
import { colors } from '../src/constants/colors';
import { fonts, spacing, radii } from '../src/constants/theme';

const AVATAR_BG: Record<string, string> = {
  warm: colors.warmAccent,
  direct: colors.accent,
  intense: colors.warmAccent,
};
const AVATAR_FG: Record<string, string> = {
  warm: '#ffffff',
  direct: colors.backgroundPrimary,
  intense: '#ffffff',
};

const FALLBACK_QUOTE: Record<string, string> = {
  warm:    'You showed up today. That\'s the whole game.',
  direct:  'Work done. Logged. Now recover.',
  intense: 'You earned every rep. Own it.',
};

function formatExerciseLine(ex: Exercise): string {
  const meta = exerciseMeta(ex);
  return meta ? `${ex.name}  ·  ${meta}` : ex.name;
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function WorkoutShareScreen() {
  const router = useRouter();
  const {
    name: userName,
    selectedCoachId,
    coachCustomName,
    vibe,
  } = useOnboardingStore();

  const coach = ALL_COACHES.find((c) => c.id === selectedCoachId) ?? ALL_COACHES[0];
  const displayName = coachCustomName || coach.name;
  const coachVibe = vibe ?? 'warm';

  const {
    exercises: exercisesJson,
    effort: effortParam,
    notes: notesParam,
    date: dateParam,
  } = useLocalSearchParams<{
    exercises: string;
    effort: string;
    notes: string;
    date: string;
  }>();

  const exercises: Exercise[] = (() => {
    try { return JSON.parse(exercisesJson ?? '[]') as Exercise[]; }
    catch { return []; }
  })();

  const effort = effortParam ? parseInt(effortParam) || null : null;
  const date = dateParam ?? '';

  const [quote, setQuote] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);

  useEffect(() => {
    const workoutSummary =
      exercises.map((ex) => {
        const meta = exerciseMeta(ex);
        return meta ? `${ex.name} (${meta})` : ex.name;
      }).join(', ') + (effort ? `. Effort ${effort}/10` : '');

    generateWorkoutQuote(coach.name, coach.bio, coachVibe, userName, workoutSummary)
      .then(setQuote)
      .catch(() => setQuote(FALLBACK_QUOTE[coachVibe]))
      .finally(() => setQuoteLoading(false));
  }, []);

  const handleShare = async () => {
    const exerciseLines = exercises
      .map((ex) => { const m = exerciseMeta(ex); return m ? `${ex.name} · ${m}` : ex.name; })
      .join('\n');

    await Share.share({
      title: 'My workout with VividCoach',
      message:
        `Workout complete.\n\n${exerciseLines}` +
        (effort ? `\nEffort: ${effort}/10` : '') +
        (quote ? `\n\n"${quote}" — ${displayName}` : '') +
        `\n\nCoached by ${displayName} · VividCoach`,
    });
  };

  const handleDone = () => router.back();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.backBtn} />
        <Text style={styles.headerTitle}>Workout complete</Text>
        <TouchableOpacity onPress={handleDone} hitSlop={12} style={styles.doneBtn}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Share card ─────────────────────────────── */}
        <View style={styles.card}>
          {/* Card header: brand + date */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardBrand}>VividCoach</Text>
            <Text style={styles.cardDate}>{date}</Text>
          </View>

          <View style={styles.divider} />

          {/* Coach identity */}
          <View style={styles.coachRow}>
            <View style={[styles.avatar, { backgroundColor: AVATAR_BG[coachVibe] }]}>
              <Text style={[styles.avatarInitial, { color: AVATAR_FG[coachVibe] }]}>
                {coach.name[0]}
              </Text>
            </View>
            <View style={styles.coachInfo}>
              <Text style={styles.coachName}>{displayName}</Text>
              <Text style={styles.coachVibe}>{coachVibe.toUpperCase()} COACH</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Workout list */}
          <View style={styles.workoutSection}>
            <Text style={styles.workoutLabel}>WORKOUT</Text>
            {exercises.map((ex, i) => (
              <View key={i} style={styles.exerciseRow}>
                <View style={styles.exerciseDot} />
                <View style={styles.exerciseTextBlock}>
                  <Text style={styles.exerciseName}>{ex.name}</Text>
                  {exerciseMeta(ex) ? (
                    <Text style={styles.exerciseMeta}>{exerciseMeta(ex)}</Text>
                  ) : null}
                </View>
              </View>
            ))}
            {effort && (
              <Text style={styles.effortLine}>Effort {effort}/10</Text>
            )}
          </View>

          <View style={styles.divider} />

          {/* Coach quote */}
          <View style={styles.quoteSection}>
            {quoteLoading ? (
              <View style={styles.quoteLoading}>
                <ActivityIndicator color={colors.accent} size="small" />
                <Text style={styles.quoteLoadingText}>
                  {displayName} is writing your note…
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.quoteText}>"{quote}"</Text>
                <Text style={styles.quoteAttrib}>— {displayName}</Text>
              </>
            )}
          </View>
        </View>

        <Text style={styles.screenshotHint}>
          Screenshot the card above to save it to Photos.
        </Text>

        {/* ── Actions ──────────────────────────────── */}
        <TouchableOpacity
          style={styles.shareBtn}
          onPress={handleShare}
          activeOpacity={0.85}
        >
          <Ionicons name="share-outline" size={18} color={colors.backgroundPrimary} />
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => router.navigate('/train')}
          activeOpacity={0.85}
        >
          <Text style={styles.chatBtnText}>
            Tell {displayName} about this session →
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundPrimary },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  backBtn: { width: 44 },
  headerTitle: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  doneBtn: { width: 44, alignItems: 'flex-end' },
  doneBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 15,
    color: colors.accent,
  },

  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
    paddingBottom: spacing['5xl'],
    gap: spacing.base,
  },

  // ── Share card ──────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(216,255,62,0.35)',
    padding: spacing.xl,
    gap: spacing.base,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardBrand: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 22,
    color: colors.accent,
  },
  cardDate: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },

  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 20,
  },
  coachInfo: { gap: 2 },
  coachName: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  coachVibe: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: colors.accent,
    letterSpacing: 1.5,
  },

  workoutSection: { gap: spacing.sm },
  workoutLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  exerciseDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
    marginTop: 7,
    flexShrink: 0,
  },
  exerciseTextBlock: { flex: 1 },
  exerciseName: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  exerciseMeta: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
  effortLine: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },

  quoteSection: {
    gap: spacing.xs,
  },
  quoteLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  quoteLoadingText: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  quoteText: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 19,
    color: colors.textPrimary,
    lineHeight: 27,
  },
  quoteAttrib: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 0.5,
  },

  // ── Below-card elements ─────────────────────────────────────────────────────
  screenshotHint: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },

  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 16,
  },
  shareBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.backgroundPrimary,
  },

  chatBtn: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  chatBtnText: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
