"use client";

import { getSupabaseClient } from "@/lib/supabase";
import { ProductsPanel, type Product } from "@/components/store/products-panel";
import type { Session, User } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

declare global {
  interface Window {
    QRCode?: new (element: HTMLElement, options: { text: string; width: number; height: number; colorDark: string; colorLight: string; correctLevel?: number }) => void;
  }
}

type StoreProfile = {
  id: string | number;
  ragione_sociale: string | null;
  partita_iva: string | null;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  email: string | null;
  telefono_negozio: string | null;
  referente_nome: string | null;
  referente_cognome: string | null;
  referente_cellulare: string | null;
  sito_internet: string | null;
  social: string | null;
  logo_url: string | null;
  attivo: boolean | null;
  qr_token: string | null;
};

type Customer = {
  id: string;
  nome: string;
  cognome: string;
  email: string | null;
  telefono: string | null;
  citta: string | null;
  nascita_giorno: number | null;
  nascita_mese: number | null;
  genere: string | null;
  taglia_seno: string | null;
  taglia_slip: string | null;
  merceologie_interesse: string[];
  marketing_accettato: boolean;
  created_at: string;
};

type Communication = {
  id: string;
  tipo: "invito" | "cliente";
  destinatario_email: string;
  destinatario_nome: string | null;
  oggetto: string;
  stato: "inviata" | "errore";
  provider_error: string | null;
  created_at: string;
};

type EventAutomation = {
  id: string;
  tipo: string;
  nome: string;
  oggetto: string;
  messaggio: string;
  codice_sconto: string | null;
  sconto_percentuale: number | null;
  mese: number | null;
  giorno: number | null;
  attiva: boolean;
};

type CommunicationPayload = {
  type: "invite" | "customer";
  email?: string;
  name?: string;
  customerId?: string;
  subject: string;
  message: string;
};

type StoreView = "overview" | "qr" | "customers" | "communications" | "products";

const STORE_SELECT =
  "id, ragione_sociale, partita_iva, indirizzo, cap, citta, provincia, email, telefono_negozio, referente_nome, referente_cognome, referente_cellulare, sito_internet, social, logo_url, attivo, qr_token";

const STORE_SELECT_WITHOUT_QR =
  "id, ragione_sociale, partita_iva, indirizzo, cap, citta, provincia, email, telefono_negozio, referente_nome, referente_cognome, referente_cellulare, sito_internet, social, logo_url, attivo";

const AUTOMATION_GROUPS = [
  {
    label: "Eventi cliente",
    options: [
      { value: "compleanno", label: "Compleanno cliente", hint: "Usa la data di nascita del cliente" },
    ],
  },
  {
    label: "Festivita",
    options: [
      { value: "natale", label: "Natale", hint: "Auguri e codice sconto natalizio" },
      { value: "pasqua", label: "Pasqua", hint: "Data calcolata automaticamente ogni anno" },
      { value: "ferragosto", label: "Ferragosto", hint: "Messaggio estivo o invito in negozio" },
      { value: "capodanno", label: "Capodanno", hint: "Auguri e nuova collezione" },
      { value: "black_friday", label: "Black Friday", hint: "Offerta dedicata a tempo" },
      { value: "saldi", label: "Saldi stagionali", hint: "Campagna saldi" },
    ],
  },
  {
    label: "Promozioni periodiche",
    options: [
      { value: "sconto_settimanale", label: "Sconto settimanale", hint: "Promemoria ricorrente su una data scelta" },
      { value: "offerta_mensile", label: "Offerta mensile", hint: "Campagna mensile programmata" },
      { value: "campagna_stagionale", label: "Campagna stagionale", hint: "Lancio collezione o stagione" },
      { value: "promozione", label: "Promozione libera", hint: "Messaggio commerciale personalizzato" },
    ],
  },
];

const AUTOMATION_OPTIONS = AUTOMATION_GROUPS.flatMap((group) => group.options);

function automationLabel(type: string) {
  return AUTOMATION_OPTIONS.find((option) => option.value === type)?.label || type.replace(/_/g, " ");
}

function automationDateLabel(automation: EventAutomation) {
  if (automation.tipo === "compleanno") return "data compleanno cliente";
  if (automation.tipo === "pasqua") return "data Pasqua automatica";
  return automation.giorno && automation.mese ? `${automation.giorno}/${automation.mese}` : "data da completare";
}

function isQrMigrationMissing(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("could not find the table") ||
    normalized.includes("relation \"public.clienti\" does not exist") ||
    normalized.includes("relation \"clienti\" does not exist")
  );
}

function isCommunicationsMigrationMissing(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("could not find the table") || normalized.includes("relation \"comunicazioni\" does not exist");
}

function isProductsMigrationMissing(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("could not find the table") || normalized.includes("relation \"prodotti\" does not exist");
}

function isAutomationsMigrationMissing(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("automazioni_eventi") || normalized.includes("could not find the table");
}

function hasStoreRole(user: User | undefined) {
  return user?.app_metadata?.role === "store";
}

function requiresPasswordChange(user: User | undefined) {
  return user?.user_metadata?.must_change_password === true;
}

