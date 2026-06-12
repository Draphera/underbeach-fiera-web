# 📱 Underbeach – Mini‑App Clienti (Expo Go)
**Fase 3 – Documentazione Tecnica**

La Mini‑App Clienti Underbeach è un’applicazione mobile realizzata con **Expo Go**, pensata per offrire ai clienti dei negozi un accesso immediato alle funzionalità principali della piattaforma Underbeach, senza necessità di pubblicazione sugli store (App Store / Play Store) e senza costi aggiuntivi.

Questa app è progettata per:
- ricevere **notifiche push** (nuovi messaggi, nuovi articoli, aggiornamenti dal negozio)
- aprire l’area cliente Underbeach tramite **WebView**
- garantire un’esperienza mobile semplice, veloce e immediata
- essere distribuita tramite **QR code**, senza installazioni complesse

---

# 1. 🎯 Obiettivo della Mini‑App
La Mini‑App Clienti serve esclusivamente ai **clienti dei negozi** Underbeach.

Non è destinata a:
- amministratori
- negozianti
- operatori di fiera

Questi ruoli utilizzano la dashboard web.

La mini‑app ha due funzioni principali:

### ✔️ 1. Ricezione notifiche push
- nuovi messaggi dal negozio
- nuovi articoli pubblicati
- aggiornamenti e comunicazioni
- notifiche personalizzate

### ✔️ 2. Accesso rapido all’area cliente
La mini‑app apre una WebView che punta alla dashboard cliente:

