alter table public.negozi enable row level security;

grant usage on schema public to anon, authenticated;

grant insert (
  ragione_sociale,
  indirizzo,
  cap,
  citta,
  provincia,
  telefono_negozio,
  partita_iva,
  referente_nome,
  referente_cognome,
  referente_cellulare,
  email,
  sito_internet,
  social,
  logo_url,
  privacy_accettata,
  privacy_accettata_at,
  created_at
) on public.negozi to anon, authenticated;

drop policy if exists "public_store_registration" on public.negozi;

create policy "public_store_registration"
on public.negozi
for insert
to anon, authenticated
with check (
  privacy_accettata is true
  and privacy_accettata_at is not null
  and email is not null
  and length(trim(email)) >= 5
  and partita_iva is not null
  and length(trim(partita_iva)) = 11
  and coalesce(attivo, false) is false
  and attivato_at is null
);

do $$
declare
  sequence_name text;
begin
  sequence_name := pg_get_serial_sequence('public.negozi', 'id');

  if sequence_name is not null then
    execute format('grant usage, select on sequence %s to anon, authenticated', sequence_name);
  end if;
end $$;
