"use client";

import { getSupabaseClient } from "@/lib/supabase";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type StoreDetail = {
  id: string | number;
  ragione_sociale: string | null;
  indirizzo: string | null;
  cap: string | null;
  citta: string | null;
  provincia: string | null;
  telefono_negozio: string | null;
  partita_iva: string | null;
  referente_nome: string | null;
  referente_cognome: string | null;
  referente_cellulare: string | null;
  email: string | null;
  sito_internet: string | null;
  social: string | null;
  logo_url: string | null;
  created_at: string | null;
  privacy_accettata?: boolean | null;
  privacy_accettata_at?: string | null;
  attivo?: boolean | null;
  attivato_at?: string | null;
};

const DETAIL_SELECT =
  "id, ragione_sociale, indirizzo, cap, citta, provincia, telefono_negozio, partita_iva, referente_nome, referente_cognome, referente_cellulare, email, sito_internet, social, logo_url, created_at, privacy_accettata, privacy_accettata_at, attivo, attivato_at";

const FALLBACK_SELECT =
  "id, ragione_sociale, indirizzo, cap, citta, provincia, telefono_negozio, partita_iva, referente_nome, referente_cognome, referente_cellulare, email, sito_internet, social, logo_url, created_at, privacy_accettata, privacy_accettata_at";

function isMissingActivationColumn(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("attivo") || normalized.includes("attivato_at");
}

