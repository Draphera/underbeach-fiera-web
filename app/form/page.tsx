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
import { useLanguage } from "@/lib/use-language";
import { createClient } from "@supabase/supabase-js";
import { useState } from "react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function FormPage() {
  const { lang, setLang } = useLanguage();
  const text = copy[lang].form;
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
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
    const sito_web = String(form.get("sito_web") || "").trim();
    const social = String(form.get("social") || "").trim();

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
      sito_internet: sito_web,
      social,
      logo_url,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("negozi").insert(payload);

    setLoading(false);

    if (error) {
      console.error(error);
      setErrorMsg(text.errors.generic);
      return;
    }

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
          <span>{text.successText}</span>
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

      <form className="ub-form-panel" onSubmit={handleSubmit}>
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
        </fieldset>

        {errorMsg && <p className="ub-form-error">{errorMsg}</p>}

        <StartButton className="ub-form-submit" type="submit" disabled={loading}>
          {loading ? text.sending : text.submit}
        </StartButton>
      </form>
    </main>
  );
}
