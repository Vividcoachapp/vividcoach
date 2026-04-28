import { Exercise } from './workouts';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

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

function buildSystemPrompt(
  coachName: string,
  coachBio: string,
  vibe: string,
  userName: string,
  goals: string,
  constraints: string[],
  unifiedContext?: string,
): string {
  const vibeGuide =
    vibe === 'warm'
      ? 'warm, encouraging, and supportive — you meet people where they are and celebrate progress'
      : vibe === 'direct'
        ? 'direct and efficient — no fluff, just clear guidance and results-focused'
        : 'high-energy and intense — you push hard, celebrate loud, and believe everyone has more in them';

  const parts: string[] = [];
  if (goals.trim()) parts.push(`Goal: ${goals.trim()}.`);
  if (constraints.length > 0) parts.push(`Constraints: ${constraints.join(', ')}.`);

  const contextBlock = unifiedContext
    ? `\n\nActivity log — training, nutrition, and weight by day:\n${unifiedContext}`
    : '';

  return `You are ${coachName}, a personal fitness coach. ${coachBio}

Your coaching style is ${vibeGuide}.

You are coaching ${userName || 'your client'}. ${parts.join(' ')}${contextBlock}

You are the coach who connects the dots across all three areas: training performance, nutrition, and weight. When data is available, actively look for patterns — how nutrition affects workout effort and recovery, how weight trends relate to eating patterns, how consistency (or gaps) in any area shows up in the others. Reference specific data points when they're relevant. Bring these connections up naturally — don't wait to be asked. This is what makes you different from every other coach.

Keep responses concise — 2-4 sentences unless laying out a plan. Stay in character as ${coachName}.`.trim();
}

export async function sendMessage(
  messages: ChatMessage[],
  coachName: string,
  coachBio: string,
  vibe: string,
  userName: string,
  goals: string,
  constraints: string[],
  unifiedContext?: string,
  maxTokens = 512,
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_KEY;
  if (!apiKey) throw new Error('EXPO_PUBLIC_ANTHROPIC_KEY not set in .env');

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: buildSystemPrompt(coachName, coachBio, vibe, userName, goals, constraints, unifiedContext),
      messages,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Anthropic ${response.status}: ${body}`);
  }

  const data = await response.json();
  return (data.content[0] as { text: string }).text;
}

export async function generateGreeting(
  coachName: string,
  coachBio: string,
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
    coachName, coachBio, vibe, userName, goals, constraints, unifiedContext,
  );
}

export async function generateWeeklyRecap(
  coachName: string,
  coachBio: string,
  vibe: string,
  userName: string,
  goals: string,
  constraints: string[],
  unifiedContext: string,
): Promise<string> {
  return sendMessage(
    [{
      role: 'user',
      content: `Write a personalized weekly fitness recap for ${userName || 'your client'} based on their last 7 days of logged data. Be specific — reference actual exercises, meals, and weight numbers from the log. Acknowledge real wins. Note any meaningful patterns you see across training, nutrition, and weight. End with one forward-looking note for next week. Write as ${coachName}. 3-5 sentences. Personal and direct.`,
    }],
    coachName, coachBio, vibe, userName, goals, constraints, unifiedContext,
  );
}

export async function generateWorkoutQuote(
  coachName: string,
  coachBio: string,
  vibe: string,
  userName: string,
  workoutSummary: string,
): Promise<string> {
  return sendMessage(
    [{
      role: 'user',
      content: `${userName || 'Your client'} just finished this workout: ${workoutSummary}. Give them one punchy line — no longer than 15 words. No intro, no explanation, no quotes around it. Just the line.`,
    }],
    coachName, coachBio, vibe, userName, '', [], undefined, 80,
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
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_KEY;
  if (!apiKey) return null;
  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 80,
        system: 'You are a nutrition database. Estimate macros for meal descriptions. Return ONLY a JSON object with integer fields: calories, protein, carbs, fat. No units, no explanation.',
        messages: [{
          role: 'user',
          content: `Estimate macros for: "${description}"\n\nJSON only: {"calories":450,"protein":35,"carbs":42,"fat":12}`,
        }],
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const text = ((data.content[0] as { text: string }).text ?? '').trim();
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) return null;
    const p = JSON.parse(match[0]);
    return {
      calories: Math.round(Math.abs(Number(p.calories) || 0)),
      protein:  Math.round(Math.abs(Number(p.protein)  || 0)),
      carbs:    Math.round(Math.abs(Number(p.carbs)    || 0)),
      fat:      Math.round(Math.abs(Number(p.fat)      || 0)),
    };
  } catch {
    return null;
  }
}

// ── Natural language workout parser ──────────────────────────────────────────
export async function parseWorkoutDescription(description: string): Promise<Exercise[]> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_KEY;
  if (!apiKey) throw new Error('EXPO_PUBLIC_ANTHROPIC_KEY not set');

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      system: `You are a workout parser. Convert natural language workout descriptions into structured JSON arrays. Return ONLY valid JSON — no explanation, no markdown, no code fences.`,
      messages: [{
        role: 'user',
        content: `Parse this workout: "${description}"

Return a JSON array. Each exercise object uses these fields:
- name: string (title case)
- type: "strength" | "cardio" | "other"
- Strength fields (optional): sets, reps, weight, unit ("lbs" or "kg")
- Cardio fields (optional): duration_minutes, distance, distance_unit ("km" or "mi")
- Other fields (optional): duration_minutes

Example output:
[{"name":"Bench Press","type":"strength","sets":3,"reps":10,"weight":135,"unit":"lbs"},{"name":"Running","type":"cardio","distance":2,"distance_unit":"mi"}]

JSON array only.`,
      }],
    }),
  });

  if (!response.ok) throw new Error(`API error ${response.status}`);

  const data = await response.json();
  const text = ((data.content[0] as { text: string }).text ?? '').trim();

  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array in response');

  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed)) throw new Error('Response is not an array');
  return parsed as Exercise[];
}

export async function generateObservation(
  coachName: string,
  coachBio: string,
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
    coachName, coachBio, vibe, userName, goals, constraints, unifiedContext,
  );
}
