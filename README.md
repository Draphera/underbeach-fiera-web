# Underbeach – Fase 1 (Lead Generation Fiera)

Web App ufficiale per la raccolta dei lead dei negozianti durante la fiera di Luglio 2026.  
Il progetto utilizza un’architettura completamente serverless basata su Next.js (Vercel) e Supabase (PostgreSQL).

## Obiettivo
Permettere ai negozianti di registrarsi rapidamente tramite QR Code, inviando i dati direttamente al database cloud.  
La Fase 1 è l’unica parte visibile al pubblico durante la fiera.

## Flusso Utente
1. Scansione del QR Code allo stand  
2. Landing page minimal ottimizzata per smartphone  
3. Selezione lingua  
4. Form con 4 campi obbligatori  
5. Invio dati a Supabase tramite API serverless  
6. Schermata finale di conferma

## Funzionalità
- Landing page mobile-first (post‑QR)
- Background engine cinematografico globale
- Visual Pack separato (overlay, vignette, haze, bloom)
- Language Switcher con stato persistente
- Form con validazione client-side
- Invio dati tramite API pubblica Supabase
- Antiduplicazione tramite vincolo UNIQUE
- Schermata finale di conferma

## Stack Tecnologico
- Next.js 14 (App Router)
- React
- Supabase (PostgreSQL + API)
- Vercel (Hosting + CDN globale)
- CSS Modules / Vanilla CSS

## Database
Tabella: `lead_fiera`

Campi principali:
- ragione_sociale  
- citta  
- email (UNIQUE)  
- telefono  
- privacy_accettata  
- approvato (default: false)  
- created_at (timestamp)

## Deploy
Il deploy avviene automaticamente tramite Vercel collegato al branch `main`.

## Sviluppo locale

Installazione dipendenze:
```bash
npm install
