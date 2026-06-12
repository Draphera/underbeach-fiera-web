import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const PROFILE_SELECT =
  "id, ragione_sociale, partita_iva, indirizzo, cap, citta, provincia, email, telefono_negozio, referente_nome, referente_cognome, referente_cellulare, sito_internet, social, logo_url, attivo, qr_token";

function clean(form: FormData, name: string, maxLength: number) {
  return String(form.get(name) || "").trim().slice(0, maxLength);
}

function extensionFor(type: string) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function PATCH(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authorization = request.headers.get("authorization") || "";
  const accessToken = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Servizio profilo non configurato." },
      { status: 503 }
    );
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
    return NextResponse.json(
      { error: "Account negozio non autorizzato." },
      { status: 403 }
    );
  }

  const { data: currentStore, error: storeError } = await admin
    .from("negozi")
    .select(PROFILE_SELECT)
    .eq("auth_user_id", user.id)
    .eq("attivo", true)
    .single();

  if (storeError || !currentStore) {
    return NextResponse.json(
      { error: "Profilo negozio attivo non trovato." },
      { status: 404 }
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Dati profilo non validi." }, { status: 400 });
  }

  const email = clean(form, "email", 254).toLowerCase();
  const cap = clean(form, "cap", 5);
  const telefonoNegozio = clean(form, "telefono_negozio", 30);
  const referenteCellulare = clean(form, "referente_cellulare", 30);

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Inserisci un'email valida." }, { status: 400 });
  }
  if (cap && !/^\d{5}$/.test(cap)) {
    return NextResponse.json({ error: "Il CAP deve contenere 5 cifre." }, { status: 400 });
  }
  if (telefonoNegozio && !/^[\d+(). /-]{6,30}$/.test(telefonoNegozio)) {
    return NextResponse.json({ error: "Telefono negozio non valido." }, { status: 400 });
  }
  if (referenteCellulare && !/^[\d+(). /-]{8,30}$/.test(referenteCellulare)) {
    return NextResponse.json({ error: "Cellulare referente non valido." }, { status: 400 });
  }

  let logoUrl = currentStore.logo_url as string | null;
  const logo = form.get("logo");

  if (logo instanceof File && logo.size > 0) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(logo.type)) {
      return NextResponse.json(
        { error: "Il logo deve essere PNG, JPG oppure WEBP." },
        { status: 400 }
      );
    }
    if (logo.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Il logo non puo' superare 5 MB." },
        { status: 400 }
      );
    }

    const objectPath = `stores/${user.id}/logo-${Date.now()}.${extensionFor(logo.type)}`;
    const { error: uploadError } = await admin.storage
      .from("underbeach-logos")
      .upload(objectPath, logo, { contentType: logo.type, upsert: false });

    if (uploadError) {
      console.error("Store logo upload failed", uploadError);
      return NextResponse.json(
        { error: "Caricamento logo non riuscito." },
        { status: 502 }
      );
    }

    logoUrl = admin.storage.from("underbeach-logos").getPublicUrl(objectPath).data.publicUrl;
  }

  const update = {
    indirizzo: clean(form, "indirizzo", 180) || null,
    cap: cap || null,
    citta: clean(form, "citta", 100) || null,
    provincia: clean(form, "provincia", 60) || null,
    email,
    telefono_negozio: telefonoNegozio || null,
    referente_nome: clean(form, "referente_nome", 80) || null,
    referente_cognome: clean(form, "referente_cognome", 80) || null,
    referente_cellulare: referenteCellulare || null,
    sito_internet: clean(form, "sito_internet", 240) || null,
    social: clean(form, "social", 240) || null,
    logo_url: logoUrl,
  };

  const previousEmail = String(currentStore.email || user.email || "").toLowerCase();
  if (email !== previousEmail) {
    const { error: authEmailError } = await admin.auth.admin.updateUserById(user.id, {
      email,
      email_confirm: true,
    });
    if (authEmailError) {
      return NextResponse.json(
        { error: authEmailError.message || "Email gia' utilizzata da un altro account." },
        { status: 409 }
      );
    }
  }

  const { data: updatedStore, error: updateError } = await admin
    .from("negozi")
    .update(update)
    .eq("id", currentStore.id)
    .eq("auth_user_id", user.id)
    .select(PROFILE_SELECT)
    .single();

  if (updateError || !updatedStore) {
    console.error("Store profile update failed", updateError);
    if (email !== previousEmail && previousEmail) {
      await admin.auth.admin.updateUserById(user.id, {
        email: previousEmail,
        email_confirm: true,
      });
    }
    return NextResponse.json(
      { error: "Salvataggio profilo non riuscito." },
      { status: 502 }
    );
  }

  return NextResponse.json({ profile: updatedStore, emailChanged: email !== previousEmail });
}
