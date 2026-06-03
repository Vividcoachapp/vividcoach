import { supabase } from './supabase';

export type AnalyticsEvent =
  | 'app_open'
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_email_entered'
  | 'onboarding_signup_attempted'
  | 'onboarding_signup_failed'
  | 'onboarding_apple_sso_tapped'
  | 'account_created'
  | 'paywall_viewed'
  | 'paywall_abandoned'
  | 'paywall_converted'
  | 'coach_changed'
  | 'coach_session_cta_tapped'
  | 'coach_chat_cta_tapped'
  | 'weekly_recap_generated'
  | 'plan_generated'
  | 'plan_day_completed'
  | 'weight_logged'
  | 'notification_scheduled'
  | 'js_render_error'
  // Open string for any additional ad-hoc events
  | (string & {});

type EventProperties = Record<string, unknown>;

export async function trackEvent(event: AnalyticsEvent, properties: EventProperties = {}): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const row = {
      user_id: user?.id ?? null,
      event,
      properties,
    };
    const { error } = await supabase.from('analytics_events').insert(row);
    if (error) {
      console.warn('[analytics] insert failed:', event, error.message);
    }
  } catch (e) {
    console.warn('[analytics] tracking error:', event, e);
  }
}
