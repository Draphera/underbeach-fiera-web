import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const PRODUCT_SELECT =
  "id, nome, sku, categoria, descrizione, prezzo, prezzo_promozionale, taglie, colori, quantita, immagine_url, pubblicato, created_at, updated_at";

const CATEGORIES = [
  "Beachwear",
  "Abbigliamento",
  "Underwear",
  "Lingerie",
  "Maglieria intima",
  "Calzetteria",
  "Altro",
];

function clean(form: FormData, name: string, maxLength: number) {
  return String(form.get(name) || "").trim().slice(0, maxLength);
}

function stringList(form: FormData, name: string) {
  return clean(form, name, 500)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 30);
}

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

async function authorize(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.get("authorization") || "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  if (!supabaseUrl || !serviceRoleKey) return { error: "Servizio catalogo non configurato.", status: 503 } as const;
  if (!accessToken) return { error: "Sessione mancante.", status: 401 } as const;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  const user = userData.user;

  if (userError || !user || user.app_metadata?.role !== "store") {
    return { error: "Account negozio non autorizzato.", status: 403 } as const;
  }

  const { data: store, error: storeError } = await admin
    .from("negozi")
    .select("id")
    .eq("auth_user_id", user.id)
    .eq("attivo", true)
    .single();

  if (storeError || !store) return { error: "Negozio attivo non trovato.", status: 404 } as const;
  return { admin, user, store } as const;
}

async function productData(form: FormData, currentImage: string | null, admin: any, userId: string) {
  const nome = clean(form, "nome", 140);
  const categoria = clean(form, "categoria", 80);
  const prezzo = Number(clean(form, "prezzo", 20).replace(",", "."));
  const promoRaw = clean(form, "prezzo_promozionale", 20).replace(",", ".");
  const prezzoPromozionale = promoRaw ? Number(promoRaw) : null;
  const quantita = Number.parseInt(clean(form, "quantita", 10), 10);

  if (!nome) throw new Error("Il nome prodotto e' obbligatorio.");
  if (!CATEGORIES.includes(categoria)) throw new Error("Seleziona una categoria valida.");
  if (!Number.isFinite(prezzo) || prezzo < 0) throw new Error("Inserisci un prezzo valido.");
  if (prezzoPromozionale !== null && (!Number.isFinite(prezzoPromozionale) || prezzoPromozionale < 0 || prezzoPromozionale > prezzo)) {
    throw new Error("Il prezzo promozionale deve essere valido e non superiore al prezzo.");
  }
  if (!Number.isInteger(quantita) || quantita < 0) throw new Error("Inserisci una quantita' valida.");

  let immagineUrl = currentImage;
  const image = form.get("immagine");
  if (image instanceof File && image.size > 0) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(image.type)) throw new Error("L'immagine deve essere PNG, JPG oppure WEBP.");
    if (image.size > 6 * 1024 * 1024) throw new Error("L'immagine non puo' superare 6 MB.");

    const objectPath = `stores/${userId}/${crypto.randomUUID()}.${extensionFor(image.type)}`;
    const { error: uploadError } = await admin.storage
      .from("underbeach-products")
      .upload(objectPath, image, { contentType: image.type, upsert: false });
    if (uploadError) throw new Error("Caricamento immagine non riuscito.");
    immagineUrl = admin.storage.from("underbeach-products").getPublicUrl(objectPath).data.publicUrl;
  }

  return {
    nome,
    sku: clean(form, "sku", 80) || null,
    categoria,
    descrizione: clean(form, "descrizione", 2000) || null,
    prezzo,
    prezzo_promozionale: prezzoPromozionale,
    taglie: stringList(form, "taglie"),
    colori: stringList(form, "colori"),
    quantita,
    immagine_url: immagineUrl,
    pubblicato: form.get("pubblicato") === "true",
    updated_at: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const auth = await authorize(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await auth.admin
    .from("prodotti")
    .select(PRODUCT_SELECT)
    .eq("negozio_id", auth.store.id)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ products: data || [] });
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const form = await request.formData();
    const product = await productData(form, null, auth.admin, auth.user.id);
    const { data, error } = await auth.admin
      .from("prodotti")
      .insert({ ...product, negozio_id: auth.store.id })
      .select(PRODUCT_SELECT)
      .single();
    if (error) {
      const message = error.code === "23505" ? "Esiste gia' un prodotto con questo SKU." : error.message;
      return NextResponse.json({ error: message }, { status: error.code === "23505" ? 409 : 502 });
    }
    return NextResponse.json({ product: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Dati prodotto non validi." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const auth = await authorize(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const form = await request.formData();
    const id = clean(form, "id", 50);
    const { data: current, error: currentError } = await auth.admin
      .from("prodotti")
      .select("id, immagine_url")
      .eq("id", id)
      .eq("negozio_id", auth.store.id)
      .single();
    if (currentError || !current) return NextResponse.json({ error: "Prodotto non trovato." }, { status: 404 });

    const product = await productData(form, current.immagine_url, auth.admin, auth.user.id);
    const { data, error } = await auth.admin
      .from("prodotti")
      .update(product)
      .eq("id", id)
      .eq("negozio_id", auth.store.id)
      .select(PRODUCT_SELECT)
      .single();
    if (error) {
      const message = error.code === "23505" ? "Esiste gia' un prodotto con questo SKU." : error.message;
      return NextResponse.json({ error: message }, { status: error.code === "23505" ? 409 : 502 });
    }
    return NextResponse.json({ product: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Dati prodotto non validi." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await authorize(request);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = new URL(request.url).searchParams.get("id") || "";
  const { error } = await auth.admin.from("prodotti").delete().eq("id", id).eq("negozio_id", auth.store.id);
  if (error) return NextResponse.json({ error: "Eliminazione prodotto non riuscita." }, { status: 502 });
  return NextResponse.json({ success: true });
}
