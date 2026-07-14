const presentationAssets = {
  video: "/presentation/Undebeach_Pro2Dev.mp4",
  poster: "/presentation/Undebeach_Pro2Dev.png",
  pdf: "/presentation/Undebeach_Pro2Dev.pdf",
  qr: "/presentation/QR_underbeach.png",
};

export const metadata = {
  title: "Underbeach Presentation",
  description: "Presentazione Underbeach per Maredamare 2026",
};

export default function PresentationPage() {
  return (
    <main className="ub-presentation-page">
      <section className="ub-presentation-hero" aria-label="Presentazione Underbeach">
        <div className="ub-presentation-copy">
          <span>Underbeach / Maredamare 2026</span>
          <h1>Creare e gestire la relazione con i propri clienti non e' mai stato cosi semplice.</h1>
          <p>
            Portale per negozi, acquisizione clienti via QR, comunicazioni, catalogo prodotti e automazioni.
          </p>
          <div className="ub-presentation-actions">
            <a href={presentationAssets.pdf} target="_blank" rel="noreferrer">Apri PDF</a>
            <a href="/qr">QR registrazione negozio</a>
            <a href="/negozio">Area negozio</a>
          </div>
        </div>

        <aside className="ub-presentation-qr" aria-label="QR Underbeach">
          <img alt="QR Underbeach" src={presentationAssets.qr} />
          <span>Inquadra per aprire Underbeach</span>
        </aside>
      </section>

      <section className="ub-presentation-video" aria-label="Video demo Underbeach">
        <video
          controls
          loop
          muted
          playsInline
          poster={presentationAssets.poster}
          preload="metadata"
        >
          <source src={presentationAssets.video} type="video/mp4" />
        </video>
      </section>
    </main>
  );
}
