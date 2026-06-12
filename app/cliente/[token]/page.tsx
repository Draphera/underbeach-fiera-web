"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type PublicStore = {
  ragione_sociale: string | null;
  citta: string | null;
  provincia: string | null;
  logo_url: string | null;
};

export default function CustomerRegistrationPage() {
  const params = useParams<{ token: string }>();
  const [store, setStore] = useState<PublicStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/public/stores/${encodeURIComponent(params.token)}`)
      .then(async (response) => {
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.error || "Negozio non disponibile.");
        if (mounted) setStore(result.store as PublicStore);
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [params.token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/public/stores/${encodeURIComponent(params.token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.get("nome"),
          cognome: form.get("cognome"),
          email: form.get("email"),
          telefono: form.get("telefono"),
          citta: form.get("citta"),
          nascitaGiorno: form.get("nascita_giorno"),
          nascitaMese: form.get("nascita_mese"),
          profiliSocial: form.get("profili_social"),
          genere: form.get("genere"),
          tagliaSeno: form.get("taglia_seno"),
          tagliaSlip: form.get("taglia_slip"),
          merceologieInteresse: form.getAll("merceologie_interesse"),
          privacyAccettata: form.get("privacy") === "on",
          marketingAccettato: form.get("marketing") === "on",
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError(result?.error || "Registrazione non completata.");
      } else {
        setDone(true);
      }
    } catch {
      setError("Connessione non disponibile. Riprova tra poco.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main className="ub-customer-page"><section className="ub-customer-state">Caricamento...</section></main>;
  }

  if (!store) {
    return (
      <main className="ub-customer-page">
        <section className="ub-customer-state">
          <span>Underbeach</span><h1>QR non disponibile</h1><p>{error}</p>
        </section>
      </main>
    );
  }

  if (done) {
    return (
      <main className="ub-customer-page">
        <section className="ub-customer-state ub-customer-state--success">
          <span>Registrazione completata</span>
          <h1>Benvenuto da {store.ragione_sociale}.</h1>
          <p>I tuoi dati sono stati acquisiti correttamente. Il negozio potra' ora tenerti aggiornato secondo le preferenze espresse.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="ub-customer-page">
      <section className="ub-customer-intro">
        <div className="ub-customer-logo">
          {store.logo_url ? <img alt="Logo negozio" src={store.logo_url} /> : <span>{(store.ragione_sociale || "U").slice(0, 1)}</span>}
        </div>
        <span>Underbeach Partner</span>
        <h1>{store.ragione_sociale}</h1>
        <p>{[store.citta, store.provincia].filter(Boolean).join(" - ")}</p>
        <strong>Registrati per entrare in contatto con il negozio e ricevere aggiornamenti dedicati.</strong>
      </section>

      <form className="ub-customer-form" onSubmit={handleSubmit}>
        <div><span>Profilo cliente</span><h2>I tuoi dati</h2></div>
        <div className="ub-customer-form__row">
          <label>Nome<input name="nome" required /></label>
          <label>Cognome<input name="cognome" required /></label>
        </div>
        <div className="ub-customer-form__row">
          <label>Citta<input autoComplete="address-level2" name="citta" required /></label>
          <label>Cellulare<input autoComplete="tel" inputMode="tel" name="telefono" required /></label>
        </div>
        <label>Email <small>Opzionale, necessaria per ricevere comunicazioni via email</small><input autoComplete="email" name="email" type="email" /></label>

        <fieldset className="ub-customer-optional">
          <legend>Preferenze opzionali</legend>
          <div className="ub-customer-form__row">
            <label>Giorno di nascita<select defaultValue="" name="nascita_giorno"><option value="">Giorno</option>{Array.from({ length: 31 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
            <label>Mese di nascita<select defaultValue="" name="nascita_mese"><option value="">Mese</option>{["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"].map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label>
          </div>
          <label>Profili social<input name="profili_social" placeholder="Instagram, Facebook, TikTok..." /></label>
          <label>Genere<select defaultValue="" name="genere"><option value="">Non indicato</option><option value="uomo">Uomo</option><option value="donna">Donna</option><option value="non_definito">Non definito</option></select></label>
          <div className="ub-customer-form__row">
            <label>Taglia seno<input name="taglia_seno" placeholder="Es. 3C, 4D" /></label>
            <label>Taglia slip<input name="taglia_slip" placeholder="Es. S, M, 44" /></label>
          </div>
          <div className="ub-customer-interests">
            <strong>Merceologie di interesse</strong>
            {["Beachwear", "Abbigliamento", "Underwear", "Lingerie", "Maglieria intima", "Calzetteria"].map((interest) => (
              <label className="ub-customer-check" key={interest}><input name="merceologie_interesse" type="checkbox" value={interest} /><span>{interest}</span></label>
            ))}
          </div>
        </fieldset>

        <label className="ub-customer-check"><input name="privacy" required type="checkbox" /><span>Accetto il trattamento dei dati necessario alla registrazione presso il negozio.</span></label>
        <label className="ub-customer-check"><input name="marketing" required type="checkbox" /><span>Desidero ricevere informazioni commerciali, novita' e offerte dal negozio.</span></label>
        {error && <strong className="ub-customer-error">{error}</strong>}
        <button disabled={submitting} type="submit">{submitting ? "Registrazione..." : "Completa registrazione"}</button>
      </form>
    </main>
  );
}
