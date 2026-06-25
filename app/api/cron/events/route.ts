import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isStoreMailConfigured, sendStoreMail } from "@/lib/server/store-mail";
import { EMAIL_BRAND_TEXT, emailBrandFooter } from "@/lib/server/email-brand";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}

function easterDate(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || !isStoreMailConfigured()) {
    return NextResponse.json({ error: "Servizio eventi non configurato." }, { status: 503 });
  }

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;
  const day = today.getUTCDate();
  const easter = easterDate(year);
  const dateKey = today.toISOString().slice(0, 10);
  const { data: automations, error } = await admin
    .from("automazioni_eventi")
    .select("id, negozio_id, tipo, nome, oggetto, messaggio, codice_sconto, sconto_percentuale, mese, giorno, negozi!inner(ragione_sociale, email, attivo)")
    .eq("attiva", true)
    .eq("negozi.attivo", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const automation of automations || []) {
    const isBirthday = automation.tipo === "compleanno";
    const isEaster = automation.tipo === "pasqua";
    if (!isBirthday && !isEaster && (automation.mese !== month || automation.giorno !== day)) continue;
    if (isEaster && (easter.month !== month || easter.day !== day)) continue;

    let customerQuery = admin
      .from("clienti")
      .select("id, nome, cognome, email")
      .eq("negozio_id", automation.negozio_id)
      .eq("marketing_accettato", true)
      .not("email", "is", null);
    if (isBirthday) customerQuery = customerQuery.eq("nascita_mese", month).eq("nascita_giorno", day);
    const { data: customers } = await customerQuery;

    for (const customer of customers || []) {
      const eventKey = `${automation.id}:${customer.id}:${dateKey}`;
      const { count } = await admin.from("comunicazioni").select("id", { count: "exact", head: true }).eq("event_key", eventKey);
      if (count) {
        skipped += 1;
        continue;
      }

      const storeRecord = Array.isArray(automation.negozi) ? automation.negozi[0] : automation.negozi;
      const storeName = storeRecord?.ragione_sociale || "Negozio Underbeach";
      const discount = automation.codice_sconto
        ? `Codice sconto: ${automation.codice_sconto}${automation.sconto_percentuale ? ` (-${automation.sconto_percentuale}%)` : ""}`
        : "";
      const message = automation.messaggio.replace(/\{nome\}/g, customer.nome || "").replace(/\{negozio\}/g, storeName);
      let providerId: string | null = null;
      let providerError: string | null = null;

      try {
        const delivery = await sendStoreMail({
          to: customer.email!,
          subject: automation.oggetto,
          replyTo: storeRecord?.email || null,
          html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#0a1a2f;line-height:1.6"><p style="color:#b8792f;font-size:12px;font-weight:700;text-transform:uppercase">${escapeHtml(storeName)} / Underbeach</p><h1>${escapeHtml(automation.oggetto)}</h1><p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>${discount ? `<p style="padding:14px;background:#fff4df;font-weight:700">${escapeHtml(discount)}</p>` : ""}${emailBrandFooter()}</div>`,
          text: `${message}${discount ? `\n\n${discount}` : ""}\n\n${EMAIL_BRAND_TEXT}`,
        });
        providerId = delivery.messageId || null;
        sent += 1;
      } catch (mailError) {
        providerError = mailError instanceof Error ? mailError.message : "Errore SMTP";
        failed += 1;
      }

      await admin.from("comunicazioni").insert({
        negozio_id: automation.negozio_id,
        cliente_id: customer.id,
        tipo: "cliente",
        destinatario_email: customer.email,
        destinatario_nome: [customer.nome, customer.cognome].filter(Boolean).join(" "),
        oggetto: automation.oggetto,
        messaggio: message,
        stato: providerError ? "errore" : "inviata",
        provider_id: providerId,
        provider_error: providerError,
        provider: "smtp_aruba",
        canale: "email",
        automazione_id: automation.id,
        event_key: eventKey,
      });
    }
  }

  return NextResponse.json({ success: true, date: dateKey, sent, skipped, failed });
}
