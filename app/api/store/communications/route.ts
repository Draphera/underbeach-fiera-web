import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { isStoreMailConfigured, sendStoreMail } from "@/lib/server/store-mail";
import { EMAIL_BRAND_TEXT, emailBrandFooter } from "@/lib/server/email-brand";

type CommunicationRequest = {
  type?: "invite" | "customer" | "broadcast";
  email?: string;
  name?: string;
  customerId?: string;
  subject?: string;
  message?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function paragraphHtml(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.get("authorization") || "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  if (!supabaseUrl || !serviceRoleKey || !isStoreMailConfigured()) {
    return NextResponse.json({ error: "Servizio comunicazioni non configurato." }, { status: 503 });
  }
  if (!accessToken) {
    return NextResponse.json({ error: "Sessione mancante." }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  const user = userData.user;

  if (userError || !user || user.app_metadata?.role !== "store") {
    return NextResponse.json({ error: "Account negozio non autorizzato." }, { status: 403 });
  }

  let body: CommunicationRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  const { data: store, error: storeError } = await admin
    .from("negozi")
    .select("id, ragione_sociale, qr_token, logo_url, email")
    .eq("auth_user_id", user.id)
    .eq("attivo", true)
    .single();

  if (storeError || !store || !store.qr_token) {
    return NextResponse.json({ error: "Negozio attivo o QR personale non disponibile." }, { status: 404 });
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("comunicazioni")
    .select("id", { count: "exact", head: true })
    .eq("negozio_id", store.id)
    .eq("stato", "inviata")
    .gte("created_at", oneHourAgo);

  const sentLastHour = count || 0;
  if (sentLastHour >= 50) {
    return NextResponse.json({ error: "Limite temporaneo di 50 email all'ora raggiunto." }, { status: 429 });
  }

  const type = body.type;
  const customSubject = String(body.subject || "").trim().slice(0, 140);
  const customMessage = String(body.message || "").trim().slice(0, 4000);
  let customerId: string | null = null;
  let recipientEmail = "";
  let recipientName = "";
  let subject = customSubject;
  let message = customMessage;
  let actionUrl: string | null = null;
  let recipients: Array<{ id: string | null; email: string; name: string }> = [];

  if (type === "invite") {
    recipientEmail = String(body.email || "").trim().toLowerCase();
    recipientName = String(body.name || "").trim().slice(0, 120);
    actionUrl = `${process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin}/cliente/${store.qr_token}`;
    subject = subject || `Invito da ${store.ragione_sociale}`;
    message = message || `${store.ragione_sociale} ti invita a registrarti nel proprio spazio Underbeach.`;
  } else if (type === "customer") {
    customerId = String(body.customerId || "").trim();
    if (!customerId || !subject || !message) {
      return NextResponse.json({ error: "Cliente, oggetto e messaggio sono obbligatori." }, { status: 400 });
    }

    const { data: customer, error: customerError } = await admin
      .from("clienti")
      .select("id, nome, cognome, email, marketing_accettato")
      .eq("id", customerId)
      .eq("negozio_id", store.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json({ error: "Cliente non trovato." }, { status: 404 });
    }
    if (!customer.marketing_accettato) {
      return NextResponse.json({ error: "Il cliente non ha accettato comunicazioni marketing." }, { status: 403 });
    }
    if (!customer.email) {
      return NextResponse.json({ error: "Il cliente non ha fornito un indirizzo email." }, { status: 400 });
    }

    recipientEmail = customer.email.toLowerCase();
    recipientName = [customer.nome, customer.cognome].filter(Boolean).join(" ");
  } else if (type === "broadcast") {
    if (!subject || !message) {
      return NextResponse.json({ error: "Oggetto e messaggio sono obbligatori per l'invio globale." }, { status: 400 });
    }

    const availableSlots = 50 - sentLastHour;
    const { data: customers, error: customersError } = await admin
      .from("clienti")
      .select("id, nome, cognome, email")
      .eq("negozio_id", store.id)
      .eq("marketing_accettato", true)
      .not("email", "is", null)
      .limit(availableSlots);

    if (customersError) {
      return NextResponse.json({ error: "Lista clienti non disponibile." }, { status: 502 });
    }

    recipients = (customers || [])
      .map((customer) => ({
        id: customer.id,
        email: String(customer.email || "").toLowerCase(),
        name: [customer.nome, customer.cognome].filter(Boolean).join(" "),
      }))
      .filter((customer) => /^\S+@\S+\.\S+$/.test(customer.email));

    if (recipients.length === 0) {
      return NextResponse.json({ error: "Nessun cliente con consenso marketing ed email valida." }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Tipo di comunicazione non valido." }, { status: 400 });
  }

  if (type !== "broadcast" && (!/^\S+@\S+\.\S+$/.test(recipientEmail) || !subject || !message)) {
    return NextResponse.json({ error: "Destinatario, oggetto e messaggio sono obbligatori." }, { status: 400 });
  }

  const safeStore = escapeHtml(store.ragione_sociale || "Negozio Underbeach");
  const actionBlock = actionUrl
    ? `<p style="margin:28px 0"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#0a1a2f;color:#fff;padding:13px 20px;text-decoration:none;font-weight:700">Registrati presso il negozio</a></p>`
    : "";

  async function deliver(recipient: { id: string | null; email: string; name: string }) {
    const safeName = escapeHtml(recipient.name);
    const html = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#0a1a2f;line-height:1.6">
      <p style="color:#b8792f;font-size:12px;font-weight:700;text-transform:uppercase">${safeStore} / Underbeach</p>
      <h1 style="font-size:28px;line-height:1.15;margin:12px 0">${escapeHtml(subject)}</h1>
      ${safeName ? `<p>Ciao ${safeName},</p>` : ""}
      <p>${paragraphHtml(message)}</p>
      ${actionBlock}
      <p style="margin-top:30px;color:#64707a;font-size:13px">Messaggio inviato da ${safeStore} tramite Underbeach.</p>
      ${emailBrandFooter()}
    </div>
  `;

    let providerId: string | null = null;
    let providerError: string | null = null;
    try {
      const delivery = await sendStoreMail({
        to: recipient.email,
        subject,
        html,
        text: `${recipient.name ? `Ciao ${recipient.name},\n\n` : ""}${message}${actionUrl ? `\n\nRegistrati qui: ${actionUrl}` : ""}\n\n${EMAIL_BRAND_TEXT}`,
        replyTo: store.email,
      });
      providerId = delivery.messageId || null;
    } catch (error) {
      providerError = error instanceof Error ? error.message : "Errore SMTP Aruba";
    }

    return {
      providerId,
      providerError,
      sent: !providerError,
      history: {
        negozio_id: store.id,
        cliente_id: recipient.id,
        tipo: type === "invite" ? "invito" : "cliente",
        destinatario_email: recipient.email,
        destinatario_nome: recipient.name || null,
        oggetto: subject,
        messaggio: message,
        stato: providerError ? "errore" : "inviata",
        provider_id: providerId,
        provider_error: providerError,
      },
    };
  }

  if (type === "broadcast") {
    const results = [];
    for (const recipient of recipients) {
      results.push(await deliver(recipient));
    }

    const { error: historyError } = await admin.from("comunicazioni").insert(results.map((result) => result.history));
    if (historyError) console.error("Broadcast communication history insert failed", historyError);

    const sent = results.filter((result) => result.sent).length;
    const failed = results.length - sent;
    if (sent === 0) {
      return NextResponse.json(
        { error: "Invio globale non riuscito.", sent, failed },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, sent, failed, total: results.length });
  }

  const deliveryResult = await deliver({
    id: customerId,
    email: recipientEmail,
    name: recipientName,
  });

  const { error: historyError } = await admin.from("comunicazioni").insert(deliveryResult.history);

  if (historyError) console.error("Communication history insert failed", historyError);

  if (!deliveryResult.sent) {
    console.error("Store communication failed", deliveryResult.providerError);
    return NextResponse.json(
      { error: "Invio SMTP non riuscito.", providerMessage: deliveryResult.providerError },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true, id: deliveryResult.providerId });
}
