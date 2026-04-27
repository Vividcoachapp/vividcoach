const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

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
  recentWorkouts?: string,
  recentMeals?: string,
  recentWeight?: string,
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

  const workoutSection = recentWorkouts
    ? `\n\nRecent workouts:\n${recentWorkouts}`
    : '';
  const mealSection = recentMeals
    ? `\n\nRecent meals:\n${recentMeals}`
    : '';
  const weightSection = recentWeight
    ? `\n\n${recentWeight}`
    : '';

  return `You are ${coachName}, a personal fitness coach. ${coachBio}

Your coaching style is ${vibeGuide}.

You are coaching ${userName || 'your client'}. ${parts.join(' ')}${workoutSection}${mealSection}${weightSection}

Keep responses concise — 2-4 sentences unless laying out a workout plan. Stay in character as ${coachName}. Reference their goals, constraints, workouts, meals, or weight trend when relevant.`.trim();
}

export async function sendMessage(
  messages: ChatMessage[],
  coachName: string,
  coachBio: string,
  vibe: string,
  userName: string,
  goals: string,
  constraints: string[],
  recentWorkouts?: string,
  recentMeals?: string,
  recentWeight?: string,
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
      max_tokens: 512,
      system: buildSystemPrompt(coachName, coachBio, vibe, userName, goals, constraints, recentWorkouts, recentMeals, recentWeight),
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
  recentWorkouts?: string,
  recentMeals?: string,
  recentWeight?: string,
): Promise<string> {
  return sendMessage(
    [
      {
        role: 'user',
        content: `Introduce yourself briefly to ${userName || 'me'} and ask what they want to work on today. One or two sentences — be natural, not salesy.`,
      },
    ],
    coachName,
    coachBio,
    vibe,
    userName,
    goals,
    constraints,
    recentWorkouts,
    recentMeals,
    recentWeight,
  );
}
