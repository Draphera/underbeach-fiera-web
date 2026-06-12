import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { EMAIL_BRAND_TEXT, emailBrandFooter } from "@/lib/server/email-brand";

type RouteContext = { params: { token: string } };

function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function clean(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}

async function sendCustomerConfirmation(email: string, name: string, storeName: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from || !email) return;

  const safeName = escapeHtml(name);
  const safeStore = escapeHtml(storeName);
  const subject = `Registrazione confermata presso ${storeName}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#0a1a2f;line-height:1.6"><p style="color:#b8792f;font-size:12px;font-weight:700;text-transform:uppercase">Underbeach</p><h1 style="font-size:28px">Registrazione confermata</h1><p>Ciao ${safeName},</p><p>la tua registrazione presso <strong>${safeStore}</strong> e' stata completata correttamente.</p><p>Da questo momento il negozio potra' inviarti comunicazioni e novita' in base ai consensi che hai espresso.</p><p style="margin-top:30px;color:#64707a;font-size:13px">Grazie per essere entrato nella rete Underbeach.</p>${emailBrandFooter()}</div>`,
      text: `Ciao ${name}, la tua registrazione presso ${storeName} e' stata completata correttamente. Grazie per essere entrato nella rete Underbeach.\n\n${EMAIL_BRAND_TEXT}`,
      tags: [{ name: "source", value: "customer_registration" }],
    }),
  });
  if (!response.ok) console.error("Customer confirmation email failed", await response.json().catch(() => null));
}

export async function GET(_request: Request, { params }: RouteContext) {
  const admin = serverClient();
  if (!admin) return NextResponse.json({ error: "Servizio non configurato." }, { status: 503 });

  const { data, error } = await admin
    .from("negozi")
    .select("id, ragione_sociale, citta, provincia, logo_url")
    .eq("qr_token", params.token)
    .eq("attivo", true)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Negozio non disponibile." }, { status: 404 });
  }

  return NextResponse.json({ store: data });
}

export async function POST(request: Request, { params }: RouteContext) {
  const admin = serverClient();
  if (!admin) return NextResponse.json({ error: "Servizio non configurato." }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  const nome = clean(body.nome, 80);
  const cognome = clean(body.cognome, 80);
  const email = clean(body.email, 254).toLowerCase();
  const telefono = clean(body.telefono, 30);
  const citta = clean(body.citta, 100);
  const nascitaGiorno = Number(body.nascitaGiorno || 0) || null;
  const nascitaMese = Number(body.nascitaMese || 0) || null;
  const profiliSocial = clean(body.profiliSocial, 500);
  const genere = clean(body.genere, 20);
  const tagliaSeno = clean(body.tagliaSeno, 30);
  const tagliaSlip = clean(body.tagliaSlip, 30);
  const allowedInterests = [
    "Beachwear",
    "Abbigliamento",
    "Underwear",
    "Lingerie",
    "Maglieria intima",
    "Calzetteria",
  ];
  const merceologieInteresse = Array.isArray(body.merceologieInteresse)
    ? body.merceologieInteresse
        .map((value) => String(value))
        .filter((value) => allowedInterests.includes(value))
    : [];
  const privacyAccettata = body.privacyAccettata === true;
  const marketingAccettato = body.marketingAccettato === true;

  if (!nome || !cognome || !citta || !telefono || !privacyAccettata || !marketingAccettato) {
    return NextResponse.json(
      { error: "Nome, cognome, citta, cellulare, privacy e consenso commerciale sono obbligatori." },
      { status: 400 }
    );
  }
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Indirizzo email non valido." }, { status: 400 });
  }
  if (!/^[\d+(). /-]{8,30}$/.test(telefono)) {
    return NextResponse.json({ error: "Numero di cellulare non valido." }, { status: 400 });
  }
  if (
    (nascitaGiorno !== null && (nascitaGiorno < 1 || nascitaGiorno > 31)) ||
    (nascitaMese !== null && (nascitaMese < 1 || nascitaMese > 12)) ||
    ((nascitaGiorno === null) !== (nascitaMese === null))
  ) {
    return NextResponse.json({ error: "Inserisci insieme giorno e mese di nascita." }, { status: 400 });
  }
  if (genere && !["uomo", "donna", "non_definito"].includes(genere)) {
    return NextResponse.json({ error: "Genere non valido." }, { status: 400 });
  }

  const { data: store, error: storeError } = await admin
    .from("negozi")
    .select("id, ragione_sociale")
    .eq("qr_token", params.token)
    .eq("attivo", true)
    .single();

  if (storeError || !store) {
    return NextResponse.json({ error: "Negozio non disponibile." }, { status: 404 });
  }

  const now = new Date().toISOString();
  const { error: insertError } = await admin.from("clienti").insert({
    negozio_id: store.id,
    nome,
    cognome,
    email: email || null,
    telefono,
    citta,
    nascita_giorno: nascitaGiorno,
    nascita_mese: nascitaMese,
    profili_social: profiliSocial || null,
    genere: genere || null,
    taglia_seno: tagliaSeno || null,
    taglia_slip: tagliaSlip || null,
    merceologie_interesse: merceologieInteresse,
    privacy_accettata: true,
    privacy_accettata_at: now,
    marketing_accettato: marketingAccettato,
    fonte: "qr",
  });

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "Questo cellulare o indirizzo email risulta gia' registrato presso il negozio." },
        { status: 409 }
      );
    }
    console.error("Public customer registration failed", insertError);
    return NextResponse.json({ error: "Registrazione non completata." }, { status: 502 });
  }

  if (email) {
    await sendCustomerConfirmation(email, nome, store.ragione_sociale || "il tuo negozio").catch((error) => {
      console.error("Customer confirmation request failed", error);
    });
  }

  return NextResponse.json({ success: true, storeName: store.ragione_sociale });
}
