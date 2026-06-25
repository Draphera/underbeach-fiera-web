-- Fase 3: estensione eventi automatici per dashboard negozio.
alter table public.automazioni_eventi
drop constraint if exists automazioni_eventi_tipo_check;

alter table public.automazioni_eventi
add constraint automazioni_eventi_tipo_check
check (
  tipo in (
    'compleanno',
    'natale',
    'pasqua',
    'ferragosto',
    'capodanno',
    'black_friday',
    'saldi',
    'sconto_settimanale',
    'offerta_mensile',
    'campagna_stagionale',
    'promozione'
  )
);

notify pgrst, 'reload schema';