function QrPanel({ profile }: { profile: StoreProfile }) {
  const qrRenderRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const publicUrl = profile.qr_token
    ? `${typeof window === "undefined" ? "" : window.location.origin}/cliente/${profile.qr_token}`
    : "";

  useEffect(() => {
    if (!publicUrl) return;
    setReady(false);

    function renderQr() {
      if (!window.QRCode || !qrRenderRef.current) return;
      qrRenderRef.current.textContent = "";
      new window.QRCode(qrRenderRef.current, {
        text: publicUrl,
        width: 320,
        height: 320,
        colorDark: "#0a1a2f",
        colorLight: "#ffffff",
        correctLevel: 2,
      });
      setReady(true);
    }

    if (window.QRCode) {
      renderQr();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[data-underbeach-qr="true"]');
    const script = existing || document.createElement("script");
    if (!existing) {
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
      script.async = true;
      script.dataset.underbeachQr = "true";
      document.head.appendChild(script);
    }
    script.addEventListener("load", renderQr, { once: true });
    return () => script.removeEventListener("load", renderQr);
  }, [publicUrl]);

  if (!profile.qr_token) {
    return (
      <section className="ub-store-module-setup">
        <span className="ub-store-eyebrow">Configurazione richiesta</span>
        <h2>Attiva il QR personale</h2>
        <p>Esegui lo script <code>supabase/phase-2-qr-clients.sql</code> nel SQL Editor di Supabase, poi ricarica questa pagina.</p>
      </section>
    );
  }

  async function copyUrl() {
    if (!publicUrl) return;
    await navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function downloadQr() {
    const canvas = qrRenderRef.current?.querySelector("canvas");
    const image = qrRenderRef.current?.querySelector("img");
    const href = canvas?.toDataURL("image/png") || image?.src;
    if (!href) return;
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `qr-${(profile.ragione_sociale || "underbeach").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    anchor.click();
  }

  return (
    <section className="ub-store-qr-panel">
      <div className="ub-store-section-heading">
        <div><span className="ub-store-eyebrow">Acquisizione clienti</span><h2>QR personale del negozio</h2></div>
        <p>Esponilo in cassa, sugli eventi o sui materiali stampati. Ogni registrazione confluisce automaticamente nella sezione Clienti.</p>
      </div>
      <div className="ub-store-qr-layout">
        <div className="ub-store-qr-code">
          <div className="ub-store-qr-render" ref={qrRenderRef} />
          {!ready && <span className="ub-store-qr-loading">Generazione QR...</span>}
        </div>
        <div className="ub-store-qr-info">
          <span>Destinazione pubblica</span>
          <strong>{profile.ragione_sociale}</strong>
          <code>{publicUrl || "Token QR non configurato"}</code>
          <div className="ub-store-qr-actions">
            <button className="ub-store-button" disabled={!ready} onClick={downloadQr} type="button">Scarica PNG</button>
            <button className="ub-store-secondary-button" disabled={!publicUrl} onClick={copyUrl} type="button">{copied ? "URL copiato" : "Copia URL"}</button>
            {publicUrl && <a className="ub-store-secondary-button" href={publicUrl} rel="noreferrer" target="_blank">Apri pagina</a>}
          </div>
          <small>Il token non contiene dati personali e resta associato esclusivamente al tuo negozio.</small>
        </div>
      </div>
    </section>
  );
}

function CustomersPanel({ customers, loading, onRefresh, available }: { customers: Customer[]; loading: boolean; onRefresh: () => void; available: boolean }) {
  const [query, setQuery] = useState("");
  const filtered = customers.filter((customer) =>
    [customer.nome, customer.cognome, customer.email, customer.telefono, customer.citta]
      .filter(Boolean).join(" ").toLowerCase().includes(query.trim().toLowerCase())
  );
  const marketingCount = customers.filter((customer) => customer.marketing_accettato).length;
  const todayCount = customers.filter((customer) => new Date(customer.created_at).toDateString() === new Date().toDateString()).length;

  if (!available) {
    return (
      <section className="ub-store-module-setup">
        <span className="ub-store-eyebrow">Configurazione richiesta</span>
        <h2>Attiva il modulo clienti</h2>
        <p>Esegui lo script <code>supabase/phase-2-qr-clients.sql</code> nel SQL Editor di Supabase, poi ricarica questa pagina.</p>
      </section>
    );
  }

  return (
    <section className="ub-store-customers-panel">
      <div className="ub-store-section-heading">
        <div><span className="ub-store-eyebrow">CRM negozio</span><h2>Clienti acquisiti</h2></div>
        <button className="ub-store-secondary-button" onClick={onRefresh} type="button">Aggiorna</button>
      </div>
      <div className="ub-store-customer-stats">
        <article><span>Totale clienti</span><strong>{customers.length}</strong></article>
        <article><span>Acquisiti oggi</span><strong>{todayCount}</strong></article>
        <article><span>Consenso marketing</span><strong>{marketingCount}</strong></article>
      </div>
      <div className="ub-store-customer-tools">
        <input aria-label="Cerca clienti" onChange={(event) => setQuery(event.target.value)} placeholder="Cerca nome, email, telefono o citta" value={query} />
        <span>{filtered.length} risultati</span>
      </div>
      <div className="ub-store-customer-table">
        <div className="ub-store-customer-row ub-store-customer-row--head"><span>Cliente</span><span>Contatti</span><span>Citta</span><span>Marketing</span><span>Acquisizione</span></div>
        {loading && <p>Caricamento clienti...</p>}
        {!loading && filtered.length === 0 && <p>Nessun cliente corrisponde ai filtri attuali.</p>}
        {!loading && filtered.map((customer) => (
          <div className="ub-store-customer-row" key={customer.id}>
            <span><strong>{customer.nome} {customer.cognome}</strong><small>{customer.email || "Email non indicata"}</small></span>
            <span><strong>{customer.telefono || "Non indicato"}</strong><small>{customer.nascita_giorno && customer.nascita_mese ? `${customer.nascita_giorno}/${customer.nascita_mese}` : "Nascita non indicata"}</small></span>
            <span>{customer.citta || "Non indicata"}</span>
            <span><mark className={customer.marketing_accettato ? "is-yes" : ""}>{customer.marketing_accettato ? "Accettato" : "Non accettato"}</mark></span>
            <span>{new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(customer.created_at))}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function CommunicationsPanel({
  profile,
  customers,
  history,
  automations,
  loading,
  available,
  onSend,
  onRefresh,
  onAutomationCreate,
  onAutomationToggle,
  onAutomationDelete,
}: {
  profile: StoreProfile;
  customers: Customer[];
  history: Communication[];
  automations: EventAutomation[];
  loading: boolean;
  available: boolean;
  onSend: (payload: CommunicationPayload) => Promise<boolean>;
  onRefresh: () => void;
  onAutomationCreate: (payload: Record<string, unknown>) => Promise<boolean>;
  onAutomationToggle: (automation: EventAutomation) => Promise<void>;
  onAutomationDelete: (automation: EventAutomation) => Promise<void>;
}) {
  const [mode, setMode] = useState<"invite" | "customer">("invite");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const eligibleCustomers = customers.filter((customer) => customer.marketing_accettato && customer.email);
  const inviteUrl = profile.qr_token && typeof window !== "undefined" ? `${window.location.origin}/cliente/${profile.qr_token}` : "";
  const inviteText = `Ciao! Registrati al mio negozio ${profile.ragione_sociale || "Underbeach"}: ${inviteUrl}`;

  async function copyInviteUrl() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (!available) {
    return (
      <section className="ub-store-module-setup">
        <span className="ub-store-eyebrow">Configurazione richiesta</span>
        <h2>Attiva il centro comunicazioni</h2>
        <p>Esegui lo script <code>supabase/phase-2-communications.sql</code> nel SQL Editor di Supabase, poi ricarica la pagina.</p>
      </section>
    );
  }

  async function submitCommunication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setSending(true);
    const sent = await onSend({
      type: mode,
      email: String(form.get("email") || ""),
      name: String(form.get("name") || ""),
      customerId: String(form.get("customer_id") || ""),
      subject: String(form.get("subject") || ""),
      message: String(form.get("message") || ""),
    });
    if (sent) formElement.reset();
    setSending(false);
  }

  async function submitAutomation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const created = await onAutomationCreate({
      tipo: String(form.get("tipo") || ""),
      nome: String(form.get("nome") || ""),
      oggetto: String(form.get("oggetto") || ""),
      messaggio: String(form.get("messaggio") || ""),
      codiceSconto: String(form.get("codice_sconto") || ""),
      scontoPercentuale: String(form.get("sconto_percentuale") || ""),
      mese: String(form.get("mese") || ""),
      giorno: String(form.get("giorno") || ""),
      attiva: form.get("attiva") === "true",
    });
    if (created) formElement.reset();
  }

  return (
    <section className="ub-store-communications-panel">
      <div className="ub-store-section-heading">
        <div><span className="ub-store-eyebrow">Email center</span><h2>Comunicazioni</h2></div>
        <p>Invita nuovi contatti oppure scrivi via SMTP ai clienti che hanno accettato le comunicazioni marketing.</p>
      </div>

      <section className="ub-store-invite-share">
        <div>
          <span className="ub-store-eyebrow">Invito rapido</span>
          <h3>Condividi il link del negozio</h3>
          <p>Il messaggio parte direttamente dall'app scelta sul tuo telefono, senza costi o servizi esterni.</p>
        </div>
        <code>{inviteUrl || "QR personale non configurato"}</code>
        <div className="ub-store-invite-share__actions">
          <button className="ub-store-secondary-button" disabled={!inviteUrl} onClick={copyInviteUrl} type="button">{copied ? "Link copiato" : "Copia link"}</button>
          <a className="ub-store-channel-button ub-store-channel-button--whatsapp" href={`https://wa.me/?text=${encodeURIComponent(inviteText)}`} rel="noreferrer" target="_blank">WhatsApp</a>
          <a className="ub-store-channel-button ub-store-channel-button--sms" href={`sms:?body=${encodeURIComponent(inviteText)}`}>SMS</a>
          <a className="ub-store-channel-button ub-store-channel-button--telegram" href={`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(`Registrati al mio negozio ${profile.ragione_sociale || "Underbeach"}`)}`} rel="noreferrer" target="_blank">Telegram</a>
        </div>
      </section>

      <div className="ub-store-communication-tabs" role="tablist" aria-label="Tipo comunicazione">
        <button className={mode === "invite" ? "is-active" : ""} onClick={() => setMode("invite")} type="button">Invita un cliente</button>
        <button className={mode === "customer" ? "is-active" : ""} onClick={() => setMode("customer")} type="button">Scrivi a un cliente</button>
      </div>

      <form className="ub-store-communication-form" onSubmit={submitCommunication}>
        {mode === "invite" ? (
          <>
            <div className="ub-store-form-grid">
              <label>Nome destinatario<input name="name" placeholder="Facoltativo" /></label>
              <label>Email destinatario<input name="email" required type="email" /></label>
            </div>
            <div className="ub-store-communication-note">
              L'email includera' automaticamente il pulsante verso la pagina di registrazione personalizzata del negozio, la stessa aperta dal QR.
            </div>
          </>
        ) : (
          <label>
            Cliente con consenso marketing
            <select name="customer_id" required defaultValue="">
              <option disabled value="">Seleziona un cliente</option>
              {eligibleCustomers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.nome} {customer.cognome} - {customer.email}</option>
              ))}
            </select>
            {eligibleCustomers.length === 0 && <small>Nessun cliente ha ancora accettato comunicazioni marketing.</small>}
          </label>
        )}

        <label>Oggetto<input maxLength={140} name="subject" placeholder={mode === "invite" ? "Lascia vuoto per usare l'oggetto automatico" : "Oggetto email"} required={mode === "customer"} /></label>
        <label>Messaggio<textarea maxLength={4000} name="message" placeholder={mode === "invite" ? "Lascia vuoto per usare il testo di invito automatico" : "Scrivi il messaggio per il cliente"} required={mode === "customer"} rows={7} /></label>
        <button className="ub-store-button" disabled={sending || (mode === "customer" && eligibleCustomers.length === 0)} type="submit">{sending ? "Invio..." : mode === "invite" ? "Invia invito" : "Invia comunicazione"}</button>
      </form>

      <section className="ub-store-communication-history">
        <div className="ub-store-communication-history__header">
          <div><span className="ub-store-eyebrow">Registro invii</span><h3>Storico comunicazioni</h3></div>
          <button className="ub-store-secondary-button" onClick={onRefresh} type="button">Aggiorna</button>
        </div>
        {loading && <p>Caricamento storico...</p>}
        {!loading && history.length === 0 && <p>Nessuna comunicazione inviata.</p>}
        {!loading && history.map((item) => (
          <article key={item.id}>
            <span><strong>{item.oggetto}</strong><small>{item.destinatario_nome || item.destinatario_email}</small></span>
            <span><strong>{item.tipo === "invito" ? "Invito" : "Cliente"}</strong><small>{item.destinatario_email}</small></span>
            <mark className={item.stato === "inviata" ? "is-sent" : "is-error"}>{item.stato === "inviata" ? "Inviata" : "Errore"}</mark>
            <time>{new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.created_at))}</time>
          </article>
        ))}
      </section>

      <section className="ub-store-automations">
        <div className="ub-store-communication-history__header">
          <div><span className="ub-store-eyebrow">Email automatiche</span><h3>Eventi programmati</h3></div>
          <small>Email pronte per compleanni, festivita, saldi e campagne periodiche. Le notifiche push saranno collegabili nella fase App/PWA.</small>
        </div>
        <div className="ub-store-automation-guide">
          <article><strong>Personalizza il messaggio</strong><span>Nel testo puoi usare <code>{"{nome}"}</code> per il cliente e <code>{"{negozio}"}</code> per il nome del negozio.</span></article>
          <article><strong>Aggiungi promo</strong><span>Codice sconto e percentuale vengono inseriti automaticamente nella mail inviata.</span></article>
          <article><strong>Programma l'evento</strong><span>Compleanno e Pasqua usano date automatiche; gli altri eventi usano giorno e mese scelti dal negozio.</span></article>
        </div>
        <form className="ub-store-automation-form" onSubmit={submitAutomation}>
          <label>
            Tipo evento
            <select name="tipo" required defaultValue="">
              <option disabled value="">Seleziona evento</option>
              {AUTOMATION_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>Nome automazione<input maxLength={120} name="nome" placeholder="Es. Auguri compleanno VIP" required /></label>
          <label>Giorno<input max={31} min={1} name="giorno" placeholder="Es. 25" type="number" /></label>
          <label>Mese<input max={12} min={1} name="mese" placeholder="Es. 12" type="number" /></label>
          <label className="ub-store-automation-wide">Oggetto email<input maxLength={140} name="oggetto" placeholder="Es. {nome}, un regalo speciale da {negozio}" required /></label>
          <label>Codice sconto<input maxLength={60} name="codice_sconto" placeholder="Es. NATALE20" /></label>
          <label>Sconto %<input max={100} min={1} name="sconto_percentuale" placeholder="20" type="number" /></label>
          <label className="ub-store-automation-wide">Messaggio personalizzato<textarea maxLength={4000} name="messaggio" placeholder="Ciao {nome}, ti aspettiamo da {negozio} con una sorpresa dedicata a te." required rows={5} /></label>
          <label className="ub-store-automation-check"><input name="attiva" type="checkbox" value="true" /> Attiva subito</label>
          <button className="ub-store-button" type="submit">Crea automazione</button>
        </form>
        <div className="ub-store-automation-list">
          {automations.length === 0 && <p>Nessuna automazione configurata.</p>}
          {automations.map((automation) => (
            <article key={automation.id}>
              <span><strong>{automation.nome}</strong><small>{automationLabel(automation.tipo)} - {automationDateLabel(automation)}</small></span>
              <span><strong>{automation.oggetto}</strong><small>{automation.codice_sconto || "Nessun codice sconto"}</small></span>
              <button className={automation.attiva ? "ub-store-automation-status is-active" : "ub-store-automation-status"} onClick={() => onAutomationToggle(automation)} type="button">{automation.attiva ? "Attiva" : "In pausa"}</button>
              <button className="ub-store-danger-button" onClick={() => onAutomationDelete(automation)} type="button">Elimina</button>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

export default function StorePortalPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [automations, setAutomations] = useState<EventAutomation[]>([]);
  const [communicationsLoading, setCommunicationsLoading] = useState(false);
  const [communicationsAvailable, setCommunicationsAvailable] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsAvailable, setProductsAvailable] = useState(true);
  const [crmAvailable, setCrmAvailable] = useState(true);
  const [activeView, setActiveView] = useState<StoreView>("overview");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const sessionFallback = window.setTimeout(() => {
      if (mounted) setLoading(false);
    }, 2000);

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      window.clearTimeout(sessionFallback);
      setSession(data.session);
      setForcePasswordChange(requiresPasswordChange(data.session?.user));
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setLoading(false);

      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(false);
        setForcePasswordChange(true);
        setNotice("Scegli una nuova password per recuperare l'accesso.");
      } else {
        setForcePasswordChange(requiresPasswordChange(nextSession?.user));
      }

      if (!nextSession) setProfile(null);
    });

    return () => {
      mounted = false;
      window.clearTimeout(sessionFallback);
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !session || !hasStoreRole(session.user)) {
      setProfile(null);
      return;
    }

    let mounted = true;

    async function loadProfile() {
      const { data, error: profileError } = await supabase
        .from("negozi")
        .select(STORE_SELECT)
        .eq("auth_user_id", session.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (profileError && isQrMigrationMissing(profileError.message)) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("negozi")
          .select(STORE_SELECT_WITHOUT_QR)
          .eq("auth_user_id", session.user.id)
          .maybeSingle();

        if (!mounted) return;

        if (fallbackError || !fallbackData) {
          setError(fallbackError?.message || "Il profilo negozio non e' collegato a questo account.");
          setProfile(null);
        } else {
          setCrmAvailable(false);
          setProfile({ ...(fallbackData as StoreProfile), qr_token: null });
        }
      } else if (profileError || !data) {
        setError(
          !data || profileError?.code === "PGRST116"
            ? "Il profilo negozio non e' attivo o non e' collegato a questo account."
            : profileError?.message || "Profilo negozio non disponibile."
        );
        setProfile(null);
      } else {
        setProfile(data as StoreProfile);
      }
    }

    loadProfile();
    return () => {
      mounted = false;
    };
  }, [session, supabase]);

  const loadCustomers = useCallback(async () => {
    if (!supabase || !session || !hasStoreRole(session.user) || !crmAvailable) return;
    setCustomersLoading(true);
    const { data, error: customersError } = await supabase
      .from("clienti")
      .select("id, nome, cognome, email, telefono, citta, nascita_giorno, nascita_mese, genere, taglia_seno, taglia_slip, merceologie_interesse, marketing_accettato, created_at")
      .order("created_at", { ascending: false });

    if (customersError) {
      if (isQrMigrationMissing(customersError.message)) {
        setCrmAvailable(false);
      } else {
        setError(customersError.message);
      }
      setCustomers([]);
    } else {
      setCustomers((data || []) as Customer[]);
    }
    setCustomersLoading(false);
  }, [crmAvailable, session, supabase]);

  useEffect(() => {
    if (profile && crmAvailable) loadCustomers();
  }, [profile, crmAvailable, loadCustomers]);

  const loadCommunications = useCallback(async () => {
    if (!supabase || !session || !hasStoreRole(session.user) || !communicationsAvailable) return;
    setCommunicationsLoading(true);
    const { data, error: communicationsError } = await supabase
      .from("comunicazioni")
      .select("id, tipo, destinatario_email, destinatario_nome, oggetto, stato, provider_error, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (communicationsError) {
      if (isCommunicationsMigrationMissing(communicationsError.message)) {
        setCommunicationsAvailable(false);
      } else {
        setError(communicationsError.message);
      }
      setCommunications([]);
    } else {
      setCommunications((data || []) as Communication[]);
    }
    setCommunicationsLoading(false);
  }, [communicationsAvailable, session, supabase]);

  useEffect(() => {
    if (profile) loadCommunications();
  }, [profile, loadCommunications]);

  const loadAutomations = useCallback(async () => {
    if (!supabase || !session || !hasStoreRole(session.user)) return;
    const { data, error: automationError } = await supabase.from("automazioni_eventi").select("id, tipo, nome, oggetto, messaggio, codice_sconto, sconto_percentuale, mese, giorno, attiva").order("created_at", { ascending: false });
    if (automationError) {
      if (!isAutomationsMigrationMissing(automationError.message)) setError(automationError.message);
      setAutomations([]);
    } else setAutomations((data || []) as EventAutomation[]);
  }, [session, supabase]);

  useEffect(() => {
    if (profile) loadAutomations();
  }, [profile, loadAutomations]);

  const loadProducts = useCallback(async () => {
    if (!supabase || !session || !hasStoreRole(session.user) || !productsAvailable) return;
    setProductsLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setProductsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/store/products", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        if (isProductsMigrationMissing(result?.error || "")) setProductsAvailable(false);
        else setError(result?.error || "Caricamento catalogo non riuscito.");
        setProducts([]);
      } else {
        setProducts((result?.products || []) as Product[]);
      }
    } catch (productsError) {
      console.error("Products request failed", productsError);
      setError("Impossibile caricare il catalogo prodotti.");
    }
    setProductsLoading(false);
  }, [productsAvailable, session, supabase]);

  useEffect(() => {
    if (profile) loadProducts();
  }, [profile, loadProducts]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setSubmitting(true);
    setError(null);
    setNotice(null);

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (loginError) {
      setError("Credenziali non valide oppure account sospeso.");
    } else if (!hasStoreRole(data.user)) {
      await supabase.auth.signOut();
      setError("Questo accesso e' riservato agli account negozio.");
    } else {
      setPassword("");
    }

    setSubmitting(false);
  }

  async function handleRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;

    setSubmitting(true);
    setError(null);
    setNotice(null);

    const redirectTo = `${window.location.origin}/negozio`;
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo }
    );

    if (recoveryError) {
      setError(recoveryError.message);
    } else {
      setRecoverySent(true);
      setNotice("Controlla la posta: abbiamo inviato il link per scegliere una nuova password.");
    }

    setSubmitting(false);
  }

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session) return;

    if (newPassword.length < 10) {
      setError("La nuova password deve contenere almeno 10 caratteri.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Le due password non coincidono.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const currentMetadata = session.user.user_metadata || {};
    const { data, error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
      data: { ...currentMetadata, must_change_password: false },
    });

    if (updateError) {
      setError(updateError.message);
    } else {
      const { data: refreshed } = await supabase.auth.getSession();
      setSession(refreshed.session);
      setForcePasswordChange(false);
      setNewPassword("");
      setConfirmPassword("");
      setNotice("Password aggiornata. Il tuo accesso e' ora personale e sicuro.");
      if (data.user && !hasStoreRole(data.user)) {
        await supabase.auth.signOut();
      }
    }

    setSubmitting(false);
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setError(null);
    setNotice(null);
    setEmail("");
    setCustomers([]);
    setCommunications([]);
    setAutomations([]);
    setProducts([]);
    setActiveView("overview");
  }

  async function handleProductSave(form: FormData, productId?: string) {
    if (!supabase || !session) return false;
    setError(null);
    setNotice(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setError("Sessione scaduta. Accedi nuovamente.");
      return false;
    }

    if (productId) form.set("id", productId);
    try {
      const response = await fetch("/api/store/products", {
        method: productId ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error || "Salvataggio prodotto non riuscito.");
        return false;
      }
      setNotice(productId ? "Prodotto aggiornato correttamente." : "Prodotto aggiunto al catalogo.");
      await loadProducts();
      return true;
    } catch (productError) {
      console.error("Product save failed", productError);
      setError("Impossibile contattare il servizio catalogo.");
      return false;
    }
  }

  async function handleProductDelete(product: Product) {
    if (!supabase || !session) return false;
    setError(null);
    setNotice(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setError("Sessione scaduta. Accedi nuovamente.");
      return false;
    }

    try {
      const response = await fetch(`/api/store/products?id=${encodeURIComponent(product.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error || "Eliminazione prodotto non riuscita.");
        return false;
      }
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setNotice("Prodotto eliminato dal catalogo.");
      return true;
    } catch (productError) {
      console.error("Product delete failed", productError);
      setError("Impossibile contattare il servizio catalogo.");
      return false;
    }
  }

  async function handleCommunicationSend(payload: CommunicationPayload) {
    if (!supabase || !session) return false;
    setError(null);
    setNotice(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setError("Sessione scaduta. Accedi nuovamente.");
      return false;
    }

    try {
      const response = await fetch("/api/store/communications", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError([result?.error, result?.providerMessage].filter(Boolean).join(" ") || "Invio non riuscito.");
        await loadCommunications();
        return false;
      }

      setNotice(payload.type === "invite" ? "Invito inviato con il link di registrazione del negozio." : "Comunicazione inviata al cliente.");
      await loadCommunications();
      return true;
    } catch (sendError) {
      console.error("Communication request failed", sendError);
      setError("Impossibile contattare il servizio email.");
      return false;
    }
  }

  async function automationRequest(method: "POST" | "PATCH" | "DELETE", payload: Record<string, unknown>, id?: string) {
    if (!supabase) return false;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return false;
    const response = await fetch(`/api/store/automations${id ? `?id=${encodeURIComponent(id)}` : ""}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(method !== "DELETE" ? { "Content-Type": "application/json" } : {}) },
      body: method !== "DELETE" ? JSON.stringify(payload) : undefined,
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      setError(result?.error || "Operazione automazione non riuscita.");
      return false;
    }
    await loadAutomations();
    return true;
  }

  async function handleAutomationCreate(payload: Record<string, unknown>) {
    const done = await automationRequest("POST", payload);
    if (done) setNotice("Automazione creata correttamente.");
    return done;
  }

  async function handleAutomationToggle(automation: EventAutomation) {
    if (await automationRequest("PATCH", { id: automation.id, attiva: !automation.attiva })) setNotice("Stato automazione aggiornato.");
  }

  async function handleAutomationDelete(automation: EventAutomation) {
    if (!window.confirm(`Eliminare l'automazione "${automation.nome}"?`)) return;
    if (await automationRequest("DELETE", {}, automation.id)) setNotice("Automazione eliminata.");
  }

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session) return;

    setSubmitting(true);
    setError(null);
    setNotice(null);

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      setError("Sessione scaduta. Accedi nuovamente.");
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/store/profile", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: new FormData(event.currentTarget),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError(result?.error || "Salvataggio profilo non riuscito.");
        return;
      }

      setProfile(result.profile as StoreProfile);
      setEditingProfile(false);
      setNotice(
        result.emailChanged
          ? "Profilo aggiornato. D'ora in poi usa la nuova email per accedere."
          : "Profilo negozio aggiornato correttamente."
      );

      if (result.emailChanged) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed.session) setSession(refreshed.session);
      }
    } catch (profileError) {
      console.error("Store profile request failed", profileError);
      setError("Impossibile contattare il servizio profilo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="ub-store-auth">
        <section className="ub-store-auth__panel">
          <span className="ub-store-eyebrow">Underbeach Store</span>
          <h1>Preparazione area negozio</h1>
          <p>Verifica della sessione in corso...</p>
        </section>
      </main>
    );
  }

  if (!supabase) {
    return (
      <main className="ub-store-auth">
        <section className="ub-store-auth__panel">
          <span className="ub-store-eyebrow">Configurazione</span>
          <h1>Servizio non disponibile</h1>
          <p>Le variabili Supabase non sono configurate.</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="ub-store-auth">
        <section className="ub-store-auth__intro">
          <span className="ub-store-eyebrow">Underbeach Store</span>
          <h1>Il tuo spazio operativo.</h1>
          <p>Accedi per gestire il profilo, i clienti e le attivita del tuo negozio.</p>
          <div className="ub-store-auth__signals">
            <span>Profilo verificato</span>
            <span>Accesso protetto</span>
            <span>Dati isolati</span>
          </div>
        </section>

        <form
          className="ub-store-auth__panel"
          onSubmit={recoveryMode ? handleRecovery : handleLogin}
        >
          <span className="ub-store-eyebrow">
            {recoveryMode ? "Recupero accesso" : "Dashboard negozio"}
          </span>
          <h2>{recoveryMode ? "Reimposta la password" : "Bentornato"}</h2>
          <p>
            {recoveryMode
              ? "Inserisci l'email associata al negozio."
              : "Usa le credenziali ricevute nella mail di attivazione."}
          </p>

          <label>
            Email
            <input
              autoComplete="email"
              disabled={submitting || recoverySent}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          {!recoveryMode && (
            <label>
              Password
              <input
                autoComplete="current-password"
                disabled={submitting}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
          )}

          {error && <strong className="ub-store-message ub-store-message--error">{error}</strong>}
          {notice && <strong className="ub-store-message">{notice}</strong>}

          {!recoverySent && (
            <button className="ub-store-button" disabled={submitting} type="submit">
              {submitting
                ? "Attendi..."
                : recoveryMode
                  ? "Invia link di recupero"
                  : "Accedi"}
            </button>
          )}

          <button
            className="ub-store-text-button"
            disabled={submitting}
            onClick={() => {
              setRecoveryMode((current) => !current);
              setRecoverySent(false);
              setError(null);
              setNotice(null);
            }}
            type="button"
          >
            {recoveryMode ? "Torna al login" : "Password dimenticata?"}
          </button>
        </form>
      </main>
    );
  }

  if (!hasStoreRole(session.user)) {
    return (
      <main className="ub-store-auth">
        <section className="ub-store-auth__panel">
          <span className="ub-store-eyebrow">Accesso non autorizzato</span>
          <h1>Account non compatibile</h1>
          <p>Questa pagina e' riservata agli utenti negozio.</p>
          <button className="ub-store-button" onClick={handleLogout} type="button">
            Esci
          </button>
        </section>
      </main>
    );
  }

  if (forcePasswordChange || requiresPasswordChange(session.user)) {
    const isFirstAccess = requiresPasswordChange(session.user);

    return (
      <main className="ub-store-auth">
        <form className="ub-store-auth__panel" onSubmit={handlePasswordChange}>
          <span className="ub-store-eyebrow">
            {isFirstAccess ? "Primo accesso" : "Sicurezza account"}
          </span>
          <h1>{isFirstAccess ? "Scegli la tua password" : "Aggiorna la password"}</h1>
          <p>
            {isFirstAccess
              ? "La password temporanea ha completato il suo lavoro. Impostane una personale di almeno 10 caratteri."
              : "Imposta una nuova password personale di almeno 10 caratteri."}
          </p>

          <label>
            Nuova password
            <input
              autoComplete="new-password"
              minLength={10}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              type="password"
              value={newPassword}
            />
          </label>
          <label>
            Conferma password
            <input
              autoComplete="new-password"
              minLength={10}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </label>

          {error && <strong className="ub-store-message ub-store-message--error">{error}</strong>}
          {notice && <strong className="ub-store-message">{notice}</strong>}
          <button className="ub-store-button" disabled={submitting} type="submit">
            {submitting ? "Aggiornamento..." : "Salva nuova password"}
          </button>
          <button className="ub-store-text-button" onClick={handleLogout} type="button">
            Esci
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="ub-store-portal">
      <aside className="ub-store-sidebar">
        <div className="ub-store-brand">
          <span>UB</span>
          <div><strong>Underbeach</strong><small>Store workspace</small></div>
        </div>
        <nav aria-label="Navigazione negozio">
          <button className={activeView === "overview" ? "ub-store-nav ub-store-nav--active" : "ub-store-nav"} onClick={() => setActiveView("overview")} type="button">Panoramica</button>
          <button className={activeView === "qr" ? "ub-store-nav ub-store-nav--active" : "ub-store-nav"} onClick={() => setActiveView("qr")} type="button">QR personale</button>
          <button className={activeView === "customers" ? "ub-store-nav ub-store-nav--active" : "ub-store-nav"} onClick={() => setActiveView("customers")} type="button">Clienti</button>
          <button className={activeView === "communications" ? "ub-store-nav ub-store-nav--active" : "ub-store-nav"} onClick={() => setActiveView("communications")} type="button">Comunicazioni</button>
          <button className={activeView === "products" ? "ub-store-nav ub-store-nav--active" : "ub-store-nav"} onClick={() => setActiveView("products")} type="button">Prodotti</button>
        </nav>
        <div className="ub-store-sidebar__footer">
          <small>Account negozio</small>
          <strong>{session.user.email}</strong>
          <button onClick={() => setForcePasswordChange(true)} type="button">
            Cambia password
          </button>
          <button onClick={handleLogout} type="button">Esci</button>
        </div>
      </aside>

      <section className="ub-store-main">
        <header className="ub-store-topbar">
          <div>
            <span className="ub-store-eyebrow">Area negozio</span>
            <h1>{profile?.ragione_sociale || "Dashboard"}</h1>
          </div>
          <div className="ub-store-topbar__actions">
            <span className="ub-store-status">Attivo</span>
            {activeView === "overview" && (
              <button
                className="ub-store-secondary-button"
                onClick={() => {
                  setEditingProfile((current) => !current);
                  setError(null);
                  setNotice(null);
                }}
                type="button"
              >
                {editingProfile ? "Annulla modifica" : "Modifica profilo"}
              </button>
            )}
          </div>
        </header>

        {error && <strong className="ub-store-message ub-store-message--error">{error}</strong>}
        {notice && <strong className="ub-store-message">{notice}</strong>}
        {!crmAvailable && activeView === "overview" && (
          <strong className="ub-store-message ub-store-message--warning">
            QR e clienti attendono la migrazione Supabase. La gestione del profilo resta disponibile.
          </strong>
        )}

        {activeView === "overview" && <>
        <section className="ub-store-welcome">
          <div className="ub-store-welcome__logo">
            {profile?.logo_url ? (
              <img alt={`Logo ${profile.ragione_sociale || "negozio"}`} src={profile.logo_url} />
            ) : (
              <span>{(profile?.ragione_sociale || "U").slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <div>
            <span className="ub-store-eyebrow">Profilo operativo</span>
            <h2>Gestisci la presenza del tuo negozio.</h2>
            <p>Aggiorna contatti, sede, referente e logo. Ragione sociale e partita IVA restano protette e possono essere modificate solo dal team Underbeach.</p>
          </div>
        </section>

        <section className="ub-store-summary">
          <article><span>Stato</span><strong>Operativo</strong><small>Account verificato</small></article>
          <article><span>Clienti</span><strong>{customers.length}</strong><small>Acquisiti dal QR personale</small></article>
          <article><span>Prodotti</span><strong>{products.length}</strong><small>{products.filter((product) => product.pubblicato).length} pubblicati</small></article>
        </section>

        {editingProfile ? (
          <form className="ub-store-profile-form" onSubmit={handleProfileSave}>
            <div className="ub-store-profile-form__header">
              <div>
                <span className="ub-store-eyebrow">Impostazioni profilo</span>
                <h2>Dati del negozio</h2>
              </div>
              <small>I campi contrassegnati come protetti non sono modificabili.</small>
            </div>

            <div className="ub-store-form-grid">
              <label className="ub-store-field--locked">
                Ragione sociale
                <input disabled value={profile?.ragione_sociale || ""} />
                <small>Campo protetto</small>
              </label>
              <label className="ub-store-field--locked">
                Partita IVA
                <input disabled value={profile?.partita_iva || ""} />
                <small>Campo protetto</small>
              </label>
              <label>
                Indirizzo
                <input defaultValue={profile?.indirizzo || ""} name="indirizzo" />
              </label>
              <label>
                CAP
                <input defaultValue={profile?.cap || ""} inputMode="numeric" maxLength={5} name="cap" />
              </label>
              <label>
                Citta
                <input defaultValue={profile?.citta || ""} name="citta" />
              </label>
              <label>
                Provincia
                <input defaultValue={profile?.provincia || ""} name="provincia" />
              </label>
              <label>
                Telefono negozio
                <input defaultValue={profile?.telefono_negozio || ""} inputMode="tel" name="telefono_negozio" />
              </label>
              <label>
                Email di accesso e contatto
                <input defaultValue={profile?.email || session.user.email || ""} name="email" required type="email" />
              </label>
              <label>
                Nome referente
                <input defaultValue={profile?.referente_nome || ""} name="referente_nome" />
              </label>
              <label>
                Cognome referente
                <input defaultValue={profile?.referente_cognome || ""} name="referente_cognome" />
              </label>
              <label>
                Cellulare referente
                <input defaultValue={profile?.referente_cellulare || ""} inputMode="tel" name="referente_cellulare" />
              </label>
              <label>
                Sito internet
                <input defaultValue={profile?.sito_internet || ""} name="sito_internet" placeholder="https://" />
              </label>
              <label>
                Profilo social
                <input defaultValue={profile?.social || ""} name="social" placeholder="https://" />
              </label>
              <label className="ub-store-logo-field">
                Nuovo logo
                <input accept="image/png,image/jpeg,image/webp" name="logo" type="file" />
                <small>PNG, JPG o WEBP. Massimo 5 MB.</small>
              </label>
            </div>

            <div className="ub-store-form-actions">
              <button
                className="ub-store-secondary-button"
                disabled={submitting}
                onClick={() => setEditingProfile(false)}
                type="button"
              >
                Annulla
              </button>
              <button className="ub-store-button" disabled={submitting} type="submit">
                {submitting ? "Salvataggio..." : "Salva modifiche"}
              </button>
            </div>
          </form>
        ) : (
          <section className="ub-store-profile">
            <div><span>Ragione sociale</span><strong>{profile?.ragione_sociale || "Non disponibile"}</strong><small>Dato protetto</small></div>
            <div><span>Partita IVA</span><strong>{profile?.partita_iva || "Non disponibile"}</strong><small>Dato protetto</small></div>
            <div><span>Email</span><strong>{profile?.email || session.user.email}</strong></div>
            <div><span>Telefono</span><strong>{profile?.telefono_negozio || "Non indicato"}</strong></div>
            <div><span>Referente</span><strong>{[profile?.referente_nome, profile?.referente_cognome].filter(Boolean).join(" ") || "Non indicato"}</strong></div>
            <div><span>Cellulare referente</span><strong>{profile?.referente_cellulare || "Non indicato"}</strong></div>
            <div><span>Sede</span><strong>{[profile?.indirizzo, profile?.cap, profile?.citta, profile?.provincia].filter(Boolean).join(", ") || "Non indicata"}</strong></div>
            <div><span>Sito internet</span><strong>{profile?.sito_internet || "Non indicato"}</strong></div>
            <div><span>Social</span><strong>{profile?.social || "Non indicato"}</strong></div>
          </section>
        )}
        </>}

        {activeView === "qr" && profile && <QrPanel profile={profile} />}
        {activeView === "customers" && (
          <CustomersPanel available={crmAvailable} customers={customers} loading={customersLoading} onRefresh={loadCustomers} />
        )}
        {activeView === "communications" && (
          <CommunicationsPanel
            available={communicationsAvailable}
            automations={automations}
            customers={customers}
            history={communications}
            loading={communicationsLoading}
            onRefresh={loadCommunications}
            onSend={handleCommunicationSend}
            onAutomationCreate={handleAutomationCreate}
            onAutomationDelete={handleAutomationDelete}
            onAutomationToggle={handleAutomationToggle}
            profile={profile!}
          />
        )}
        {activeView === "products" && (
          <ProductsPanel
            available={productsAvailable}
            loading={productsLoading}
            onDelete={handleProductDelete}
            onRefresh={loadProducts}
            onSave={handleProductSave}
            products={products}
          />
        )}
      </section>
    </main>
  );
}
