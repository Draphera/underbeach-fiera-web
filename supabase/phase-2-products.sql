-- Fase 2, punto 6: catalogo prodotti dei negozi.
create table if not exists public.prodotti (
  id uuid primary key default gen_random_uuid(),
  negozio_id uuid not null references public.negozi(id) on delete cascade,
  nome text not null,
  sku text,
  categoria text not null,
  descrizione text,
  prezzo numeric(10, 2) not null check (prezzo >= 0),
  prezzo_promozionale numeric(10, 2),
  taglie text[] not null default '{}',
  colori text[] not null default '{}',
  quantita integer not null default 0 check (quantita >= 0),
  immagine_url text,
  pubblicato boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prodotti_prezzo_promozionale_check
    check (
      prezzo_promozionale is null
      or (prezzo_promozionale >= 0 and prezzo_promozionale <= prezzo)
    )
);

create index if not exists prodotti_negozio_updated_idx
on public.prodotti (negozio_id, updated_at desc);

create unique index if not exists prodotti_negozio_sku_unique_idx
on public.prodotti (negozio_id, lower(sku))
where sku is not null and length(trim(sku)) > 0;

alter table public.prodotti enable row level security;

grant usage on schema public to authenticated, service_role;
grant select on table public.prodotti to authenticated;
grant select, insert, update, delete on table public.prodotti to service_role;

drop policy if exists "store_read_own_products" on public.prodotti;
create policy "store_read_own_products"
on public.prodotti
for select
to authenticated
using (
  exists (
    select 1
    from public.negozi
    where negozi.id = prodotti.negozio_id
      and negozi.auth_user_id = auth.uid()
      and coalesce(negozi.attivo, false) is true
  )
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'underbeach-products',
  'underbeach-products',
  true,
  6291456,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

notify pgrst, 'reload schema';
