-- Run this in Supabase Dashboard → SQL Editor
-- Adds macro columns to nutrition_logs for calorie / macro tracking

ALTER TABLE nutrition_logs
  ADD COLUMN IF NOT EXISTS calories_kcal INTEGER,
  ADD COLUMN IF NOT EXISTS protein_g     NUMERIC(6, 1),
  ADD COLUMN IF NOT EXISTS carbs_g       NUMERIC(6, 1),
  ADD COLUMN IF NOT EXISTS fat_g         NUMERIC(6, 1),
  ADD COLUMN IF NOT EXISTS macros_source TEXT; -- 'ai_estimate' | 'barcode'