function displayValue(value: string | number | boolean | null | undefined) {
  if (value === true) return "Si";
  if (value === false) return "No";
  if (value === null || value === undefined || value === "") return "Non indicato";
  return String(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Non indicato";

  return new Intl.DateTimeFormat("it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function externalHref(value: string | null | undefined) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function DetailItem({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number | boolean | null | undefined;
  href?: string | null;
}) {
  return (
    <div className="ub-dashboard-detail-item">
      <span>{label}</span>
      {href ? (
        <a href={href} rel="noreferrer" target="_blank">
          {displayValue(value)}
        </a>
      ) : (
        <strong>{displayValue(value)}</strong>
      )}
    </div>
  );
}

export default function StoreDetailPage() {
  const params = useParams<{ id: string }>();
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadStore() {
      if (!supabase) {
        setLoading(false);
        setError("Configurazione Supabase mancante.");
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      if (!mounted) return;

      if (!sessionData.session) {
        setHasSession(false);
        setLoading(false);
        return;
      }

      setHasSession(true);
      setLoading(true);
      setError(null);

      const { data, error: detailError } = await supabase
        .from("negozi")
        .select(DETAIL_SELECT)
        .eq("id", params.id)
        .single();

      if (!mounted) return;

      if (detailError) {
        if (isMissingActivationColumn(detailError.message)) {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("negozi")
            .select(FALLBACK_SELECT)
            .eq("id", params.id)
            .single();

          if (!mounted) return;

          if (fallbackError) {
            setError(fallbackError.message);
            setStore(null);
          } else {
            setStore(fallbackData as StoreDetail);
          }
        } else {
          setError(detailError.message);
          setStore(null);
        }
      } else {
        setStore(data as StoreDetail);
      }

      setLoading(false);
    }

    loadStore();

    return () => {
      mounted = false;
    };
  }, [params.id, supabase]);

  const referente = store
    ? [store.referente_nome, store.referente_cognome].filter(Boolean).join(" ")
    : "";
  const websiteHref = externalHref(store?.sito_internet);
  const socialHref = externalHref(store?.social);
  const phoneHref = store?.telefono_negozio ? `tel:${store.telefono_negozio}` : null;
  const mobileHref = store?.referente_cellulare
    ? `tel:${store.referente_cellulare}`
    : null;

  async function copyToClipboard(label: string, value: string | null | undefined) {
    if (!value) return;

    await navigator.clipboard.writeText(value);
    setCopiedLabel(label);
    window.setTimeout(() => setCopiedLabel(null), 1600);
  }

  if (loading) {
    return (
      <main className="ub-dashboard ub-dashboard--detail-page">
        <section className="ub-dashboard-login">
          <p>Underbeach operator</p>
          <h1>Caricamento scheda</h1>
          <span>Recupero informazioni negozio in corso...</span>
        </section>
      </main>
    );
  }

  if (!supabase) {
    return (
      <main className="ub-dashboard ub-dashboard--detail-page">
        <section className="ub-dashboard-login">
          <p>Underbeach operator</p>
          <h1>Configurazione mancante</h1>
          <span>Imposta le variabili Supabase su Vercel per usare la scheda negozio.</span>
          <Link className="ub-dashboard-action ub-dashboard-link-action" href="/dashboard">
            Torna alla dashboard
          </Link>
        </section>
      </main>
    );
  }

  if (!hasSession) {
    return (
      <main className="ub-dashboard ub-dashboard--detail-page">
        <section className="ub-dashboard-login">
          <p>Underbeach operator</p>
          <h1>Accesso richiesto</h1>
          <span>Accedi alla dashboard prima di consultare la scheda negozio.</span>
          <Link className="ub-dashboard-action ub-dashboard-link-action" href="/dashboard">
            Vai al login
          </Link>
        </section>
      </main>
    );
  }

  if (error || !store) {
    return (
      <main className="ub-dashboard ub-dashboard--detail-page">
        <section className="ub-dashboard-login">
          <p>Scheda negozio</p>
          <h1>Non trovato</h1>
          <span>{error || "Il negozio richiesto non e' disponibile."}</span>
          <Link className="ub-dashboard-action ub-dashboard-link-action" href="/dashboard">
            Torna alla dashboard
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="ub-dashboard ub-dashboard--detail-page">
      <section className="ub-dashboard__shell ub-dashboard-detail">
        <header className="ub-dashboard__topbar ub-dashboard-detail__topbar">
          <div>
            <span className="ub-dashboard__kicker">Scheda negozio</span>
            <h1>{store.ragione_sociale || "Negozio senza nome"}</h1>
          </div>
          <div className="ub-dashboard__account">
            <span
              className={
                store.attivo
                  ? "ub-dashboard-status ub-dashboard-status--active"
                  : "ub-dashboard-status"
              }
            >
              {store.attivo ? "Attivo" : "Da attivare"}
            </span>
            <Link
              className="ub-dashboard__refresh ub-dashboard__refresh--ghost"
              href="/dashboard"
            >
              Torna
            </Link>
          </div>
        </header>

        <section className="ub-dashboard-detail__hero">
          <div className="ub-dashboard-detail__logo">
            {store.logo_url ? (
              <img alt={`Logo ${store.ragione_sociale || "negozio"}`} src={store.logo_url} />
            ) : (
              <span>{(store.ragione_sociale || "U").slice(0, 1).toUpperCase()}</span>
            )}
          </div>

          <div>
            <span>Profilo commerciale</span>
            <h2>{store.ragione_sociale || "Senza nome"}</h2>
            <p>
              {[store.indirizzo, store.cap, store.citta, store.provincia]
                .filter(Boolean)
                .join(", ") || "Indirizzo non indicato"}
            </p>

            <div className="ub-dashboard-detail__actions" aria-label="Azioni rapide">
              {phoneHref && (
                <a className="ub-dashboard-detail-action" href={phoneHref}>
                  Chiama negozio
                </a>
              )}
              {mobileHref && (
                <a className="ub-dashboard-detail-action" href={mobileHref}>
                  Chiama referente
                </a>
              )}
              {websiteHref && (
                <a
                  className="ub-dashboard-detail-action"
                  href={websiteHref}
                  rel="noreferrer"
                  target="_blank"
                >
                  Apri sito
                </a>
              )}
              <button
                className="ub-dashboard-detail-action ub-dashboard-detail-action--ghost"
                disabled={!store.partita_iva}
                onClick={() => copyToClipboard("P.IVA", store.partita_iva)}
                type="button"
              >
                Copia P.IVA
              </button>
              <button
                className="ub-dashboard-detail-action ub-dashboard-detail-action--ghost"
                disabled={!store.referente_cellulare}
                onClick={() =>
                  copyToClipboard("cellulare", store.referente_cellulare)
                }
                type="button"
              >
                Copia contatto
              </button>
            </div>

            {copiedLabel && (
              <strong className="ub-dashboard-detail__copy-status">
                {copiedLabel} copiato
              </strong>
            )}
          </div>
        </section>

        <section className="ub-dashboard-detail__grid" aria-label="Dettaglio negozio">
          <div className="ub-dashboard-detail-panel">
            <div className="ub-dashboard-detail-panel__header">
              <span>Anagrafica</span>
              <h2>Dati negozio</h2>
            </div>
            <DetailItem label="Ragione sociale" value={store.ragione_sociale} />
            <DetailItem label="Partita IVA" value={store.partita_iva} />
            <DetailItem label="Indirizzo" value={store.indirizzo} />
            <DetailItem label="CAP" value={store.cap} />
            <DetailItem label="Citta" value={store.citta} />
            <DetailItem label="Provincia" value={store.provincia} />
          </div>

          <div className="ub-dashboard-detail-panel">
            <div className="ub-dashboard-detail-panel__header">
              <span>Contatti</span>
              <h2>Referente</h2>
            </div>
            <DetailItem label="Nome referente" value={referente} />
            <DetailItem label="Telefono negozio" value={store.telefono_negozio} />
            <DetailItem label="Cellulare referente" value={store.referente_cellulare} />
            <DetailItem
              label="Email referente"
              value={store.email}
              href={store.email ? `mailto:${store.email}` : null}
            />
            <DetailItem label="Sito internet" value={store.sito_internet} href={websiteHref} />
            <DetailItem label="Social" value={store.social} href={socialHref} />
          </div>

          <div className="ub-dashboard-detail-panel">
            <div className="ub-dashboard-detail-panel__header">
              <span>Operativita</span>
              <h2>Stato lead</h2>
            </div>
            <DetailItem label="ID" value={store.id} />
            <DetailItem label="Registrato il" value={formatDate(store.created_at)} />
            <DetailItem label="Attivo" value={store.attivo} />
            <DetailItem label="Attivato il" value={formatDate(store.attivato_at)} />
            <DetailItem label="Privacy accettata" value={store.privacy_accettata} />
            <DetailItem
              label="Consenso privacy il"
              value={formatDate(store.privacy_accettata_at)}
            />
            <DetailItem label="Logo URL" value={store.logo_url} href={store.logo_url} />
          </div>
        </section>
      </section>
    </main>
  );
}
