alter table public.negozi
add column if not exists email text,
add column if not exists privacy_accettata boolean not null default false,
add column if not exists privacy_accettata_at timestamptz;

create index if not exists negozi_email_idx
on public.negozi (lower(email));

comment on column public.negozi.email is
'Email del referente usata per la conferma della registrazione.';

comment on column public.negozi.privacy_accettata is
'Consenso privacy espresso durante la registrazione.';

comment on column public.negozi.privacy_accettata_at is
'Data e ora UTC in cui il consenso privacy e stato espresso.';
