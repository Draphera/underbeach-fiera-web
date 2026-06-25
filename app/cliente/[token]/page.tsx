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

type CustomerTab = "overview" | "messages" | "products" | "profile";

const INTERESTS = ["Beachwear", "Abbigliamento", "Underwear", "Lingerie", "Maglieria intima", "Calzetteria"];

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
  const [customerTab, setCustomerTab] = useState<CustomerTab>("overview");
  const [credentials, setCredentials] = useState<{ email: string; telefono: string } | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

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
      setCredentials({
        email: String(credentials.email || "").trim().toLowerCase(),
        telefono: String(credentials.telefono || "").trim(),
      });
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

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!credentials) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileNotice(null);
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch(`/api/public/stores/${encodeURIComponent(params.token)}/customer`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: credentials.email,
          telefono: credentials.telefono,
          nome: form.get("nome"),
          cognome: form.get("cognome"),
          citta: form.get("citta"),
          nextEmail: form.get("email"),
          nextTelefono: form.get("telefono"),
          nascitaGiorno: form.get("nascita_giorno"),
          nascitaMese: form.get("nascita_mese"),
          profiliSocial: form.get("profili_social"),
          genere: form.get("genere"),
          tagliaSeno: form.get("taglia_seno"),
          tagliaSlip: form.get("taglia_slip"),
          merceologieInteresse: form.getAll("merceologie_interesse"),
          marketingAccettato: form.get("marketing") === "on",
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setProfileError(result?.error || "Aggiornamento non completato.");
        return;
      }

      const nextDashboard = result as CustomerDashboard;
      setDashboard(nextDashboard);
      setCredentials({
        email: nextDashboard.customer.email || "",
        telefono: nextDashboard.customer.telefono || "",
      });
      setProfileNotice("Dati aggiornati correttamente.");
    } catch {
      setProfileError("Connessione non disponibile. Riprova tra poco.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleDeleteProfile() {
    if (!credentials || deleteText.trim().toUpperCase() !== "CANCELLA") return;
    if (!window.confirm("Confermi la cancellazione definitiva dal negozio?")) return;
    setDeleting(true);
    setProfileError(null);
    setProfileNotice(null);

    try {
      const response = await fetch(`/api/public/stores/${encodeURIComponent(params.token)}/customer`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...credentials, confirmation: deleteText }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setProfileError(result?.error || "Cancellazione non completata.");
        return;
      }

      setDashboard(null);
      setCredentials(null);
      setDone(false);
      setDeleteText("");
      setAccessError("Profilo cancellato correttamente.");
    } catch {
      setProfileError("Connessione non disponibile. Riprova tra poco.");
    } finally {
      setDeleting(false);
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
    const customer = dashboard.customer;

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

        <nav className="ub-customer-tabs" aria-label="Sezioni area cliente">
          <button className={customerTab === "overview" ? "is-active" : ""} onClick={() => setCustomerTab("overview")} type="button">Panoramica</button>
          <button className={customerTab === "messages" ? "is-active" : ""} onClick={() => setCustomerTab("messages")} type="button">Messaggi</button>
          <button className={customerTab === "products" ? "is-active" : ""} onClick={() => setCustomerTab("products")} type="button">Articoli</button>
          <button className={customerTab === "profile" ? "is-active" : ""} onClick={() => setCustomerTab("profile")} type="button">I miei dati</button>
        </nav>

        {customerTab === "overview" && (
          <>
            <section className="ub-customer-dashboard__stats">
              <article><span>Messaggi</span><strong>{dashboard.communications.length}</strong><small>Storico personale</small></article>
              <article><span>Articoli</span><strong>{dashboard.products.length}</strong><small>Dal negozio</small></article>
              <article><span>Consenso</span><strong>{customer.marketing_accettato ? "Attivo" : "Base"}</strong><small>Comunicazioni commerciali</small></article>
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
              <article className="ub-customer-panel">
                <div className="ub-customer-panel__heading"><span>Profilo</span><h2>I tuoi riferimenti</h2></div>
                <div className="ub-customer-profile-summary">
                  <span><strong>Email</strong>{customer.email}</span>
                  <span><strong>Cellulare</strong>{customer.telefono}</span>
                  <span><strong>Citta</strong>{customer.citta}</span>
                  <span><strong>Registrato</strong>{formatDate(customer.created_at)}</span>
                </div>
                <button className="ub-customer-secondary-button" onClick={() => setCustomerTab("profile")} type="button">Modifica dati</button>
              </article>
            </section>
          </>
        )}

        {customerTab === "products" && (
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
        )}

        {customerTab === "messages" && (
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
        )}

        {customerTab === "profile" && (
          <section className="ub-customer-panel">
            <div className="ub-customer-panel__heading"><span>Gestione profilo</span><h2>I miei dati</h2></div>
            <form className="ub-customer-profile-form" onSubmit={handleProfileSave}>
              <div className="ub-customer-form__row">
                <label>Nome<input defaultValue={customer.nome} name="nome" required /></label>
                <label>Cognome<input defaultValue={customer.cognome} name="cognome" required /></label>
              </div>
              <div className="ub-customer-form__row">
                <label>Email<input defaultValue={customer.email || ""} name="email" required type="email" /></label>
                <label>Cellulare<input defaultValue={customer.telefono || ""} inputMode="tel" name="telefono" required /></label>
              </div>
              <label>Citta<input defaultValue={customer.citta || ""} name="citta" required /></label>
              <div className="ub-customer-form__row">
                <label>Giorno di nascita<select defaultValue={customer.nascita_giorno || ""} name="nascita_giorno"><option value="">Giorno</option>{Array.from({ length: 31 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>
                <label>Mese di nascita<select defaultValue={customer.nascita_mese || ""} name="nascita_mese"><option value="">Mese</option>{["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"].map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label>
              </div>
              <label>Profili social<input defaultValue={customer.profili_social || ""} name="profili_social" /></label>
              <label>Genere<select defaultValue={customer.genere || ""} name="genere"><option value="">Non indicato</option><option value="uomo">Uomo</option><option value="donna">Donna</option><option value="non_definito">Non definito</option></select></label>
              <div className="ub-customer-form__row">
                <label>Taglia seno<input defaultValue={customer.taglia_seno || ""} name="taglia_seno" /></label>
                <label>Taglia slip<input defaultValue={customer.taglia_slip || ""} name="taglia_slip" /></label>
              </div>
              <div className="ub-customer-interests ub-customer-interests--light">
                <strong>Merceologie di interesse</strong>
                {INTERESTS.map((interest) => (
                  <label className="ub-customer-check" key={interest}><input defaultChecked={customer.merceologie_interesse?.includes(interest)} name="merceologie_interesse" type="checkbox" value={interest} /><span>{interest}</span></label>
                ))}
              </div>
              <label className="ub-customer-check ub-customer-check--light"><input defaultChecked={customer.marketing_accettato} name="marketing" type="checkbox" /><span>Desidero ricevere informazioni commerciali dal negozio.</span></label>
              {profileNotice && <strong className="ub-customer-notice">{profileNotice}</strong>}
              {profileError && <strong className="ub-customer-error">{profileError}</strong>}
              <button disabled={profileSaving} type="submit">{profileSaving ? "Salvataggio..." : "Salva modifiche"}</button>
            </form>

            <section className="ub-customer-danger-zone">
              <div>
                <span>Area privacy</span>
                <h3>Cancellazione dal negozio</h3>
                <p>Elimina il tuo profilo cliente e interrompe la ricezione di comunicazioni da questo negozio.</p>
              </div>
              <label>Scrivi CANCELLA per confermare<input onChange={(event) => setDeleteText(event.target.value)} value={deleteText} /></label>
              <button disabled={deleting || deleteText.trim().toUpperCase() !== "CANCELLA"} onClick={handleDeleteProfile} type="button">{deleting ? "Cancellazione..." : "Cancella profilo"}</button>
            </section>
          </section>
        )}
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
