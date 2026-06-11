import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type RegistrationEmailRequest = {
  email?: string;
  referenteNome?: string;
  ragioneSociale?: string;
  partitaIva?: string;
  createdAt?: string;
  registrationId?: string;
  lang?: "it" | "en";
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function emailContent({
  lang,
  referenteNome,
  ragioneSociale,
}: Required<Pick<RegistrationEmailRequest, "lang" | "referenteNome" | "ragioneSociale">>) {
  const firstName = escapeHtml(referenteNome || "");
  const businessName = escapeHtml(ragioneSociale);

  if (lang === "en") {
    return {
      subject: "Underbeach registration received",
      text: `Hello ${firstName}, we have received the registration for ${businessName}. The Underbeach team will now manually review the request. You will receive a further update after the activation evaluation.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#0a1a2f;line-height:1.6">
          <p style="color:#b8792f;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Underbeach registration</p>
          <h1 style="font-size:30px;line-height:1.15;margin:12px 0">Thank you${firstName ? `, ${firstName}` : ""}.</h1>
          <p>We have received the registration for <strong>${businessName}</strong>.</p>
          <p>The Underbeach team will now manually review the information provided and assess the store activation.</p>
          <p>You will receive a further update after the evaluation has been completed.</p>
          <div style="margin-top:28px;padding:18px;border-left:4px solid #f6c27a;background:#f6f3ee">
            <strong>Current status:</strong> registration received, activation pending review.
          </div>
          <p style="margin-top:30px;color:#64707a;font-size:13px">Underbeach / Maredamare 2026</p>
        </div>
      `,
    };
  }

  return {
    subject: "Registrazione Underbeach ricevuta",
    text: `Ciao ${firstName}, abbiamo ricevuto la registrazione per ${businessName}. Il team Underbeach prendera' ora in carico la richiesta e procedera' con la valutazione manuale per l'attivazione. Riceverai un ulteriore aggiornamento al termine della valutazione.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#0a1a2f;line-height:1.6">
        <p style="color:#b8792f;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">Registrazione Underbeach</p>
        <h1 style="font-size:30px;line-height:1.15;margin:12px 0">Grazie${firstName ? `, ${firstName}` : ""}.</h1>
        <p>Abbiamo ricevuto la registrazione per <strong>${businessName}</strong>.</p>
        <p>Il team Underbeach prendera' ora in carico le informazioni inserite e procedera' con la valutazione manuale del punto vendita.</p>
        <p>Riceverai un ulteriore aggiornamento al termine della valutazione di attivazione.</p>
        <div style="margin-top:28px;padding:18px;border-left:4px solid #f6c27a;background:#f6f3ee">
          <strong>Stato attuale:</strong> registrazione ricevuta, attivazione in valutazione.
        </div>
        <p style="margin-top:30px;color:#64707a;font-size:13px">Underbeach / Maredamare 2026</p>
      </div>
    `,
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!apiKey || !from || !supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Email service is not configured." },
      { status: 503 }
    );
  }

  let body: RegistrationEmailRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() || "";
  const ragioneSociale = body.ragioneSociale?.trim() || "";
  const referenteNome = body.referenteNome?.trim() || "";
  const partitaIva = body.partitaIva?.trim() || "";
  const createdAt = body.createdAt?.trim() || "";
  const registrationId = body.registrationId?.trim() || partitaIva;
  const lang = body.lang === "en" ? "en" : "it";

  if (
    !/^\S+@\S+\.\S+$/.test(email) ||
    !ragioneSociale ||
    !partitaIva ||
    !createdAt
  ) {
    return NextResponse.json({ error: "Missing registration data." }, { status: 400 });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: registration, error: registrationError } = await supabaseAdmin
    .from("negozi")
    .select("id")
    .eq("email", email)
    .eq("partita_iva", partitaIva)
    .eq("created_at", createdAt)
    .eq("privacy_accettata", true)
    .maybeSingle();

  if (registrationError || !registration) {
    console.error("Registration verification failed", registrationError);
    return NextResponse.json(
      { error: "Registration could not be verified." },
      { status: 403 }
    );
  }

  const content = emailContent({ lang, referenteNome, ragioneSociale });
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `underbeach-${registrationId}`.slice(0, 256),
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: content.subject,
      html: content.html,
      text: content.text,
      tags: [
        { name: "source", value: "fiera_registration" },
        { name: "language", value: lang },
      ],
    }),
  });

  const responseBody = await resendResponse.json().catch(() => null);

  if (!resendResponse.ok) {
    console.error("Resend email error", responseBody);
    return NextResponse.json(
      { error: "Confirmation email could not be sent." },
      { status: 502 }
    );
  }

  return NextResponse.json({ id: responseBody?.id ?? null });
}
