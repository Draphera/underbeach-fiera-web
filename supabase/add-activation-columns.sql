alter table public.negozi
add column if not exists attivo boolean default false,
add column if not exists attivato_at timestamptz;

update public.negozi
set
  attivo = true,
  attivato_at = coalesce(attivato_at, now())
where partita_iva in (
  '04123890401',
  '04590170403',
  '05824410658',
  '04421020270'
);

update public.negozi
set
  attivo = false,
  attivato_at = null
where partita_iva in (
  '03988260408',
  '02765070398',
  '06641891218',
  '07190350821'
);
