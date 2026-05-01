// Supabase Edge Function: ai-tasks
// Deploy: supabase functions deploy ai-tasks
// Secrets required: XAI_API_KEY, ANTHROPIC_API_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const XAI_URL         = 'https://api.x.ai/v1/chat/completions';
const XAI_MODEL       = 'grok-3-mini';
const ANTHROPIC_URL   = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const GROK_TIMEOUT_MS = 8000;

// ── Provider helpers ──────────────────────────────────────────────────────────

async function callGrok(
  system: string,
  user: string,
  maxTokens: number,
  apiKey: string,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROK_TIMEOUT_MS);
  try {
    const res = await fetch(XAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: XAI_MODEL,
        temperature: 0,
        max_tokens: maxTokens,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`xAI ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error('xAI: empty response content');
    return text as string;
  } finally {
    clearTimeout(timer);
  }
}

async function callClaude(
  system: string,
  user: string,
  maxTokens: number,
  apiKey: string,
): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Anthropic: empty response content');
  return text as string;
}

async function callWithFallback(
  system: string,
  user: string,
  maxTokens: number,
  xaiKey: string,
  anthropicKey: string,
): Promise<string> {
  try {
    return await callGrok(system, user, maxTokens, xaiKey);
  } catch (err) {
    console.warn('Grok failed, falling back to Claude:', (err as Error).message);
    return await callClaude(system, user, maxTokens, anthropicKey);
  }
}

// ── Task handlers ─────────────────────────────────────────────────────────────

async function handleEstimateMacros(
  input: string,
  xaiKey: string,
  anthropicKey: string,
): Promise<Record<string, number>> {
  const system = 'You are a nutrition database. Estimate macros for meal descriptions. Return ONLY a JSON object with integer fields: calories, protein, carbs, fat. No units, no explanation.';
  const user   = `Estimate macros for: "${input}"\n\nJSON only: {"calories":450,"protein":35,"carbs":42,"fat":12}`;

  const text  = await callWithFallback(system, user, 80, xaiKey, anthropicKey);
  const match = text.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error('No JSON object in response');

  const p = JSON.parse(match[0]);
  return {
    calories: Math.round(Math.abs(Number(p.calories) || 0)),
    protein:  Math.round(Math.abs(Number(p.protein)  || 0)),
    carbs:    Math.round(Math.abs(Number(p.carbs)    || 0)),
    fat:      Math.round(Math.abs(Number(p.fat)      || 0)),
  };
}

async function handleParseWorkout(
  input: string,
  xaiKey: string,
  anthropicKey: string,
): Promise<unknown[]> {
  const system = 'You are a workout parser. Convert natural language workout descriptions into structured JSON arrays. Return ONLY valid JSON — no explanation, no markdown, no code fences.';
  const user   = `Parse this workout: "${input}"

Return a JSON array. Each exercise object uses these fields:
- name: string (title case)
- type: "strength" | "cardio" | "other"
- Strength fields (optional): sets, reps, weight, unit ("lbs" or "kg")
- Cardio fields (optional): duration_minutes, distance, distance_unit ("km" or "mi")
- Other fields (optional): duration_minutes

Example output:
[{"name":"Bench Press","type":"strength","sets":3,"reps":10,"weight":135,"unit":"lbs"},{"name":"Running","type":"cardio","distance":2,"distance_unit":"mi"}]

JSON array only.`;

  const text  = await callWithFallback(system, user, 512, xaiKey, anthropicKey);
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array in response');

  const parsed = JSON.parse(match[0]);
  if (!Array.isArray(parsed)) throw new Error('Response is not an array');
  return parsed;
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const xaiKey       = Deno.env.get('XAI_API_KEY') ?? '';
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';
    console.log('[ai-tasks] env check:', {
      XAI_API_KEY_present:       !!xaiKey,
      XAI_API_KEY_length:        xaiKey.length,
      ANTHROPIC_API_KEY_present: !!anthropicKey,
      ANTHROPIC_API_KEY_length:  anthropicKey.length,
      SUPABASE_URL_present:      !!(Deno.env.get('SUPABASE_URL') ?? ''),
      SUPABASE_URL_length:       (Deno.env.get('SUPABASE_URL') ?? '').length,
      SUPABASE_ANON_KEY_present: !!(Deno.env.get('SUPABASE_ANON_KEY') ?? ''),
      SUPABASE_ANON_KEY_length:  (Deno.env.get('SUPABASE_ANON_KEY') ?? '').length,
    });
    if (!xaiKey || !anthropicKey) {
      return new Response(JSON.stringify({ error: 'AI keys not configured on server' }), {
        status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { task, input } = body ?? {};
    if (!task || !input) {
      return new Response(JSON.stringify({ error: 'Missing task or input' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    let result: unknown;
    switch (task) {
      case 'estimateMacros':
        result = await handleEstimateMacros(input, xaiKey, anthropicKey);
        break;
      case 'parseWorkout':
        result = await handleParseWorkout(input, xaiKey, anthropicKey);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown task: ${task}` }), {
          status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify({ result }), {
      status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('ai-tasks error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
