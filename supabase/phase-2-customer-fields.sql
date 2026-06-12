-- Adegua l'anagrafica clienti ai campi richiesti dal progetto.
alter table public.clienti
alter column email drop not null;

alter table public.clienti
add column if not exists nascita_giorno smallint,
add column if not exists nascita_mese smallint,
add column if not exists profili_social text,
add column if not exists genere text,
add column if not exists taglia_seno text,
add column if not exists taglia_slip text,
add column if not exists merceologie_interesse text[] not null default '{}';

alter table public.clienti
drop constraint if exists clienti_negozio_id_email_key;

alter table public.clienti
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

create unique index if not exists clienti_negozio_email_unique_idx
on public.clienti (negozio_id, lower(email))
where email is not null and length(trim(email)) > 0;

create unique index if not exists clienti_negozio_telefono_unique_idx
on public.clienti (negozio_id, telefono)
where telefono is not null and length(trim(telefono)) > 0;

notify pgrst, 'reload schema';
