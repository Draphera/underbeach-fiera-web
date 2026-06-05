# Underbeach Fiera Web

Applicazione web per la raccolta e la gestione dei lead dei negozianti durante la fiera Underbeach / Maredamare 2026.

Il progetto e' pensato per un flusso rapido da QR code: landing page, scelta lingua, form di registrazione, salvataggio su Supabase e dashboard operativa per consultare e attivare i negozi registrati.

## Funzionalita

- Landing page mobile-first per accesso da QR code.
- Form multilingua con validazione client-side.
- Upload logo negozio su Supabase Storage.
- Inserimento lead nella tabella Supabase `negozi`.
- Dashboard protetta con login Supabase Auth.
- Ricerca, filtri e conteggi dei lead.
- Attivazione/disattivazione negozio quando la tabella espone i campi `attivo` e `attivato_at`.
- Deploy serverless su Vercel.

## Stack

- Next.js 14 con App Router
- React 18
- TypeScript
- Supabase JS
- Supabase PostgreSQL, Auth e Storage
- Vercel
- CSS custom modulare

## Struttura

```txt
app/
  page.tsx              Landing page
  form/page.tsx         Form pubblico per negozianti
  dashboard/page.tsx    Dashboard operatori
  success/page.tsx      Pagina di conferma

components/
  form/                 Componenti form
  ui/                   Componenti UI condivisi

lib/
  i18n.ts               Copy multilingua
  supabase.ts           Client Supabase lazy-safe
  use-language.ts       Stato lingua persistente

styles/
  core/                 Token, reset, layout e tipografia
  dashboard/            Stili dashboard
  form/                 Stili form
  home/                 Stili landing page
  ui/                   Stili componenti UI
  visual/               Background e visual pack
```

## Variabili ambiente

Creare un file `.env.local` in sviluppo locale:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Le stesse variabili devono essere configurate anche su Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Senza queste variabili il build non deve rompersi, ma form e dashboard non possono comunicare con Supabase.

## Setup locale

Installare le dipendenze:

```bash
npm install
```

Avviare il server di sviluppo:

```bash
npm run dev
```

Aprire:

```txt
http://localhost:3000
```

Build di produzione:

```bash
npm run build
```

Avvio dopo build:

```bash
npm run start
```

## Database Supabase

La dashboard e il form usano la tabella `negozi`.

Campi principali attesi:

- `id`
- `ragione_sociale`
- `indirizzo`
- `cap`
- `citta`
- `provincia`
- `telefono_negozio`
- `partita_iva`
- `referente_nome`
- `referente_cognome`
- `referente_cellulare`
- `sito_internet`
- `social`
- `logo_url`
- `created_at`

Campi opzionali per l'attivazione dalla dashboard:

- `attivo`
- `attivato_at`

Se i campi di attivazione non esistono, la dashboard passa in modalita' sola lettura.

## Storage Supabase

Il form carica i loghi nel bucket:

```txt
underbeach-logos
```

Il bucket deve permettere l'upload dal client secondo le policy Supabase configurate per il progetto.

## Deploy Vercel

Il deploy avviene collegando il repository GitHub a Vercel.

Impostazioni consigliate:

- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Output Directory: automatico
- Install Command: `npm install`

Dopo aver aggiunto o modificato le variabili ambiente su Vercel, eseguire un nuovo deploy.

## Note operative

- Non committare `.env.local`.
- La chiave `NEXT_PUBLIC_SUPABASE_ANON_KEY` e' pubblica per natura, ma le Row Level Security e le policy Supabase devono proteggere i dati.
- La dashboard richiede un utente Supabase Auth abilitato.
- Prima di pubblicare modifiche importanti, eseguire sempre `npm run build`.
