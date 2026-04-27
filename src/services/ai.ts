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
