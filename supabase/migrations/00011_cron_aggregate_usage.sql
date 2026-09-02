-- ============================================================================
-- Schedule the `aggregate-usage` Edge Function to run daily via pg_cron.
--
-- The previous version of this migration read the project ref and service role
-- key from `current_setting('request.jwt.claim.*')`. Those settings only exist
-- inside a PostgREST request context — a scheduled cron job has no request, so
-- they resolve to NULL and the HTTP call silently fails. `service_role_key` is
-- also never a JWT claim to begin with.
--
-- The supported pattern is to keep the function URL and service role key in
-- Supabase Vault and read them at execution time via `vault.decrypted_secrets`.
-- ============================================================================

-- Required extensions.
create extension if not exists pg_cron;
create extension if not exists pg_net;
-- `supabase_vault` provides the `vault` schema used below.
create extension if not exists supabase_vault;

-- ----------------------------------------------------------------------------
-- Store the invocation secrets in Vault.
--
-- Replace the placeholder values below (or set them once via the SQL editor /
-- `vault.create_secret(...)`) so they match your project. Re-running this
-- migration will NOT overwrite existing secrets thanks to the NOT EXISTS guard.
--
--   * project_url        -> https://<project-ref>.supabase.co
--   * service_role_key   -> your project's service_role JWT
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'project_url') then
    perform vault.create_secret(
      'https://YOUR_PROJECT_REF.supabase.co',
      'project_url',
      'Base URL used by scheduled jobs to reach Edge Functions'
    );
  end if;

  if not exists (select 1 from vault.secrets where name = 'service_role_key') then
    perform vault.create_secret(
      'YOUR_SERVICE_ROLE_KEY',
      'service_role_key',
      'Service role key used to authenticate scheduled Edge Function calls'
    );
  end if;
end
$$;

-- ----------------------------------------------------------------------------
-- (Re)create the daily schedule. Unschedule first so the migration is
-- idempotent and safe to re-run without stacking duplicate jobs.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from cron.job where jobname = 'aggregate-usage-daily') then
    perform cron.unschedule('aggregate-usage-daily');
  end if;
end
$$;

-- '0 0 * * *' = 00:00 UTC every day.
select cron.schedule(
  'aggregate-usage-daily',
  '0 0 * * *',
  $$
    select net.http_post(
      url := (
        select decrypted_secret from vault.decrypted_secrets where name = 'project_url'
      ) || '/functions/v1/aggregate-usage',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
        )
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 30000
    );
  $$
);
