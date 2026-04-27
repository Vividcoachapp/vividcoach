import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../../src/stores/authStore';
import { fetchRecentWorkouts, formatWorkoutDate, exerciseMeta, WorkoutLog } from '../../src/services/workouts';
import { colors } from '../../src/constants/colors';
import { fonts, spacing, radii } from '../../src/constants/theme';

function WorkoutCard({ workout }: { workout: WorkoutLog }) {
  const exerciseNames = workout.exercises.map((e) => e.name);
  const summary = exerciseNames.slice(0, 3).join(' · ') +
    (exerciseNames.length > 3 ? ` +${exerciseNames.length - 3} more` : '');

  return (
    <View style={styles.workoutCard}>
      <View style={styles.workoutCardTop}>
        <Text style={styles.workoutDate}>{formatWorkoutDate(workout.date)}</Text>
        {workout.perceived_effort && (
          <View style={styles.effortBadge}>
            <Text style={styles.effortBadgeText}>{workout.perceived_effort}/10</Text>
          </View>
        )}
      </View>

      <Text style={styles.workoutExercises}>{summary || 'Workout logged'}</Text>

      <View style={styles.workoutDetails}>
        {workout.exercises.map((e, i) => {
          const meta = exerciseMeta(e);
          return (
            <Text key={i} style={styles.workoutDetailRow}>
              <Text style={styles.workoutDetailName}>{e.name}</Text>
              {meta ? <Text style={styles.workoutDetailMeta}>{'  '}{meta}</Text> : null}
            </Text>
          );
        })}
      </View>

      {workout.notes ? (
        <Text style={styles.workoutNotes} numberOfLines={2}>{workout.notes}</Text>
      ) : null}
    </View>
  );
}

export default function ProgressScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [workouts, setWorkouts] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) { setLoading(false); return; }
      setLoading(true);
      fetchRecentWorkouts(user.id, 20)
        .then(setWorkouts)
        .catch(() => setWorkouts([]))
        .finally(() => setLoading(false));
    }, [user?.id]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Fixed header — always visible, never scrolls away ── */}
      <View style={styles.pageHeader}>
        <Text style={styles.screenTitle}>Progress</Text>
        <TouchableOpacity
          style={styles.logBtn}
          onPress={() => router.push('/log-workout')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color={colors.backgroundPrimary} />
          <Text style={styles.logBtnText}>Log Workout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : workouts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="barbell-outline" size={28} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyHeading}>No workouts logged yet.</Text>
            <Text style={styles.emptyBody}>
              Tap "Log workout" after a session and your coach will remember every rep.
            </Text>
            <TouchableOpacity
              style={styles.emptyCtaBtn}
              onPress={() => router.push('/log-workout')}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyCtaBtnText}>Log your first workout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>{workouts.length} WORKOUT{workouts.length !== 1 ? 'S' : ''} LOGGED</Text>
            {workouts.map((w) => (
              <WorkoutCard key={w.id} workout={w} />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundPrimary },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing['5xl'],
  },

  pageHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.base,
    paddingBottom: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
    backgroundColor: colors.backgroundPrimary,
  },
  screenTitle: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 32,
    color: colors.textPrimary,
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 15,
  },
  logBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.backgroundPrimary,
  },

  sectionLabel: {
    fontFamily: fonts.mono,
    fontSize: 10,
    color: colors.textSecondary,
    letterSpacing: 1.5,
    marginBottom: spacing.base,
  },

  loadingState: {
    paddingTop: spacing['5xl'],
    alignItems: 'center',
  },

  emptyState: {
    paddingTop: spacing['3xl'],
    alignItems: 'center',
    gap: spacing.base,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyHeading: {
    fontFamily: fonts.serifDisplayItalic,
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.xl,
  },
  emptyCtaBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing['2xl'],
  },
  emptyCtaBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
    color: colors.backgroundPrimary,
  },

  // Workout cards
  workoutCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  workoutCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workoutDate: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.textPrimary,
  },
  effortBadge: {
    backgroundColor: 'rgba(216, 255, 62, 0.12)',
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(216, 255, 62, 0.3)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  effortBadgeText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: colors.accent,
    letterSpacing: 0.5,
  },
  workoutExercises: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    color: colors.textSecondary,
  },
  workoutDetails: { gap: 4 },
  workoutDetailRow: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 20,
  },
  workoutDetailName: {
    fontFamily: fonts.sansMedium,
    color: colors.textPrimary,
  },
  workoutDetailMeta: {
    fontFamily: fonts.mono,
    fontSize: 12,
    color: colors.textSecondary,
  },
  workoutNotes: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    fontStyle: 'italic',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
});
