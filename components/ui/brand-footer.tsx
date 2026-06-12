export default function BrandFooter() {
  return (
    <footer className="ub-footer">
      <div className="ub-footer__brand">
        <a href="https://underbeach.eu" rel="noreferrer" target="_blank">
          <strong>Underbeach</strong>
          <span>underbeach.eu</span>
        </a>
        <span className="ub-footer__divider" aria-hidden="true" />
        <p>
          <span aria-label="Ideato" role="img">🧠</span>
          Servizio ideato da <a href="https://underbeach.eu" rel="noreferrer" target="_blank">Underbeach</a>
        </p>
        <p>
          <span aria-label="Sviluppato con passione" role="img">♥</span>
          Sviluppato con il cuore da <a href="https://pro2dev.online" rel="noreferrer" target="_blank">Pro2Dev</a>
        </p>
      </div>
    </footer>
  );
}
