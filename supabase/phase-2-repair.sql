-- Audit e riparazione consolidata della Fase 2.
-- Eseguibile piu' volte dopo gli script phase-2-* senza perdere dati.
create extension if not exists pgcrypto;

-- Account negozio e QR personale.
alter table public.negozi
add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
add column if not exists access_invited_at timestamptz,
add column if not exists activation_email_sent_at timestamptz,
add column if not exists qr_token uuid default gen_random_uuid();

update public.negozi set qr_token = gen_random_uuid() where qr_token is null;
alter table public.negozi alter column qr_token set default gen_random_uuid();
alter table public.negozi alter column qr_token set not null;

create unique index if not exists negozi_auth_user_id_unique_idx
on public.negozi (auth_user_id) where auth_user_id is not null;
create unique index if not exists negozi_qr_token_unique_idx
on public.negozi (qr_token);

-- Completa una tabella clienti eventualmente creata da una versione precedente.
alter table public.clienti
alter column email drop not null;

alter table public.clienti
add column if not exists nascita_giorno smallint,
add column if not exists nascita_mese smallint,
add column if not exists profili_social text,
add column if not exists genere text,
add column if not exists taglia_seno text,
add column if not exists taglia_slip text,
add column if not exists merceologie_interesse text[] not null default '{}',
add column if not exists privacy_accettata boolean not null default false,
add column if not exists privacy_accettata_at timestamptz,
add column if not exists marketing_accettato boolean not null default false,
add column if not exists fonte text not null default 'qr',
add column if not exists created_at timestamptz not null default now();

alter table public.clienti
drop constraint if exists clienti_negozio_id_email_key,
drop constraint if exists clienti_nascita_giorno_check,
drop constraint if exists clienti_nascita_mese_check,
drop constraint if exists clienti_genere_check;

alter table public.clienti
add constraint clienti_nascita_giorno_check
  check (nascita_giorno is null or nascita_giorno between 1 and 31),
add constraint clienti_nascita_mese_check
  check (nascita_mese is null or nascita_mese between 1 and 12),
add constraint clienti_genere_check
  check (genere is null or genere in ('uomo', 'donna', 'non_definito'));

create index if not exists clienti_negozio_created_idx
on public.clienti (negozio_id, created_at desc);
create unique index if not exists clienti_negozio_email_unique_idx
on public.clienti (negozio_id, lower(email))
where email is not null and length(trim(email)) > 0;
create unique index if not exists clienti_negozio_telefono_unique_idx
on public.clienti (negozio_id, telefono)
where telefono is not null and length(trim(telefono)) > 0;

-- Permessi server e lettura isolata per account negozio.
alter table public.negozi enable row level security;
alter table public.clienti enable row level security;
alter table public.comunicazioni enable row level security;
alter table public.prodotti enable row level security;

grant usage on schema public to authenticated, service_role;
grant select on table public.negozi, public.clienti, public.comunicazioni, public.prodotti to authenticated;
grant select, update on table public.negozi to service_role;
grant select, insert, update on table public.clienti to service_role;
grant select, insert on table public.comunicazioni to service_role;
grant select, insert, update, delete on table public.prodotti to service_role;

drop policy if exists "store_read_own_profile" on public.negozi;
create policy "store_read_own_profile" on public.negozi
for select to authenticated
using (auth.uid() = auth_user_id and coalesce(attivo, false) is true);

drop policy if exists "store_read_own_customers" on public.clienti;
create policy "store_read_own_customers" on public.clienti
for select to authenticated
using (
  exists (
    select 1 from public.negozi
    where negozi.id = clienti.negozio_id
      and negozi.auth_user_id = auth.uid()
      and coalesce(negozi.attivo, false) is true
  )
);

drop policy if exists "store_read_own_communications" on public.comunicazioni;
create policy "store_read_own_communications" on public.comunicazioni
for select to authenticated
using (
  exists (
    select 1 from public.negozi
    where negozi.id = comunicazioni.negozio_id
      and negozi.auth_user_id = auth.uid()
      and coalesce(negozi.attivo, false) is true
  )
);

drop policy if exists "store_read_own_products" on public.prodotti;
create policy "store_read_own_products" on public.prodotti
for select to authenticated
using (
  exists (
    select 1 from public.negozi
    where negozi.id = prodotti.negozio_id
      and negozi.auth_user_id = auth.uid()
      and coalesce(negozi.attivo, false) is true
  )
);

-- Bucket pubblici; gli upload passano esclusivamente dalle API server-side.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('underbeach-logos', 'underbeach-logos', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('underbeach-products', 'underbeach-products', true, 6291456, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
