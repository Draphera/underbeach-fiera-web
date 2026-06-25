import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { EMAIL_BRAND_TEXT, emailBrandFooter } from "@/lib/server/email-brand";

type ActivationRequest = {
  storeId?: string | number;
  active?: boolean;
};

type StoreRecord = {
  id: string | number;
  ragione_sociale: string | null;
  email: string | null;
  referente_nome: string | null;
  auth_user_id: string | null;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function temporaryPassword() {
  return `Ub!${randomBytes(12).toString("base64url")}9a`;
}

function allowedAdminEmails() {
  return (process.env.UNDERBEACH_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function hasAdminRole(user: User | null) {
  if (!user) return false;
  return (
    user.app_metadata?.role === "admin" ||
    user.user_metadata?.role === "admin" ||
    user.user_metadata?.is_admin === true
  );
}

async function findAuthUserByEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const users = data.users as User[];
    const match = users.find((user) => user.email?.toLowerCase() === normalized);
    if (match) return match;
    if (users.length < 100) return null;
    page += 1;
  }

  return null;
}

function activationEmail(store: StoreRecord, password: string, loginUrl: string) {
  const firstName = escapeHtml(store.referente_nome?.trim() || "");
  const businessName = escapeHtml(store.ragione_sociale?.trim() || "il tuo negozio");
  const safeEmail = escapeHtml(store.email || "");
  const safePassword = escapeHtml(password);
  const safeLoginUrl = escapeHtml(loginUrl);

  return {
    subject: "Il tuo negozio Underbeach e' attivo",
    text: `Ciao ${firstName}, ${businessName} e' stato attivato su Underbeach. Accedi da ${loginUrl} con username ${store.email} e password temporanea ${password}. Al primo accesso ti verra' richiesto di scegliere una nuova password.\n\n${EMAIL_BRAND_TEXT}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;color:#0a1a2f;line-height:1.6">
        <p style="color:#b8792f;font-size:12px;font-weight:700;text-transform:uppercase">Underbeach activation</p>
        <h1 style="font-size:30px;line-height:1.15;margin:12px 0">${businessName} e' attivo.</h1>
        <p>Ciao${firstName ? ` ${firstName}` : ""}, la valutazione e' stata completata e ora puoi accedere alla dashboard del negozio.</p>
        <div style="margin:24px 0;padding:20px;background:#f6f3ee;border-left:4px solid #f6c27a">
          <p style="margin:0 0 8px"><strong>Username:</strong> ${safeEmail}</p>
          <p style="margin:0"><strong>Password temporanea:</strong> ${safePassword}</p>
        </div>
        <p>Al primo accesso ti verra' richiesto di impostare una nuova password personale.</p>
        <p style="margin:28px 0"><a href="${safeLoginUrl}" style="background:#0a1a2f;color:#fff;padding:13px 20px;text-decoration:none;font-weight:700">Apri la dashboard</a></p>
        <p style="color:#64707a;font-size:13px">Underbeach / Maredamare 2026</p>
        ${emailBrandFooter()}
      </div>
    `,
  };
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFrom = process.env.RESEND_FROM_EMAIL;
  const authorization = request.headers.get("authorization") || "";
  const accessToken = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!supabaseUrl || !serviceRoleKey || !resendApiKey || !resendFrom) {
    return NextResponse.json(
      { code: "ACTIVATION_NOT_CONFIGURED", error: "Servizio di attivazione non configurato." },
      { status: 503 }
    );
  }

  if (!accessToken) {
    return NextResponse.json(
      { code: "AUTH_REQUIRED", error: "Sessione operatore mancante." },
      { status: 401 }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  const operator = userData.user;
  const isAdmin =
    hasAdminRole(operator) ||
    Boolean(
      operator?.email &&
        allowedAdminEmails().includes(operator.email.toLowerCase())
    );

  if (userError || !operator || !isAdmin) {
    console.error("Store activation unauthorized", {
      operatorEmail: operator?.email || null,
      hasAdminRole: hasAdminRole(operator || null),
      adminAllowlistConfigured: allowedAdminEmails().length > 0,
    });
    return NextResponse.json(
      {
        code: "ADMIN_REQUIRED",
        error:
          "Utente non autorizzato all'attivazione. Verifica che l'email operatore sia inclusa in UNDERBEACH_ADMIN_EMAILS oppure che l'utente abbia ruolo admin.",
      },
      { status: 403 }
    );
  }

  let body: ActivationRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
  }

  if ((typeof body.storeId !== "string" && typeof body.storeId !== "number") || typeof body.active !== "boolean") {
    return NextResponse.json({ error: "Dati di attivazione mancanti." }, { status: 400 });
  }

  const { data, error: storeError } = await admin
    .from("negozi")
    .select("id, ragione_sociale, email, referente_nome, auth_user_id")
    .eq("id", body.storeId)
    .single();
  const store = data as StoreRecord | null;

  if (storeError || !store) {
    console.error("Store activation lookup failed", storeError);
    return NextResponse.json(
      { code: "STORE_NOT_FOUND", error: "Negozio non trovato." },
      { status: 404 }
    );
  }

  if (!body.active) {
    if (store.auth_user_id) {
      const { error: banError } = await admin.auth.admin.updateUserById(
        store.auth_user_id,
        { ban_duration: "876000h" }
      );
      if (banError) {
        console.error("Store account suspension failed", banError);
        return NextResponse.json(
          { code: "ACCOUNT_SUSPENSION_FAILED", error: "Impossibile sospendere l'account negozio." },
          { status: 502 }
        );
      }
    }

    const { error: deactivateError } = await admin
      .from("negozi")
      .update({ attivo: false, attivato_at: null })
      .eq("id", store.id);

    if (deactivateError) {
      console.error("Store deactivation failed", deactivateError);
      return NextResponse.json(
        { code: "DEACTIVATION_FAILED", error: "Disattivazione non completata." },
        { status: 502 }
      );
    }

    return NextResponse.json({ active: false, emailSent: false });
  }

  if (!store.email || !/^\S+@\S+\.\S+$/.test(store.email)) {
    return NextResponse.json(
      { code: "STORE_EMAIL_REQUIRED", error: "Il negozio non ha un'email valida." },
      { status: 400 }
    );
  }

  const password = temporaryPassword();
  let authUserId = store.auth_user_id;
  let createdUser = false;

  if (authUserId) {
    const { error: updateUserError } = await admin.auth.admin.updateUserById(authUserId, {
      password,
      ban_duration: "none",
      user_metadata: { store_id: String(store.id), must_change_password: true },
      app_metadata: { role: "store" },
    });
    if (updateUserError) {
      console.error("Store account update failed", updateUserError);
      return NextResponse.json(
        { code: "ACCOUNT_UPDATE_FAILED", error: "Impossibile aggiornare l'account negozio." },
        { status: 502 }
      );
    }
  } else {
    let existingUser;
    try {
      existingUser = await findAuthUserByEmail(admin, store.email);
    } catch (lookupError) {
      console.error("Store account lookup failed", lookupError);
      return NextResponse.json(
        { code: "ACCOUNT_LOOKUP_FAILED", error: "Impossibile verificare l'account negozio esistente." },
        { status: 502 }
      );
    }

    if (existingUser) {
      const { error: reuseError } = await admin.auth.admin.updateUserById(existingUser.id, {
        password,
        ban_duration: "none",
        email_confirm: true,
        user_metadata: { ...existingUser.user_metadata, store_id: String(store.id), must_change_password: true },
        app_metadata: { ...existingUser.app_metadata, role: "store" },
      });
      if (reuseError) {
        console.error("Existing store account update failed", reuseError);
        return NextResponse.json(
          { code: "ACCOUNT_UPDATE_FAILED", error: "Impossibile aggiornare l'account negozio esistente." },
          { status: 502 }
        );
      }
      authUserId = existingUser.id;
    } else {
      const { data: created, error: createUserError } = await admin.auth.admin.createUser({
        email: store.email.toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { store_id: String(store.id), must_change_password: true },
        app_metadata: { role: "store" },
      });

      if (createUserError || !created.user) {
        console.error("Store account creation failed", createUserError);
        return NextResponse.json(
          { code: "ACCOUNT_CREATION_FAILED", error: createUserError?.message || "Impossibile creare l'account negozio." },
          { status: 409 }
        );
      }

      authUserId = created.user.id;
      createdUser = true;
    }
  }

  const activatedAt = new Date().toISOString();
  const { error: activationError } = await admin
    .from("negozi")
    .update({
      attivo: true,
      attivato_at: activatedAt,
      auth_user_id: authUserId,
      access_invited_at: activatedAt,
    })
    .eq("id", store.id);

  if (activationError) {
    console.error("Store activation update failed", activationError);
    if (createdUser && authUserId) await admin.auth.admin.deleteUser(authUserId);
    return NextResponse.json(
      { code: "ACTIVATION_FAILED", error: "Attivazione non completata nel database." },
      { status: 502 }
    );
  }

  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin}/negozio`;
  const content = activationEmail(store, password, loginUrl);
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `store-activation-${store.id}-${activatedAt}`.slice(0, 256),
    },
    body: JSON.stringify({
      from: resendFrom,
      to: [store.email],
      subject: content.subject,
      text: content.text,
      html: content.html,
      tags: [{ name: "source", value: "store_activation" }],
    }),
  });
  const resendBody = await resendResponse.json().catch(() => null);

  if (!resendResponse.ok) {
    console.error("Store activation email failed", resendBody);
    await admin.from("negozi").update({ attivo: false, attivato_at: null }).eq("id", store.id);
    if (createdUser && authUserId) {
      await admin.auth.admin.deleteUser(authUserId);
      await admin.from("negozi").update({ auth_user_id: null, access_invited_at: null }).eq("id", store.id);
    } else if (authUserId) {
      await admin.auth.admin.updateUserById(authUserId, { ban_duration: "876000h" });
    }
    return NextResponse.json(
      {
        code: "ACTIVATION_EMAIL_FAILED",
        error: "Account preparato, ma Resend ha rifiutato la mail. Attivazione annullata.",
        providerMessage: resendBody?.message,
      },
      { status: 502 }
    );
  }

  await admin
    .from("negozi")
    .update({ activation_email_sent_at: new Date().toISOString() })
    .eq("id", store.id);

  return NextResponse.json({ active: true, emailSent: true, activatedAt });
}
