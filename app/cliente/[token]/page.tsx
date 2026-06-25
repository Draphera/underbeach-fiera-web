"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type PublicStore = {
  ragione_sociale: string | null;
  citta: string | null;
  provincia: string | null;
  logo_url: string | null;
};

type CustomerDashboard = {
  store: PublicStore;
  customer: {
    nome: string;
    cognome: string;
    email: string | null;
    citta: string | null;
    marketing_accettato: boolean;
    created_at: string;
  };
  communications: {
    id: string;
    tipo: string;
    oggetto: string;
    messaggio: string;
    stato: string;
    created_at: string;
  }[];
  products: {
    id: string;
    nome: string;
    categoria: string;
    descrizione: string | null;
    prezzo: number;
    prezzo_promozionale: number | null;
    taglie: string[];
    colori: string[];
    quantita: number;
    immagine_url: string | null;
    updated_at: string;
  }[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatPrice(value: number | null) {
  if (value === null || Number.isNaN(Number(value))) return "";
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(Number(value));
}

export default function CustomerRegistrationPage() {
  const params = useParams<{ token: string }>();
  const [store, setStore] = useState<PublicStore | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [accessing, setAccessing] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<CustomerDashboard | null>(null);

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

  async function loadDashboard(credentials: { email: FormDataEntryValue | null; telefono: FormDataEntryValue | null }) {
    setAccessing(true);
    setAccessError(null);

    try {
      const response = await fetch(`/api/public/stores/${encodeURIComponent(params.token)}/customer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: credentials.email,
          telefono: credentials.telefono,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setAccessError(result?.error || "Dashboard cliente non disponibile.");
        return null;
      }

      const nextDashboard = result as CustomerDashboard;
      setDashboard(nextDashboard);
      setStore(nextDashboard.store);
      return nextDashboard;
    } catch {
      setAccessError("Connessione non disponibile. Riprova tra poco.");
      return null;
    } finally {
      setAccessing(false);
    }
  }

  async function handleAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await loadDashboard({
      email: form.get("email"),
      telefono: form.get("telefono"),
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = form.get("email");
    const telefono = form.get("telefono");

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
        await loadDashboard({ email, telefono });
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

  if (dashboard) {
    const latestMessage = dashboard.communications[0];

    return (
      <main className="ub-customer-dashboard">
        <section className="ub-customer-dashboard__hero">
          <div className="ub-customer-logo">
            {dashboard.store.logo_url ? <img alt="Logo negozio" src={dashboard.store.logo_url} /> : <span>{(dashboard.store.ragione_sociale || "U").slice(0, 1)}</span>}
          </div>
          <div>
            <span>Area cliente</span>
            <h1>Ciao {dashboard.customer.nome}, benvenuto da {dashboard.store.ragione_sociale}.</h1>
            <p>{[dashboard.store.citta, dashboard.store.provincia].filter(Boolean).join(" - ")}</p>
          </div>
        </section>

        <section className="ub-customer-dashboard__stats">
          <article><span>Messaggi</span><strong>{dashboard.communications.length}</strong><small>Storico personale</small></article>
          <article><span>Articoli</span><strong>{dashboard.products.length}</strong><small>Dal negozio</small></article>
          <article><span>Consenso</span><strong>{dashboard.customer.marketing_accettato ? "Attivo" : "Base"}</strong><small>Comunicazioni commerciali</small></article>
        </section>

        <section className="ub-customer-dashboard__grid">
          <article className="ub-customer-panel ub-customer-panel--featured">
            <span>Ultimo messaggio</span>
            {latestMessage ? (
              <>
                <h2>{latestMessage.oggetto}</h2>
                <p>{latestMessage.messaggio}</p>
                <time>{formatDate(latestMessage.created_at)}</time>
              </>
            ) : (
              <>
                <h2>Nessun messaggio ancora</h2>
                <p>Quando il negozio ti inviera' comunicazioni dedicate le troverai qui.</p>
              </>
            )}
          </article>

          <section className="ub-customer-panel">
            <div className="ub-customer-panel__heading"><span>Articoli del negozio</span><h2>Catalogo pubblicato</h2></div>
            <div className="ub-customer-product-grid">
              {dashboard.products.length === 0 && <p>Il negozio non ha ancora pubblicato articoli.</p>}
              {dashboard.products.map((product) => (
                <article className="ub-customer-product" key={product.id}>
                  <div className="ub-customer-product__image">
                    {product.immagine_url ? <img alt={product.nome} src={product.immagine_url} /> : <span>{product.categoria}</span>}
                  </div>
                  <div>
                    <small>{product.categoria}</small>
                    <h3>{product.nome}</h3>
                    {product.descrizione && <p>{product.descrizione}</p>}
                    <strong>{formatPrice(product.prezzo_promozionale ?? product.prezzo)}</strong>
                    {product.prezzo_promozionale !== null && <del>{formatPrice(product.prezzo)}</del>}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="ub-customer-panel">
            <div className="ub-customer-panel__heading"><span>Storico comunicazioni</span><h2>Messaggi ricevuti</h2></div>
            <div className="ub-customer-message-list">
              {dashboard.communications.length === 0 && <p>Non ci sono ancora comunicazioni inviate a questo profilo.</p>}
              {dashboard.communications.map((message) => (
                <article key={message.id}>
                  <span>{message.tipo === "invito" ? "Invito" : "Messaggio"}</span>
                  <h3>{message.oggetto}</h3>
                  <p>{message.messaggio}</p>
                  <time>{formatDate(message.created_at)}</time>
                </article>
              ))}
            </div>
          </section>
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
          <p>I tuoi dati sono stati acquisiti correttamente. Riceverai una mail di conferma e il negozio potra' tenerti aggiornato secondo le preferenze espresse.</p>
          {accessing && <p>Prepariamo la tua area cliente...</p>}
          {accessError && <strong className="ub-customer-error">{accessError}</strong>}
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
        <form className="ub-customer-access" onSubmit={handleAccess}>
          <div><span>Gia registrato?</span><strong>Accedi alla tua area cliente</strong></div>
          <label>Email<input autoComplete="email" name="email" required type="email" /></label>
          <label>Cellulare<input autoComplete="tel" inputMode="tel" name="telefono" required /></label>
          {accessError && <strong className="ub-customer-error">{accessError}</strong>}
          <button disabled={accessing} type="submit">{accessing ? "Accesso..." : "Apri dashboard"}</button>
        </form>
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
        <label>Email <small>Obbligatoria per ricevere la conferma di registrazione</small><input autoComplete="email" name="email" required type="email" /></label>

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
