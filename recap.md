# Recap operativo Underbeach

Guida rapida per il giro completo del portale, divisa per ruolo.

## 1. Fase amministratore

L'amministratore gestisce le registrazioni dei negozi e la loro attivazione.

Flusso principale:

1. Accede alla dashboard amministrativa.
2. Visualizza i negozi registrati dal form pubblico.
3. Controlla i dati del negozio nella pagina dettaglio.
4. Attiva o disattiva il negozio.
5. All'attivazione viene creata/preparata l'utenza negozio.
6. Il negozio riceve via email le credenziali temporanee.

Funzioni disponibili:

- elenco negozi registrati;
- ricerca e filtro;
- dettaglio negozio;
- attivazione/disattivazione;
- export CSV;
- controllo stato privacy e registrazione.

## 2. Fase negozio

Il negozio usa la propria area riservata per gestire profilo, clienti, comunicazioni, QR e catalogo.

Flusso principale:

1. Accede all'area negozio con le credenziali ricevute.
2. Completa o aggiorna il profilo.
3. Usa il QR personale per far registrare i clienti.
4. Consulta i clienti acquisiti.
5. Invia inviti o comunicazioni email.
6. Crea automazioni per eventi programmati.
7. Gestisce il catalogo prodotti pubblicato.

Funzioni disponibili:

- dashboard negozio;
- modifica profilo;
- QR personale;
- lista clienti;
- comunicazioni via email;
- storico invii;
- automazioni eventi;
- catalogo prodotti.

Eventi automatici supportati:

- compleanno cliente;
- Natale;
- Pasqua;
- Ferragosto;
- Capodanno;
- Black Friday;
- saldi stagionali;
- sconto settimanale;
- offerta mensile;
- campagna stagionale;
- promozione libera.

Nei messaggi automatici il negozio puo' personalizzare:

- oggetto email;
- testo del messaggio;
- codice sconto;
- percentuale sconto;
- data di invio, quando prevista;
- stato attivo/in pausa.

Variabili disponibili nel testo:

- `{nome}`: nome del cliente;
- `{negozio}`: nome del negozio.

## 3. Fase cliente

Il cliente entra nel flusso tramite QR o link personale del negozio.

Flusso principale:

1. Scansiona il QR del negozio.
2. Apre la pagina cliente del negozio.
3. Compila il form di registrazione.
4. Accetta privacy e comunicazioni commerciali.
5. Riceve una mail di conferma.
6. Dalla mail puo' tornare alla propria area cliente.
7. Accede alla mini dashboard con email e cellulare usati in registrazione.

Campi richiesti:

- nome;
- cognome;
- citta;
- cellulare;
- email;
- consenso privacy;
- consenso comunicazioni commerciali.

Campi opzionali:

- giorno e mese di nascita;
- profili social;
- genere;
- taglia seno;
- taglia slip;
- merceologie di interesse.

Mini dashboard cliente:

- riepilogo cliente;
- messaggi ricevuti dal negozio;
- storico comunicazioni;
- articoli/prodotti pubblicati dal negozio.

## 4. Note operative

- Il QR del negozio porta sempre alla pagina cliente personalizzata.
- Le email cliente includono il link alla mini dashboard.
- Le automazioni email richiedono che il cron eventi sia configurato.
- Le notifiche push sono previste come evoluzione successiva tramite App o PWA.

## 5. Crediti

Servizio ideato da Underbeach.

Copyright 2026 Draphera. Tutti i diritti riservati.

Sviluppato e distribuito da Pro2Dev.
