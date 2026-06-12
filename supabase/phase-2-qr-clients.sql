-- Fase 2: QR personale e anagrafica clienti per ogni negozio.
create extension if not exists pgcrypto;

-- Ripara un eventuale tentativo precedente che ha creato negozio_id come bigint.
-- La tabella viene ricreata solo se e' ancora vuota, quindi non elimina clienti reali.
do $$
declare
  current_type text;
begin
  if to_regclass('public.clienti') is not null then
    select data_type
    into current_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'clienti'
      and column_name = 'negozio_id';

    if current_type is distinct from 'uuid' then
      if exists (select 1 from public.clienti limit 1) then
        raise exception
          'La tabella public.clienti contiene dati e negozio_id e'' di tipo %. Correggere i dati prima della migrazione.',
          current_type;
      end if;

      drop table public.clienti cascade;
    end if;
  end if;
end $$;

alter table public.negozi
add column if not exists qr_token uuid not null default gen_random_uuid();

create unique index if not exists negozi_qr_token_unique_idx
on public.negozi (qr_token);

create table if not exists public.clienti (
  id uuid primary key default gen_random_uuid(),
  negozio_id uuid not null references public.negozi(id) on delete cascade,
  nome text not null,
  cognome text not null,
  email text,
  telefono text not null,
  citta text not null,
  nascita_giorno smallint check (nascita_giorno is null or nascita_giorno between 1 and 31),
  nascita_mese smallint check (nascita_mese is null or nascita_mese between 1 and 12),
  profili_social text,
  genere text check (genere is null or genere in ('uomo', 'donna', 'non_definito')),
  taglia_seno text,
  taglia_slip text,
  merceologie_interesse text[] not null default '{}',
  privacy_accettata boolean not null default false,
  privacy_accettata_at timestamptz,
  marketing_accettato boolean not null default false,
  fonte text not null default 'qr',
  created_at timestamptz not null default now(),
  unique (negozio_id, telefono)
);

create index if not exists clienti_negozio_created_idx
on public.clienti (negozio_id, created_at desc);

create unique index if not exists clienti_negozio_email_unique_idx
on public.clienti (negozio_id, lower(email))
where email is not null and length(trim(email)) > 0;

alter table public.clienti enable row level security;

grant usage on schema public to authenticated, service_role;
grant select on table public.clienti to authenticated;
grant select, insert, update on table public.clienti to service_role;
grant select on table public.negozi to service_role;

drop policy if exists "store_read_own_customers" on public.clienti;

create policy "store_read_own_customers"
on public.clienti
for select
to authenticated
using (
  exists (
    select 1
    from public.negozi
    where negozi.id = clienti.negozio_id
      and negozi.auth_user_id = auth.uid()
      and coalesce(negozi.attivo, false) is true
  )
);

comment on column public.negozi.qr_token is
'Token pubblico non sequenziale usato dal QR personale del negozio.';

notify pgrst, 'reload schema';
