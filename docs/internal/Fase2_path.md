# Underbeach – Architettura Invio Comunicazioni  
Email (SMTP Aruba) + WhatsApp + SMS + Telegram + Messaggi Automatici Eventi

Questo documento descrive in modo dettagliato come Underbeach gestisce l’invio delle comunicazioni tra piattaforma, negozi e clienti.  
L’obiettivo è ottenere un sistema **scalabile**, **economico**, **affidabile** e **senza limiti**, separando correttamente i flussi:

- Email **transazionali** → Resend  
- Email **negozio → cliente** → SMTP Aruba  
- Inviti **WhatsApp / SMS / Telegram** → Deep link gratuiti  
- **Messaggi automatici per eventi** → SMTP Aruba + Notifiche push (Fase 3)

---

# 1. Strategia generale di invio comunicazioni

## 1.1 Tipologie di comunicazioni

### A) Email transazionali (Resend)
Usate per:
- conferma registrazione negozio  
- attivazione negozio  
- conferma registrazione cliente  

Sono poche, critiche e devono essere affidabili.  
Resend è perfetto per questo ruolo.

---

### B) Email negozio → cliente (SMTP Aruba)
Usate per:
- inviti ai clienti  
- conferme di adesione  
- comunicazioni dirette dal negozio  
- messaggi automatici programmati (compleanni, festività, promozioni)

Queste email possono essere molte (centinaia o migliaia).  
Per questo si usa **SMTP Aruba**, con un account dedicato:

underbeach@pro2dev.com

Codice

---

### C) Inviti via WhatsApp / SMS / Telegram (gratis)
Usati per:
- inviti rapidi  
- condivisione link di registrazione  
- contatto diretto negozio → cliente  

Questi inviti **non passano dal server**:  
vengono inviati direttamente dal telefono del negoziante tramite deep link.

---

### D) Messaggi automatici per eventi (SMTP Aruba + Push)
Usati per:
- auguri di compleanno  
- auguri di Natale  
- festività nazionali  
- promozioni periodiche  
- sconti personalizzati  
- campagne automatiche stagionali  

Questi messaggi vengono generati automaticamente dal sistema in base ai dati del cliente.

---

# 2. Invio email tramite SMTP Aruba

## 2.1 Obiettivo
Permettere ai negozi di inviare email ai propri clienti usando un account email centralizzato:

Underbeach <underbeach@pro2dev.com>

Codice

Questo evita di consumare le 3.000 email mensili di Resend.

---

## 2.2 Configurazione SMTP Aruba

Parametri tipici:

- Host: `smtp.pro2dev.com`  
- Porta: `465`  
- Sicurezza: SSL/TLS  
- Utente: `underbeach@pro2dev.com`  
- Password: definita nel pannello Aruba  

La password deve essere salvata solo come variabile d’ambiente.

---

## 2.3 Variabili d’ambiente (Vercel)

UNDERBEACH_SMTP_HOST=smtp.pro2dev.com
UNDERBEACH_SMTP_PORT=465
UNDERBEACH_SMTP_USER=underbeach@pro2dev.com
UNDERBEACH_SMTP_PASSWORD=************

Codice

---

## 2.4 Endpoint API per invio email (Next.js)

L’applicazione espone un endpoint, ad esempio:

POST /api/send-shop-email

Codice

Payload previsto:

- `to` → email del cliente  
- `subject` → oggetto  
- `html` → contenuto HTML  

L’endpoint deve:
1. validare i campi  
2. usare Nodemailer con SMTP Aruba  
3. restituire `{ success: true }` in caso di invio corretto  
4. restituire errore 500 in caso di problemi  

---

## 2.5 Vantaggi dell’uso di SMTP Aruba

- nessun limite rigido  
- nessun costo aggiuntivo  
- controllo totale del flusso  
- separazione chiara tra email tecniche e email dei negozi  

---

# 3. Invio inviti tramite WhatsApp, SMS e Telegram

## 3.1 Filosofia di base

