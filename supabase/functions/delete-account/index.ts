// Supabase Edge Function: delete-account
// Deploy: supabase functions deploy delete-account
// Requires SUPABASE_SERVICE_ROLE_KEY env secret set in Supabase dashboard.

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

    // Verify the calling user's JWT
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

    // Delete user data in dependency order.
    // Most tables cascade from profiles, but we delete explicitly for clarity.
    const userTables = [
      'coach_memory',
      'messages',
      'message_counts',
      'workout_logs',
      'nutrition_logs',
      'weight_logs',
      'coach_selections',
    ];

    for (const table of userTables) {
      const { error } = await admin.from(table).delete().eq('user_id', userId);
      if (error) console.error(`delete ${table}:`, error.message);
    }

    // profiles uses id, not user_id
    const { error: profileError } = await admin.from('profiles').delete().eq('id', userId);
    if (profileError) console.error('delete profiles:', profileError.message);

    // Remove the auth.users record (requires service role)
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(userId);
    if (deleteAuthError) throw deleteAuthError;

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
