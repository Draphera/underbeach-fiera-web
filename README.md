# Underbeach – Fase 1 (Lead Generation Fiera)

Web App ufficiale per la raccolta dei lead dei negozianti durante la fiera di Luglio 2026.  
Il progetto utilizza un’architettura completamente serverless basata su Next.js (Vercel) e Supabase (PostgreSQL).

## Obiettivo
Permettere ai negozianti di registrarsi rapidamente tramite QR Code, inviando i dati direttamente al database cloud.  
La Fase 1 è l’unica parte visibile al pubblico durante la fiera.

## Funzionalità
- Landing page mobile-first
- Form con 4 campi obbligatori
- Validazione client-side
- Invio dati a Supabase tramite API pubblica
- Antiduplicazione tramite vincolo UNIQUE
- Schermata finale di conferma

## Stack Tecnologico
- Next.js 14 (App Router)
- React
- Supabase (Anon Public API)
- Vercel (Hosting + CDN globale)

## Database
Tabella: `lead_fiera`

Campi principali:
- ragione_sociale  
- citta  
- email  
- telefono  
- privacy_accettata  
- approvato (default: false)

## Deploy
Il deploy avviene automaticamente tramite Vercel collegato al branch `main`.

## Sviluppo locale
Installazione dipendenze:

npm install

Avvio ambiente di sviluppo:

npm run dev

## Struttura del progetto
app/
page.tsx
success.tsx
api/
lead/
route.ts
public/


## Note
Questo repository contiene esclusivamente la Fase 1.  
Le fasi successive (Portale Admin, Dashboard Negozi, App Mobile) risiedono in repository separati.

