-- 1. Add push_token column to agencies table
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS push_token TEXT;

-- 2. Enable pg_cron extension (run once as superuser)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. Schedule the Edge Function every day at 5:00 AM UTC
-- Adjust timezone: Morocco is UTC+1 (UTC+0 in winter), so 5am Morocco = 4am UTC
SELECT cron.schedule(
  'notify-same-day-turnovers',   -- job name
  '0 4 * * *',                   -- every day at 04:00 UTC (= 05:00 Morocco time)
  $$
  SELECT net.http_post(
    url     := 'https://apzarvjxvwtlphdqirjm.supabase.co/functions/v1/notify-same-day-turnovers',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Verify the job was created
SELECT * FROM cron.job WHERE jobname = 'notify-same-day-turnovers';
