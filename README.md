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
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=Underbeach <registrazioni@your-verified-domain.com>
```

Le stesse variabili devono essere configurate anche su Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

`SUPABASE_SERVICE_ROLE_KEY` e le variabili Resend non devono avere il prefisso `NEXT_PUBLIC_`: vengono usate solo dalla route server-side. La service role verifica che la richiesta email corrisponda a una registrazione realmente salvata; non deve mai essere esposta nel browser. Il dominio del mittente configurato in `RESEND_FROM_EMAIL` deve essere verificato su Resend.

Senza le variabili Supabase form e dashboard non possono comunicare con il database. Senza le variabili Resend la registrazione viene salvata, ma la schermata finale segnala che la mail di conferma non e' stata inviata.

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

## Dati demo

Per la presentazione sono disponibili 8 negozi demo realistici in:

```txt
data/demo-negozi.csv
```

Controllo senza scrivere su Supabase:

```bash
npm run seed:demo:dry
```

Inserimento su Supabase usando `.env.local`:

```bash
npm run seed:demo
```

Lo script prova a inserire anche i campi `attivo` e `attivato_at`; se non sono disponibili nella tabella, ritenta automaticamente con i soli campi base.

Per abilitare la vista attivazioni nella dashboard, eseguire nel SQL Editor di Supabase:

```txt
supabase/add-activation-columns.sql
```

Dopo aver aggiunto le colonne, aggiornare gli stati dei negozi demo:

```bash
npm run seed:demo:status
```

Se Supabase blocca l'update da client anon con le policy RLS, non e' un errore del progetto: il file SQL sopra contiene gia' gli update degli stati demo e va eseguito dal SQL Editor.

## Database Supabase

La dashboard e il form usano la tabella `negozi`.

Prima di pubblicare l'aggiornamento email/privacy, eseguire nel SQL Editor:

```txt
supabase/add-registration-email-privacy.sql
```

Se le colonne sono gia' state create ma il form restituisce `403 permission denied`, eseguire:

```txt
supabase/fix-public-registration-policy.sql
```

La policy consente ai visitatori solo l'inserimento di una nuova registrazione con consenso privacy. Non concede lettura, modifica, cancellazione o attivazione dei negozi.

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
- `email`
- `sito_internet`
- `social`
- `logo_url`
- `created_at`
- `privacy_accettata`
- `privacy_accettata_at`

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