Per WhatsApp, SMS e Telegram **non si usano API a pagamento**.  
Si sfruttano i deep link che aprono direttamente le app del telefono.

Il messaggio viene inviato:
- dal numero personale del negoziante  
- tramite la sua app WhatsApp / SMS / Telegram  

Questo comporta:
- costo zero  
- nessun limite  
- maggiore fiducia da parte del cliente  

---

## 3.2 Link di invito personalizzato

Per ogni negozio viene generato un link univoco:

https://underbeach-fiera-web.vercel.app/invito?shop={shopId}

Codice

Questo link viene inserito nei messaggi.

---

## 3.3 Pulsante “Invia tramite WhatsApp”

Deep link:

https://wa.me/?text=TESTO

Codice

Esempio di testo:

Ciao! Registrati al mio negozio su Underbeach: https://underbeach-fiera-web.vercel.app/invito?shop={shopId}

Codice

---

## 3.4 Pulsante “Invia tramite SMS”

Deep link:

sms:?body=TESTO

Codice

---

## 3.5 Pulsante “Invia tramite Telegram”

Deep link:

https://t.me/share/url?url=URL&text=TESTO

Codice

---

## 3.6 Vantaggi dei deep link

- zero costi  
- zero integrazioni complesse  
- zero limiti di invio  
- massima adozione reale  
- messaggio inviato da un numero conosciuto  

---

# 4. Pagina “Invita Clienti”

La dashboard del negozio include una pagina dedicata:

Contiene:
- link di invito del negozio  
- pulsante “Copia link”  
- pulsante “Invia tramite WhatsApp”  
- pulsante “Invia tramite SMS”  
- pulsante “Invia tramite Telegram”  

Ogni pulsante usa i deep link descritti sopra.

---

# 5. Messaggi automatici per eventi (Novità Fase 2)

Underbeach supporta l’invio automatico di email e notifiche push basate su eventi programmati.

## 5.1 Tipologie di eventi supportati

### 🎂 Compleanno cliente
- invio automatico email di auguri  
- possibilità di aggiungere testo personalizzato dal negozio  
- possibilità di includere uno **sconto dedicato** valido solo quel giorno  

### 🎄 Natale
- invio email di auguri  
- possibilità di aggiungere messaggio personalizzato  
- possibilità di includere **codice sconto natalizio**  

### 🎉 Festività nazionali
- Pasqua  
- Ferragosto  
- Capodanno  
- Black Friday  
- Saldi stagionali  

### 🏷️ Promozioni periodiche
- sconti settimanali  
- offerte mensili  
- campagne stagionali  

---

## 5.2 Funzionamento tecnico

1. Il sistema legge i dati del cliente (data di nascita, preferenze, storico acquisti).  
2. Un cron job (Vercel Cron o Supabase Scheduler) controlla gli eventi del giorno.  
3. Per ogni evento:
   - genera il contenuto email  
   - applica eventuali personalizzazioni del negozio  
   - applica eventuali codici sconto  
   - invia tramite **SMTP Aruba**  
   - invia notifica push (Fase 3)  

---

## 5.3 Personalizzazione negozio

Ogni negozio può configurare:
- testo predefinito per ogni evento  
- sconto associato  
- validità dello sconto  
- immagine o banner promozionale  
- attivazione/disattivazione automatismi  

---

# 6. Separazione chiara dei ruoli (riassunto)

| Canale | Motore | Uso |
|--------|--------|------|
| Email transazionali | Resend | Registrazione/attivazione negozio, registrazione cliente |
| Email negozio → cliente | SMTP Aruba | Inviti, conferme, comunicazioni |
| Messaggi automatici eventi | SMTP Aruba + Push | Compleanni, Natale, promozioni |
| WhatsApp | Deep link | Inviti rapidi |
| SMS | Deep link | Inviti universali |
| Telegram | Deep link | Inviti per utenti Telegram |

Questa architettura è ideale per la fiera e per la crescita futura di Underbeach.