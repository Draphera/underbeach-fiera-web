-- Fase 2: collega ogni negozio al proprio account Supabase Auth.
alter table public.negozi
add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
add column if not exists access_invited_at timestamptz,
add column if not exists activation_email_sent_at timestamptz;

create unique index if not exists negozi_auth_user_id_unique_idx
on public.negozi (auth_user_id)
where auth_user_id is not null;

grant usage on schema public to service_role;
grant select, update on table public.negozi to service_role;

comment on column public.negozi.auth_user_id is
'Account Supabase Auth assegnato al negozio.';

comment on column public.negozi.access_invited_at is
'Data dell ultima generazione delle credenziali temporanee.';

comment on column public.negozi.activation_email_sent_at is
'Data dell ultimo invio riuscito della mail di attivazione.';
