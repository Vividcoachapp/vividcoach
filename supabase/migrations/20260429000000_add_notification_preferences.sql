-- Add notification preferences and quiet hours to profiles
-- Defaults: quiet hours disabled, all notifications on

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quiet_hours_start    time    NOT NULL DEFAULT '21:00:00',
  ADD COLUMN IF NOT EXISTS quiet_hours_end      time    NOT NULL DEFAULT '09:00:00',
  ADD COLUMN IF NOT EXISTS notify_daily_checkin boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_momentum      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_weekly_recap  boolean NOT NULL DEFAULT true;
