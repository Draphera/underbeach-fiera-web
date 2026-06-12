export const EMAIL_BRAND_TEXT =
  "Servizio ideato da Underbeach (https://underbeach.eu) - Sviluppato e distribuito da Pro2Dev (https://pro2dev.online) - Copyright 2026 Draphera. Tutti i diritti riservati.";

export function emailBrandFooter() {
  return `
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #dce3e1;color:#53656d;font-family:Arial,sans-serif;font-size:12px;line-height:1.7;text-align:center">
      <p style="margin:0 0 6px"><strong style="color:#0a1a2f">Underbeach</strong> · <a href="https://underbeach.eu" style="color:#176f78;text-decoration:none">underbeach.eu</a></p>
      <p style="margin:0">🧠 Servizio ideato da <a href="https://underbeach.eu" style="color:#176f78;font-weight:700;text-decoration:none">Underbeach</a></p>
      <p style="margin:0">♥ Sviluppato e distribuito da <a href="https://pro2dev.online" style="color:#176f78;font-weight:700;text-decoration:none">Pro2Dev</a></p>
      <p style="margin:6px 0 0;color:#718087">© 2026 Draphera. Tutti i diritti riservati.</p>
    </div>
  `;
}
