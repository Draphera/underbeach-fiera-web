-- Consente esclusivamente al backend Supabase service role di verificare
-- che la registrazione esista prima di inviare l'email di conferma.
grant usage on schema public to service_role;
grant select on table public.negozi to service_role;
