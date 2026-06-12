"use client";

/*
===========================================================
  Underbeach - Registrazione Negozi (Fase 1 - Luglio 2026)
  © 2026 Underbeach / Draphera - Tutti i diritti riservati
===========================================================
*/

import LanguageSwitcher from "@/components/ui/language-switcher";
import StartButton from "@/components/ui/start-button";
import { copy } from "@/lib/i18n";
import { getSupabaseClient } from "@/lib/supabase";
import { useLanguage } from "@/lib/use-language";
import { useMemo, useState } from "react";

export default function FormPage() {
  const { lang, setLang } = useLanguage();
  const text = copy[lang].form;
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [emailSent, setEmailSent] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!supabase) {
      setErrorMsg(text.errors.generic);
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    const form = new FormData(e.currentTarget);

    const ragione_sociale = String(form.get("ragione_sociale") || "").trim();
    const indirizzo = String(form.get("indirizzo") || "").trim();
    const cap = String(form.get("cap") || "").trim();
    const citta = String(form.get("citta") || "").trim();
    const provincia = String(form.get("provincia") || "").trim();
    const telefono_negozio = String(form.get("telefono_negozio") || "").trim();
    const partita_iva = String(form.get("partita_iva") || "").trim();
    const referente_nome = String(form.get("referente_nome") || "").trim();
    const referente_cognome = String(
      form.get("referente_cognome") || ""
    ).trim();
    const referente_cellulare = String(
      form.get("referente_cellulare") || ""
    ).trim();
    const email = String(form.get("email") || "").trim().toLowerCase();
    const sito_web = String(form.get("sito_web") || "").trim();
    const social = String(form.get("social") || "").trim();
    const privacy_accettata = form.get("privacy_accettata") === "on";

    if (!/^\d{5}$/.test(cap)) {
      setErrorMsg(text.errors.zip);
      setLoading(false);
      return;
    }

    if (!/^\d{11}$/.test(partita_iva)) {
      setErrorMsg(text.errors.vat);
      setLoading(false);
      return;
    }

    if (!/^\d{6,}$/.test(telefono_negozio)) {
      setErrorMsg(text.errors.storePhone);
      setLoading(false);
      return;
    }

    if (!/^\d{8,}$/.test(referente_cellulare)) {
      setErrorMsg(text.errors.mobile);
      setLoading(false);
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setErrorMsg(text.errors.email);
      setLoading(false);
      return;
    }

    if (!privacy_accettata) {
      setErrorMsg(text.errors.privacy);
      setLoading(false);
      return;
    }

    let logo_url = null;
    const logoFile = form.get("logo") as File;

    if (logoFile && logoFile.size > 0) {
      if (!["image/png", "image/jpeg"].includes(logoFile.type)) {
        setErrorMsg(text.errors.logoType);
        setLoading(false);
        return;
      }

      if (logoFile.size > 5 * 1024 * 1024) {
        setErrorMsg(text.errors.logoSize);
        setLoading(false);
        return;
      }

      const fileName = `${Date.now()}-${logoFile.name}`;

      const { error: uploadError } = await supabase.storage
        .from("underbeach-logos")
        .upload(fileName, logoFile);

      if (!uploadError) {
        logo_url = supabase.storage
          .from("underbeach-logos")
          .getPublicUrl(fileName).data.publicUrl;
      }
    }

    const created_at = new Date().toISOString();
    const payload = {
      ragione_sociale,
      indirizzo,
      cap,
      citta,
      provincia,
      telefono_negozio,
      partita_iva,
      referente_nome,
      referente_cognome,
      referente_cellulare,
      email,
      sito_internet: sito_web,
      social,
      logo_url,
      privacy_accettata,
      privacy_accettata_at: created_at,
      created_at,
    };

    const { error } = await supabase.from("negozi").insert(payload);

    if (error) {
      console.error("Supabase registration error", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      const isPermissionError =
        error.code === "42501" ||
        error.message.toLowerCase().includes("permission denied") ||
        error.message.toLowerCase().includes("row-level security");
      setErrorMsg(
        isPermissionError ? text.errors.registrationPermission : text.errors.generic
      );
      setLoading(false);
      return;
    }

    try {
      const emailResponse = await fetch("/api/registration-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          referenteNome: referente_nome,
          ragioneSociale: ragione_sociale,
          partitaIva: partita_iva,
          createdAt: created_at,
          registrationId: `${partita_iva}-${created_at}`,
          lang,
        }),
      });

      const emailResult = await emailResponse.json().catch(() => null);

      if (!emailResponse.ok) {
        console.error("Registration email API error", {
          status: emailResponse.status,
          code: emailResult?.code,
          message: emailResult?.error,
          providerMessage: emailResult?.providerMessage,
        });
      }

      setEmailSent(emailResponse.ok);
    } catch (emailError) {
      console.error("Registration email failed", emailError);
      setEmailSent(false);
    }

    setLoading(false);
    setDone(true);
  }

  if (done) {
    return (
      <main className="ub-form-page ub-form-page--success">
        <header className="ub-form-topbar">
          <span>{text.eyebrow}</span>
          <LanguageSwitcher lang={lang} onChange={setLang} />
        </header>

        <section className="ub-form-success">
          <p>{text.successEyebrow}</p>
          <h1>{text.successTitle}</h1>
          <span>{emailSent ? text.successText : text.successEmailPending}</span>
          <a className="ub-button ub-button--primary" href="/">
            {text.backHome}
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="ub-form-page">
      <header className="ub-form-topbar">
        <span>{text.eyebrow}</span>
        <LanguageSwitcher lang={lang} onChange={setLang} />
      </header>

      <section className="ub-form-hero">
        <div>
          <p>{text.eyebrow}</p>
          <h1>{text.title}</h1>
          <span>{text.lead}</span>
        </div>
      </section>

      <form
        className="ub-form-panel"
        onReset={() => {
          setErrorMsg(null);
          setEmailSent(true);
        }}
        onSubmit={handleSubmit}
      >
        <fieldset>
          <legend>{text.storeData}</legend>

          <label>
            {text.businessName}
            <input name="ragione_sociale" required />
          </label>

          <label>
            {text.address}
            <input name="indirizzo" required />
          </label>

          <div className="ub-form-row ub-form-row--three">
            <label>
              {text.zip}
              <input name="cap" inputMode="numeric" required />
            </label>

            <label>
              {text.city}
              <input name="citta" required />
            </label>

            <label>
              {text.province}
              <input name="provincia" required />
            </label>
          </div>

          <div className="ub-form-row">
            <label>
              {text.storePhone}
              <input name="telefono_negozio" inputMode="tel" required />
            </label>

            <label>
              {text.vat}
              <input name="partita_iva" inputMode="numeric" required />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>{text.contactData}</legend>

          <div className="ub-form-row">
            <label>
              {text.firstName}
              <input name="referente_nome" required />
            </label>

            <label>
              {text.lastName}
              <input name="referente_cognome" required />
            </label>
          </div>

          <label>
            {text.mobile}
            <input name="referente_cellulare" inputMode="tel" required />
          </label>

          <label>
            {text.email}
            <input name="email" type="email" autoComplete="email" required />
          </label>

          <div className="ub-form-row">
            <label>
              {text.website}
              <input name="sito_web" placeholder={text.optional} />
            </label>

            <label>
              {text.social}
              <input name="social" placeholder={text.optional} />
            </label>
          </div>

          <label>
            {text.logo}
            <input type="file" name="logo" accept="image/png,image/jpeg" />
          </label>

          <div className="ub-form-privacy">
            <strong>{text.privacySection}</strong>
            <label className="ub-form-consent">
              <input type="checkbox" name="privacy_accettata" required />
              <span>{text.privacyConsent}</span>
            </label>
            <p>{text.privacyRequired}</p>
          </div>
        </fieldset>

        {errorMsg && <p className="ub-form-error">{errorMsg}</p>}

        <div className="ub-form-actions">
          <button
            className="ub-button ub-button--secondary ub-form-cancel"
            disabled={loading}
            type="reset"
          >
            {text.cancel}
          </button>
          <StartButton className="ub-form-submit" type="submit" disabled={loading}>
            {loading ? text.sending : text.submit}
          </StartButton>
        </div>
      </form>
    </main>
  );
}
