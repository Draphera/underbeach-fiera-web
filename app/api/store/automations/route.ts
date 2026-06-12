import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const TYPES = ["compleanno", "natale", "ferragosto", "capodanno", "black_friday", "saldi", "promozione"];

async function authorize(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/, "");
  if (!url || !key) return { error: "Servizio non configurato.", status: 503 } as const;
  if (!token) return { error: "Sessione mancante.", status: 401 } as const;
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await admin.auth.getUser(token);
  if (!data.user || data.user.app_metadata?.role !== "store") return { error: "Account non autorizzato.", status: 403 } as const;
  const { data: store } = await admin.from("negozi").select("id").eq("auth_user_id", data.user.id).eq("attivo", true).single();
  if (!store) return { error: "Negozio attivo non trovato.", status: 404 } as const;
  return { admin, store } as const;
}

function automationData(body: Record<string, unknown>) {
  const tipo = String(body.tipo || "");
  const nome = String(body.nome || "").trim().slice(0, 120);
  const oggetto = String(body.oggetto || "").trim().slice(0, 140);
  const messaggio = String(body.messaggio || "").trim().slice(0, 4000);
  const mese = body.mese ? Number(body.mese) : null;
  const giorno = body.giorno ? Number(body.giorno) : null;
  const sconto = body.scontoPercentuale ? Number(body.scontoPercentuale) : null;
  if (!TYPES.includes(tipo) || !nome || !oggetto || !messaggio) throw new Error("Tipo, nome, oggetto e messaggio sono obbligatori.");
  if (tipo !== "compleanno" && (!mese || !giorno)) throw new Error("Giorno e mese sono obbligatori per questa automazione.");
  if (mese !== null && (mese < 1 || mese > 12)) throw new Error("Mese non valido.");
  if (giorno !== null && (giorno < 1 || giorno > 31)) throw new Error("Giorno non valido.");
  if (sconto !== null && (sconto < 1 || sconto > 100)) throw new Error("Percentuale sconto non valida.");
  return {
    tipo,
    nome,
    oggetto,
    messaggio,
    codice_sconto: String(body.codiceSconto || "").trim().slice(0, 60) || null,
    sconto_percentuale: sconto,
    mese: tipo === "compleanno" ? null : mese,
    giorno: tipo === "compleanno" ? null : giorno,
    attiva: body.attiva === true,
    updated_at: new Date().toISOString(),
  };
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const body = await request.json();
    const { data, error } = await auth.admin.from("automazioni_eventi").insert({ ...automationData(body), negozio_id: auth.store.id }).select("*").single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ automation: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Dati non validi." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const auth = await authorize(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  const { data, error } = await auth.admin.from("automazioni_eventi").update({ attiva: body.attiva === true, updated_at: new Date().toISOString() }).eq("id", id).eq("negozio_id", auth.store.id).select("*").single();
  if (error || !data) return NextResponse.json({ error: "Aggiornamento non riuscito." }, { status: 502 });
  return NextResponse.json({ automation: data });
}

export async function DELETE(request: Request) {
  const auth = await authorize(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const id = new URL(request.url).searchParams.get("id") || "";
  const { error } = await auth.admin.from("automazioni_eventi").delete().eq("id", id).eq("negozio_id", auth.store.id);
  if (error) return NextResponse.json({ error: "Eliminazione non riuscita." }, { status: 502 });
  return NextResponse.json({ success: true });
}
