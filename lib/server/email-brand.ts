export const EMAIL_BRAND_TEXT =
  "Servizio ideato da Underbeach (https://underbeach.eu) - Sviluppato con il cuore da Pro2Dev (https://pro2dev.online)";

export function emailBrandFooter() {
  return `
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #dce3e1;color:#53656d;font-family:Arial,sans-serif;font-size:12px;line-height:1.7;text-align:center">
      <p style="margin:0 0 6px"><strong style="color:#0a1a2f">Underbeach</strong> · <a href="https://underbeach.eu" style="color:#176f78;text-decoration:none">underbeach.eu</a></p>
      <p style="margin:0">🧠 Servizio ideato da <a href="https://underbeach.eu" style="color:#176f78;font-weight:700;text-decoration:none">Underbeach</a></p>
      <p style="margin:0">♥ Sviluppato con il cuore da <a href="https://pro2dev.online" style="color:#176f78;font-weight:700;text-decoration:none">Pro2Dev</a></p>
    </div>
  `;
}
