-- Fase 2, blocco 2: ogni account negozio legge esclusivamente il proprio profilo.
alter table public.negozi enable row level security;

grant usage on schema public to authenticated;
grant select on table public.negozi to authenticated;

drop policy if exists "store_read_own_profile" on public.negozi;

create policy "store_read_own_profile"
on public.negozi
for select
to authenticated
using (
  auth.uid() = auth_user_id
  and coalesce(attivo, false) is true
);
