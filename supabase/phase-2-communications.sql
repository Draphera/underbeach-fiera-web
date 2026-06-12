-- Fase 2: storico inviti e comunicazioni email del negozio.
create table if not exists public.comunicazioni (
  id uuid primary key default gen_random_uuid(),
  negozio_id uuid not null references public.negozi(id) on delete cascade,
  cliente_id uuid references public.clienti(id) on delete set null,
  tipo text not null check (tipo in ('invito', 'cliente')),
  destinatario_email text not null,
  destinatario_nome text,
  oggetto text not null,
  messaggio text not null,
  stato text not null check (stato in ('inviata', 'errore')),
  provider_id text,
  provider_error text,
  created_at timestamptz not null default now()
);

create index if not exists comunicazioni_negozio_created_idx
on public.comunicazioni (negozio_id, created_at desc);

alter table public.comunicazioni enable row level security;

grant usage on schema public to authenticated, service_role;
grant select on table public.comunicazioni to authenticated;
grant select, insert on table public.comunicazioni to service_role;

drop policy if exists "store_read_own_communications" on public.comunicazioni;

create policy "store_read_own_communications"
on public.comunicazioni
for select
to authenticated
using (
  exists (
    select 1
    from public.negozi
    where negozi.id = comunicazioni.negozio_id
      and negozi.auth_user_id = auth.uid()
      and coalesce(negozi.attivo, false) is true
  )
);

notify pgrst, 'reload schema';
