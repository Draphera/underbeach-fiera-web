-- Architettura comunicazioni Fase 2: SMTP, deep link e automatismi eventi.
alter table public.comunicazioni
add column if not exists canale text not null default 'email',
add column if not exists provider text,
add column if not exists automazione_id uuid,
add column if not exists event_key text;

update public.comunicazioni set provider = 'resend' where provider is null;
alter table public.comunicazioni alter column provider set default 'smtp_aruba';
alter table public.comunicazioni alter column provider set not null;

create table if not exists public.automazioni_eventi (
  id uuid primary key default gen_random_uuid(),
  negozio_id uuid not null references public.negozi(id) on delete cascade,
  tipo text not null check (tipo in ('compleanno', 'natale', 'pasqua', 'ferragosto', 'capodanno', 'black_friday', 'saldi', 'sconto_settimanale', 'offerta_mensile', 'campagna_stagionale', 'promozione')),
  nome text not null,
  oggetto text not null,
  messaggio text not null,
  codice_sconto text,
  sconto_percentuale smallint check (sconto_percentuale is null or sconto_percentuale between 1 and 100),
  mese smallint check (mese is null or mese between 1 and 12),
  giorno smallint check (giorno is null or giorno between 1 and 31),
  attiva boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'comunicazioni_automazione_id_fkey'
      and conrelid = 'public.comunicazioni'::regclass
  ) then
    alter table public.comunicazioni
    add constraint comunicazioni_automazione_id_fkey
    foreign key (automazione_id) references public.automazioni_eventi(id) on delete set null;
  end if;
end $$;

create index if not exists automazioni_eventi_negozio_idx
on public.automazioni_eventi (negozio_id, attiva, tipo);
create unique index if not exists comunicazioni_event_key_unique_idx
on public.comunicazioni (event_key)
where event_key is not null;

alter table public.automazioni_eventi enable row level security;
grant select on table public.automazioni_eventi to authenticated;
grant select, insert, update, delete on table public.automazioni_eventi to service_role;
grant update on table public.comunicazioni to service_role;

drop policy if exists "store_read_own_automations" on public.automazioni_eventi;
create policy "store_read_own_automations" on public.automazioni_eventi
for select to authenticated
using (
  exists (
    select 1 from public.negozi
    where negozi.id = automazioni_eventi.negozio_id
      and negozi.auth_user_id = auth.uid()
      and coalesce(negozi.attivo, false) is true
  )
);

notify pgrst, 'reload schema';
