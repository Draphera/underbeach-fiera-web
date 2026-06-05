import Link from "next/link";

export default function QrPage() {
  return (
    <main className="ub-qr-page" aria-label="Underbeach QR demo">
      <section className="ub-qr-stage">
        <div className="ub-qr-copy">
          <span>Underbeach Fiera 2026</span>
          <h1>Scansiona il QR e registra il negozio</h1>
          <p>
            Apri questa pagina durante la presentazione, inquadra il codice con
            il telefono e mostra il flusso reale: landing, form, invio e
            dashboard.
          </p>

          <div className="ub-qr-actions">
            <Link href="/" className="ub-qr-link">
              Apri landing
            </Link>
            <Link href="/dashboard" className="ub-qr-link ub-qr-link--ghost">
              Apri dashboard
            </Link>
          </div>
        </div>

        <div className="ub-qr-card" aria-label="Codice QR Underbeach">
          <img src="/QR_underbeach.svg" alt="QR code Underbeach Fiera" />
          <strong>underbeach-fiera-web.vercel.app</strong>
          <span>Consigliato: luminosita schermo al massimo</span>
        </div>
      </section>
    </main>
  );
}
