import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type RouteContext = { params: { token: string } };

type PublicStoreRecord = {
  id: string;
  ragione_sociale: string | null;
  citta: string | null;
  provincia: string | null;
  logo_url: string | null;
};

type CustomerRecord = {
  id: string;
  nome: string;
  cognome: string;
  email: string | null;
  telefono: string | null;
  citta: string | null;
  nascita_giorno: number | null;
  nascita_mese: number | null;
  profili_social: string | null;
  genere: string | null;
  taglia_seno: string | null;
  taglia_slip: string | null;
  merceologie_interesse: string[];
  marketing_accettato: boolean;
  created_at: string;
};

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

const INTERESTS = [
  "Beachwear",
  "Abbigliamento",
  "Underwear",
  "Lingerie",
  "Maglieria intima",
  "Calzetteria",
];

async function findStoreAndCustomer(
  admin: any,
  token: string,
  email: string,
  telefono: string
) {
  const { data: store, error: storeError } = await admin
    .from("negozi")
    .select("id, ragione_sociale, citta, provincia, logo_url")
    .eq("qr_token", token)
    .eq("attivo", true)
    .single();

  const storeRecord = store as PublicStoreRecord | null;

  if (storeError || !storeRecord) {
    return { error: NextResponse.json({ error: "Negozio non disponibile." }, { status: 404 }) };
  }

  const { data: customer, error: customerError } = await admin
    .from("clienti")
    .select("id, nome, cognome, email, telefono, citta, nascita_giorno, nascita_mese, profili_social, genere, taglia_seno, taglia_slip, merceologie_interesse, marketing_accettato, created_at")
    .eq("negozio_id", storeRecord.id)
    .eq("email", email)
    .eq("telefono", telefono)
    .single();

  const customerRecord = customer as CustomerRecord | null;

  if (customerError || !customerRecord) {
    return { error: NextResponse.json({ error: "Cliente non trovato. Controlla email e cellulare." }, { status: 404 }) };
  }

  return { store: storeRecord, customer: customerRecord };
}

async function dashboardPayload(admin: any, store: PublicStoreRecord, customer: CustomerRecord) {
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

async function readCredentials(request: Request) {
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

  return { admin, body, email, telefono };
}

export async function POST(request: Request, { params }: RouteContext) {
  const credentials = await readCredentials(request);
  if (credentials instanceof NextResponse) return credentials;

  const found = await findStoreAndCustomer(credentials.admin, params.token, credentials.email, credentials.telefono);
  if ("error" in found) return found.error;

  return dashboardPayload(credentials.admin, found.store, found.customer);
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const credentials = await readCredentials(request);
  if (credentials instanceof NextResponse) return credentials;

  const found = await findStoreAndCustomer(credentials.admin, params.token, credentials.email, credentials.telefono);
  if ("error" in found) return found.error;

  const nome = clean(credentials.body.nome, 80);
  const cognome = clean(credentials.body.cognome, 80);
  const citta = clean(credentials.body.citta, 100);
  const nextEmail = clean(credentials.body.nextEmail || credentials.body.email, 254).toLowerCase();
  const nextTelefono = clean(credentials.body.nextTelefono || credentials.body.telefono, 30);
  const nascitaGiorno = Number(credentials.body.nascitaGiorno || 0) || null;
  const nascitaMese = Number(credentials.body.nascitaMese || 0) || null;
  const genere = clean(credentials.body.genere, 20);
  const merceologieInteresse = Array.isArray(credentials.body.merceologieInteresse)
    ? credentials.body.merceologieInteresse.map((value) => String(value)).filter((value) => INTERESTS.includes(value))
    : [];

  if (!nome || !cognome || !citta || !nextEmail || !nextTelefono) {
    return NextResponse.json({ error: "Nome, cognome, citta, email e cellulare sono obbligatori." }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(nextEmail) || !/^[\d+(). /-]{8,30}$/.test(nextTelefono)) {
    return NextResponse.json({ error: "Email o cellulare non validi." }, { status: 400 });
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

  const { data: updated, error } = await credentials.admin
    .from("clienti")
    .update({
      nome,
      cognome,
      email: nextEmail,
      telefono: nextTelefono,
      citta,
      nascita_giorno: nascitaGiorno,
      nascita_mese: nascitaMese,
      profili_social: clean(credentials.body.profiliSocial, 500) || null,
      genere: genere || null,
      taglia_seno: clean(credentials.body.tagliaSeno, 30) || null,
      taglia_slip: clean(credentials.body.tagliaSlip, 30) || null,
      merceologie_interesse: merceologieInteresse,
      marketing_accettato: credentials.body.marketingAccettato === true,
    })
    .eq("id", found.customer.id)
    .eq("negozio_id", found.store.id)
    .select("id, nome, cognome, email, telefono, citta, nascita_giorno, nascita_mese, profili_social, genere, taglia_seno, taglia_slip, merceologie_interesse, marketing_accettato, created_at")
    .single();

  if (error || !updated) {
    const message = error?.code === "23505" ? "Email o cellulare gia' registrati presso questo negozio." : "Aggiornamento non completato.";
    return NextResponse.json({ error: message }, { status: error?.code === "23505" ? 409 : 502 });
  }

  return dashboardPayload(credentials.admin, found.store, updated);
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const credentials = await readCredentials(request);
  if (credentials instanceof NextResponse) return credentials;

  const found = await findStoreAndCustomer(credentials.admin, params.token, credentials.email, credentials.telefono);
  if ("error" in found) return found.error;

  const confirmation = clean(credentials.body.confirmation, 40).toUpperCase();
  if (confirmation !== "CANCELLA") {
    return NextResponse.json({ error: "Conferma la cancellazione scrivendo CANCELLA." }, { status: 400 });
  }

  const { error } = await credentials.admin
    .from("clienti")
    .delete()
    .eq("id", found.customer.id)
    .eq("negozio_id", found.store.id);

  if (error) return NextResponse.json({ error: "Cancellazione non completata." }, { status: 502 });
  return NextResponse.json({ success: true });
}
