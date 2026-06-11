# Underbeach Demo Backup

Paracadute rapido per la presentazione.

## URL pubblici

- QR demo: https://underbeach-fiera-web.vercel.app/qr
- Landing: https://underbeach-fiera-web.vercel.app
- Form: https://underbeach-fiera-web.vercel.app/form
- Dashboard: https://underbeach-fiera-web.vercel.app/dashboard

## Sequenza demo consigliata

1. Apri `/qr` sul laptop.
2. Inquadra il QR con il telefono in webcam.
3. Mostra landing e form dal telefono.
4. Invia un negozio demo.
5. Apri dashboard sul laptop.
6. Mostra lista negozi, dettaglio negozio, attivazione ed export CSV.

## File pronti

- `../data/demo-negozi.csv`: CSV con 8 negozi demo.
- `../public/QR_underbeach.svg`: QR usato nella pagina `/qr`.
- `./operator-credentials.template.txt`: template locale per tenere le credenziali fuori dal codice.
- `./operator-credentials.txt`: copia locale ignorata da Git, da compilare prima della presentazione.

## Screenshot

- `screenshots/01-landing.png`
- `screenshots/02-form.png`
- `screenshots/03-qr.png`
- `screenshots/04-dashboard-login.png`
- `screenshots/05-detail-login.png`

Screenshot ancora da catturare dopo login operatore live:

- `screenshots/06-dashboard-full.png`
- `screenshots/07-detail-full.png`

## Note anti-panico

- Se il telefono non legge il QR, aprire direttamente: https://underbeach-fiera-web.vercel.app
- Se il form live non invia, mostrare `data/demo-negozi.csv` e la dashboard gia' popolata.
- Se Supabase rallenta, mostrare gli screenshot in questa cartella.
- Se la dashboard chiede login, usare le credenziali operative dal file locale non committato.
