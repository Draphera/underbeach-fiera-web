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
UNDERBEACH_SMTP_HOST=smtp.pro2dev.com
UNDERBEACH_SMTP_PORT=465
UNDERBEACH_SMTP_USER=underbeach@pro2dev.com
UNDERBEACH_SMTP_PASSWORD=your-smtp-password
UNDERBEACH_SMTP_FROM=Underbeach <underbeach@pro2dev.com>
CRON_SECRET=replace-with-a-long-random-secret
UNDERBEACH_ADMIN_EMAILS=admin@example.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Le stesse variabili devono essere configurate anche su Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `UNDERBEACH_ADMIN_EMAILS`
- `NEXT_PUBLIC_APP_URL`

`SUPABASE_SERVICE_ROLE_KEY` e le variabili Resend non devono avere il prefisso `NEXT_PUBLIC_`: vengono usate solo dalla route server-side. La service role verifica che la richiesta email corrisponda a una registrazione realmente salvata; non deve mai essere esposta nel browser. Il dominio del mittente configurato in `RESEND_FROM_EMAIL` deve essere verificato su Resend.

Le variabili `UNDERBEACH_SMTP_*` alimentano esclusivamente le comunicazioni
negozio-cliente tramite Aruba. `CRON_SECRET` protegge l'esecuzione giornaliera
degli eventi automatici e deve essere una stringa casuale lunga.

`UNDERBEACH_ADMIN_EMAILS` contiene uno o piu' indirizzi operatore separati da
virgola. Solo questi utenti possono attivare o disattivare gli account negozio.
`NEXT_PUBLIC_APP_URL` deve contenere l'URL pubblico dell'app, senza slash finale.

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

Se la route email restituisce `permission denied for table negozi` durante la
verifica della registrazione, eseguire anche:

```text
supabase/fix-service-role-registration-verification.sql
```

Lo script concede la lettura della tabella soltanto al ruolo server-side
`service_role`; non espone i negozi ai visitatori pubblici.

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
- `auth_user_id`
- `access_invited_at`
- `activation_email_sent_at`

Se i campi di attivazione non esistono, la dashboard passa in modalita' sola lettura.

## Fase 2 - attivazione account negozio

Prima di usare il nuovo pulsante di attivazione, eseguire nel SQL Editor:

```text
supabase/phase-2-store-activation.sql
```

L'attivazione viene eseguita dalla route server-side: crea un utente Supabase
Auth con ruolo `store`, collega l'utente al negozio e invia tramite Resend una
password temporanea. La disattivazione sospende anche l'accesso Auth. Se l'invio
Resend fallisce, l'attivazione viene annullata per evitare account attivi senza
credenziali consegnate.

### Accesso e password negozio

Eseguire anche:

```text
supabase/phase-2-store-access.sql
```

L'area negozio e' disponibile in `/negozio`. Accetta esclusivamente utenti Auth
con ruolo `store`; al primo accesso richiede la sostituzione della password
temporanea. Il recupero password usa Supabase Auth e torna alla stessa pagina.
Nel pannello Supabase Auth, l'URL pubblico dell'app e l'indirizzo
`https://tuo-dominio/negozio` devono essere inclusi tra i Redirect URLs ammessi.

### Gestione profilo negozio

Per configurare il bucket dei loghi eseguire:

```text
supabase/phase-2-store-profile.sql
```

Da `/negozio` il titolare puo' aggiornare sede, contatti, referente, sito,
social e logo. Ragione sociale e partita IVA sono sempre in sola lettura.
L'aggiornamento passa dalla route server-side `/api/store/profile`, che verifica
sessione, ruolo `store`, stato attivo e collegamento `auth_user_id`. Se cambia
l'email, vengono aggiornati insieme il profilo e l'account Supabase Auth.

### QR personale e clienti

Eseguire nel SQL Editor:

```text
supabase/phase-2-qr-clients.sql
```

Ogni negozio riceve un `qr_token` non sequenziale. La dashboard genera un QR
scaricabile che apre `/cliente/[token]`, dove il cliente puo' registrarsi con
consenso privacy e consenso marketing opzionale. La tabella `clienti` e'
protetta da RLS: l'account negozio legge esclusivamente i clienti associati al
proprio `auth_user_id`. Gli inserimenti pubblici passano dalla route server-side
e non richiedono permessi anonimi diretti sul database.

### Comunicazioni email

Eseguire nel SQL Editor:

```text
supabase/phase-2-communications.sql
```

Il centro comunicazioni permette di invitare un nuovo contatto con un pulsante
verso `/cliente/[qr_token]`, la stessa registrazione aperta dal QR personale.
Permette inoltre di scrivere ai clienti registrati che hanno accettato il
marketing. Gli invii usano Resend, vengono registrati nella tabella
`comunicazioni` e hanno un limite iniziale di 50 email per negozio ogni ora.

### Campi registrazione cliente

Per aggiornare una tabella `clienti` gia' esistente eseguire:

```text
supabase/phase-2-customer-fields.sql
```

Sono obbligatori nome, cognome, citta, cellulare, consenso privacy e consenso
alle informazioni commerciali. Sono opzionali email, giorno e mese di nascita,
profili social, genere, taglia seno, taglia slip e le merceologie di interesse:
Beachwear, Abbigliamento, Underwear, Lingerie, Maglieria intima e Calzetteria.

### Catalogo prodotti

Eseguire nel SQL Editor:

```text
supabase/phase-2-products.sql
```

Il modulo Prodotti della dashboard gestisce immagini, SKU, categorie, prezzi e
promozioni, taglie, colori, quantita' disponibile e stato bozza/pubblicato. Ogni
account visualizza e modifica esclusivamente il catalogo del proprio negozio.
Le immagini vengono salvate nel bucket pubblico `underbeach-products`.

### Verifica e riparazione Fase 2

Se gli script della Fase 2 sono stati eseguiti in momenti diversi, eseguire una
volta la migrazione consolidata e rieseguibile:

```text
supabase/phase-2-repair.sql
```

La migrazione completa i campi mancanti dei clienti e riallinea indici, grant,
policy RLS, token QR e bucket Storage senza eliminare i dati esistenti.

### Architettura comunicazioni Fase 2

Eseguire nel SQL Editor:

```text
supabase/phase-2-communication-path.sql
```

Resend resta riservato alle email transazionali: registrazione negozio,
attivazione account e conferma registrazione cliente. Inviti, comunicazioni ed
eventi automatici usano SMTP Aruba. La dashboard espone anche condivisione
diretta via WhatsApp, SMS e Telegram. Il cron Vercel `/api/cron/events` viene
eseguito ogni giorno e registra ogni invio per evitare duplicati.

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
