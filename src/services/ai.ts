import { supabase } from './supabase';
import { Exercise } from './workouts';

// ── Coach-voiced fallback messages shown when AI is unavailable ───────────────
export const AI_FALLBACKS: Record<string, string[]> = {
  warm: [
    "I'm having a moment — connection hiccup on my end. Send that again?",
    "Something got lost in transit. Try again and I'll be right here.",
    "Network's not cooperating. I'm still with you — just resend.",
  ],
  direct: [
    "Connection issue. Resend.",
    "Didn't come through. Try again.",
    "Network error. Send it again.",
  ],
  intense: [
    "Not letting a network glitch stop us. Resend — let's go.",
    "Glitch. Send it again. Don't stop here.",
    "Connection dropped. Bounce back and resend.",
  ],
};

export function pickFallback(vibe: string): string {
  const pool = AI_FALLBACKS[vibe] ?? AI_FALLBACKS.warm;
  return pool[Math.floor(Math.random() * pool.length)];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendMessage(
  messages: ChatMessage[],
  coachId: number,
  vibe: string,
  userName: string,
  goals: string,
  constraints: string[],
  unifiedContext?: string,
  maxTokens = 512,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('coach-chat', {
    body: { messages, coachId, vibe, userName, goals, constraints, unifiedContext, maxTokens },
  });
  if (error) throw new Error(error.message);
  if (!data?.text) throw new Error('Unexpected response from coach-chat');
  return data.text as string;
}

export async function generateGreeting(
  coachId: number,
  vibe: string,
  userName: string,
  goals: string,
  constraints: string[],
  unifiedContext?: string,
): Promise<string> {
  return sendMessage(
    [{
      role: 'user',
      content: `Introduce yourself briefly to ${userName || 'me'} and ask what they want to work on today. One or two sentences — be natural, not salesy.`,
    }],
    coachId, vibe, userName, goals, constraints, unifiedContext,
  );
}

export async function generateWeeklyRecap(
  coachId: number,
  vibe: string,
  userName: string,
  goals: string,
  constraints: string[],
  unifiedContext: string,
): Promise<string> {
  return sendMessage(
    [{
      role: 'user',
      content: `Write a personalized weekly fitness recap for ${userName || 'your client'} based on their last 7 days of logged data. Be specific — reference actual exercises, meals, and weight numbers from the log. Acknowledge real wins. Note any meaningful patterns you see across training, nutrition, and weight. End with one forward-looking note for next week. Write as your coach persona. 3-5 sentences. Personal and direct.`,
    }],
    coachId, vibe, userName, goals, constraints, unifiedContext,
  );
}

export async function generateWorkoutQuote(
  coachId: number,
  vibe: string,
  userName: string,
  workoutSummary: string,
): Promise<string> {
  return sendMessage(
    [{
      role: 'user',
      content: `${userName || 'Your client'} just finished this workout: ${workoutSummary}. Give them one punchy line — no longer than 15 words. No intro, no explanation, no quotes around it. Just the line.`,
    }],
    coachId, vibe, userName, '', [], undefined, 80,
  );
}

// ── Macro estimator — uses Claude to estimate calories/macros from a meal description ─
export interface MacroEstimateResult {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export async function estimateMacros(description: string): Promise<MacroEstimateResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-tasks', {
      body: { task: 'estimateMacros', input: description },
    });
    if (error || !data?.result) return null;
    return data.result as MacroEstimateResult;
  } catch {
    return null;
  }
}

// ── Natural language workout parser ──────────────────────────────────────────
export async function parseWorkoutDescription(description: string): Promise<Exercise[]> {
  const { data, error } = await supabase.functions.invoke('ai-tasks', {
    body: { task: 'parseWorkout', input: description },
  });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data?.result)) throw new Error('Unexpected response from ai-tasks');
  return data.result as Exercise[];
}

export async function generateObservation(
  coachId: number,
  vibe: string,
  userName: string,
  goals: string,
  constraints: string[],
  unifiedContext: string,
): Promise<string> {
  return sendMessage(
    [{
      role: 'user',
      content: `You haven't spoken with ${userName || 'your client'} since they last logged data. Looking at their recent activity log, share one specific observation that connects patterns across their training, nutrition, and/or weight — something they might not have noticed themselves. Reference actual data points. Be direct and specific. 2-3 sentences, no question at the end.`,
    }],
    coachId, vibe, userName, goals, constraints, unifiedContext,
  );
}
