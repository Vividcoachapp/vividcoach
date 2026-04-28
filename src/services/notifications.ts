import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { CoachVibe } from '../constants/coaches';

// ── Notification identifiers ───────────────────────────────────────────────
const ID = {
  dailyCheckin: 'vc-daily-checkin',
  momentumNudge: 'vc-momentum-nudge',
  weeklyRecap:   'vc-weekly-recap',
} as const;

// ── Coach-voiced message pools ─────────────────────────────────────────────
const MESSAGES: Record<string, Record<CoachVibe, string[]>> = {
  checkin: {
    warm: [
      "How's your day going? Ready to log something?",
      "Checking in — what are you working on today?",
      "Even a small log counts. How are you moving?",
      "Hey — still thinking about you. Come tell me about your day.",
    ],
    direct: [
      "Time to log. What did you do today?",
      "Don't let today go untracked. Log it.",
      "What's the plan? Log it and let's move.",
      "Thirty seconds. Log today's activity.",
    ],
    intense: [
      "Day's not done until it's logged. What did you put in?",
      "Champions track everything. What's yours for today?",
      "Log it. Every session, every meal. That's the standard.",
      "No excuses. Log today's work.",
    ],
  },
  nudge: {
    warm: [
      "Haven't heard from you in a couple days. What's going on?",
      "I noticed you've been quiet. Let's get back on track together.",
      "Miss you. Log something — anything. We'll build from there.",
      "Two days without logging. I'm still here whenever you're ready.",
    ],
    direct: [
      "Two days without logging. Don't let it become three.",
      "You've gone quiet. Log something today — doesn't matter what.",
      "Inactivity doesn't build anything. One log. Right now.",
      "Two days down. Today's the day to get back on track.",
    ],
    intense: [
      "Two days off. That ends today.",
      "You didn't come this far to go quiet. Get back in.",
      "Every day you skip, someone else doesn't. Time to move.",
      "The gap closes when you show up. Today.",
    ],
  },
  recap: {
    warm: [
      "Your weekly recap is ready — come see what we built together.",
      "Week's done. Your recap is waiting whenever you are.",
      "I put together your weekly summary. Proud of what you logged.",
      "New week, new start. First, let's look at what you did last week.",
    ],
    direct: [
      "Weekly recap's done. Numbers are in — let's look.",
      "Your week, summarized. Open it.",
      "Recap's ready. See what you put in this week.",
      "Week closed. Recap open. What did the data say?",
    ],
    intense: [
      "Your week, laid out. No hiding from the numbers.",
      "Recap's live. How hard did you really work this week?",
      "Weekly recap ready. Let's see if you earned it.",
      "The scoreboard is up. Come see your week.",
    ],
  },
};

function pick(type: keyof typeof MESSAGES, vibe: CoachVibe): string {
  const pool = MESSAGES[type][vibe] ?? MESSAGES[type].warm;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Foreground handler — must be called before any scheduling ──────────────
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

// ── Permission request ─────────────────────────────────────────────────────
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── Daily check-in — every day at 8 am ────────────────────────────────────
async function scheduleDailyCheckin(coachName: string, vibe: CoachVibe): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(ID.dailyCheckin).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: ID.dailyCheckin,
    content: {
      title: coachName,
      body: pick('checkin', vibe),
      sound: true,
    },
    trigger: { hour: 8, minute: 0, repeats: true } as never,
  });
}

// ── Momentum nudge — fires 2 days from now at 9 am if not rescheduled ─────
export async function scheduleMomentumNudge(coachName: string, vibe: CoachVibe): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(ID.momentumNudge).catch(() => {});

  const fire = new Date();
  fire.setDate(fire.getDate() + 2);
  fire.setHours(9, 0, 0, 0);

  await Notifications.scheduleNotificationAsync({
    identifier: ID.momentumNudge,
    content: {
      title: coachName,
      body: pick('nudge', vibe),
      sound: true,
    },
    trigger: { date: fire } as never,
  });
}

// ── Weekly recap — every Monday at 9 am ───────────────────────────────────
async function scheduleWeeklyRecap(coachName: string, vibe: CoachVibe): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(ID.weeklyRecap).catch(() => {});
  await Notifications.scheduleNotificationAsync({
    identifier: ID.weeklyRecap,
    content: {
      title: `${coachName} · Weekly Recap`,
      body: pick('recap', vibe),
      sound: true,
    },
    // weekday 2 = Monday (1=Sun … 7=Sat on iOS)
    trigger: { weekday: 2, hour: 9, minute: 0, repeats: true } as never,
  });
}

// ── Cancel everything (sign-out) ──────────────────────────────────────────
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ── Full setup — call once after permissions granted ──────────────────────
export async function setupNotifications(coachName: string, vibe: CoachVibe): Promise<void> {
  const granted = await requestNotificationPermissions();
  if (!granted) return;

  await Promise.all([
    scheduleDailyCheckin(coachName, vibe),
    scheduleWeeklyRecap(coachName, vibe),
    scheduleMomentumNudge(coachName, vibe),
  ]);
}
