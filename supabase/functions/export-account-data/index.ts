// Supabase Edge Function: export-account-data
// Deploy: supabase functions deploy export-account-data
// Requires SERVICE_ROLE_KEY secret (same one used by delete-account).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey  = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    // Verify the caller's JWT before touching any data
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    const admin  = createClient(supabaseUrl, serviceKey);

    const [
      profileRes,
      coachMemoryRes,
      messagesRes,
      messageCountsRes,
      workoutLogsRes,
      nutritionLogsRes,
      weightLogsRes,
      coachSelectionsRes,
    ] = await Promise.all([
      admin.from('profiles').select('*').eq('id', userId).maybeSingle(),
      admin.from('coach_memory').select('*').eq('user_id', userId).order('created_at'),
      admin.from('messages').select('*').eq('user_id', userId).order('created_at'),
      admin.from('message_counts').select('*').eq('user_id', userId),
      admin.from('workout_logs').select('*').eq('user_id', userId).order('date'),
      admin.from('nutrition_logs').select('*').eq('user_id', userId).order('created_at'),
      admin.from('weight_logs').select('*').eq('user_id', userId).order('date'),
      admin.from('coach_selections').select('*').eq('user_id', userId),
    ]);

    // Log per-table errors but return partial data — export is best-effort
    for (const [name, res] of Object.entries({
      profileRes, coachMemoryRes, messagesRes, messageCountsRes,
      workoutLogsRes, nutritionLogsRes, weightLogsRes, coachSelectionsRes,
    })) {
      if ((res as { error: unknown }).error) {
        console.error(`fetch ${name}:`, (res as { error: { message: string } }).error.message);
      }
    }

    const payload = {
      exported_at:      new Date().toISOString(),
      user_id:          userId,
      profile:          profileRes.data          ?? null,
      coach_memory:     coachMemoryRes.data      ?? [],
      messages:         messagesRes.data         ?? [],
      message_counts:   messageCountsRes.data    ?? [],
      workout_logs:     workoutLogsRes.data      ?? [],
      nutrition_logs:   nutritionLogsRes.data    ?? [],
      weight_logs:      weightLogsRes.data       ?? [],
      coach_selections: coachSelectionsRes.data  ?? [],
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
