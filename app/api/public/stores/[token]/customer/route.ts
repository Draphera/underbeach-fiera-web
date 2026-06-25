import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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

export async function POST(request: Request, { params }: RouteContext) {
  const admin = serverClient();
  if (!admin) return NextResponse.json({ error: "Servizio cliente non configurato." }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  const email = clean(body.email, 254).toLowerCase();
  const telefono = clean(body.telefono, 30);

  if (!email || !telefono) {
    return NextResponse.json({ error: "Inserisci email e cellulare usati in registrazione." }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(email) || !/^[\d+(). /-]{8,30}$/.test(telefono)) {
    return NextResponse.json({ error: "Email o cellulare non validi." }, { status: 400 });
  }

  const { data: store, error: storeError } = await admin
    .from("negozi")
    .select("id, ragione_sociale, citta, provincia, logo_url")
    .eq("qr_token", params.token)
    .eq("attivo", true)
    .single();

  if (storeError || !store) {
    return NextResponse.json({ error: "Negozio non disponibile." }, { status: 404 });
  }

  const { data: customer, error: customerError } = await admin
    .from("clienti")
    .select("id, nome, cognome, email, telefono, citta, marketing_accettato, created_at")
    .eq("negozio_id", store.id)
    .eq("email", email)
    .eq("telefono", telefono)
    .single();

  if (customerError || !customer) {
    return NextResponse.json({ error: "Cliente non trovato. Controlla email e cellulare." }, { status: 404 });
  }

  const [communicationsResult, productsResult] = await Promise.all([
    admin
      .from("comunicazioni")
      .select("id, tipo, oggetto, messaggio, stato, created_at")
      .eq("negozio_id", store.id)
      .eq("cliente_id", customer.id)
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("prodotti")
      .select("id, nome, categoria, descrizione, prezzo, prezzo_promozionale, taglie, colori, quantita, immagine_url, updated_at")
      .eq("negozio_id", store.id)
      .eq("pubblicato", true)
      .order("updated_at", { ascending: false })
      .limit(24),
  ]);

  if (communicationsResult.error) {
    return NextResponse.json({ error: "Storico comunicazioni non disponibile." }, { status: 502 });
  }
  if (productsResult.error) {
    return NextResponse.json({ error: "Catalogo prodotti non disponibile." }, { status: 502 });
  }

  return NextResponse.json({
    store,
    customer,
    communications: communicationsResult.data || [],
    products: productsResult.data || [],
  });
}
