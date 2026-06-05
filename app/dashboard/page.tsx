"use client";

import { getSupabaseClient } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type StoreLead = {
  id: string | number;
  ragione_sociale: string | null;
  citta: string | null;
  provincia: string | null;
  telefono_negozio: string | null;
  partita_iva: string | null;
  referente_nome: string | null;
  referente_cognome: string | null;
  referente_cellulare: string | null;
  sito_internet: string | null;
  social: string | null;
  logo_url: string | null;
  created_at: string | null;
  attivo?: boolean | null;
  attivato_at?: string | null;
};

type StatusFilter = "all" | "pending" | "active";

const BASE_SELECT =
  "id, ragione_sociale, citta, provincia, telefono_negozio, partita_iva, referente_nome, referente_cognome, referente_cellulare, sito_internet, social, logo_url, created_at";

const ACTIVATION_SELECT = `${BASE_SELECT}, attivo, attivato_at`;

function isMissingActivationColumn(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("attivo") || normalized.includes("attivato_at");
}

export default function DashboardPage() {
  const supabase = useMemo(() => getSupabaseClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [leads, setLeads] = useState<StoreLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [activationAvailable, setActivationAvailable] = useState(true);
  const activationAvailableRef = useRef(true);
  const loadingRef = useRef(false);

  function setActivationMode(nextAvailable: boolean) {
    activationAvailableRef.current = nextAvailable;
    setActivationAvailable((current) =>
      current === nextAvailable ? current : nextAvailable
    );
  }

  const loadLeads = useCallback(async () => {
    if (!supabase) return;
    if (loadingRef.current) return;

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setLeads([]);
      setLoading(false);
      return;
    }

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    const shouldReadActivation = activationAvailableRef.current;
    const { data, error: loadError } = await supabase
      .from("negozi")
      .select(shouldReadActivation ? ACTIVATION_SELECT : BASE_SELECT)
      .order("created_at", { ascending: false });

    if (loadError) {
      if (shouldReadActivation && isMissingActivationColumn(loadError.message)) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("negozi")
          .select(BASE_SELECT)
          .order("created_at", { ascending: false });

        setActivationMode(false);

        if (fallbackError) {
          setError(fallbackError.message);
          setLeads([]);
        } else {
          setLeads((fallbackData ?? []) as unknown as StoreLead[]);
        }
      } else {
        setError(loadError.message);
        setLeads([]);
      }
    } else {
      setActivationMode(shouldReadActivation);
      setLeads((data ?? []) as unknown as StoreLead[]);
    }

    loadingRef.current = false;
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
      if (data.session) {
        loadLeads();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
      if (nextSession) {
        loadLeads();
      } else {
        setLeads([]);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadLeads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const isActive = Boolean(lead.attivo);
      const matchesStatus =
        status === "all" ||
        (status === "active" && isActive) ||
        (status === "pending" && !isActive);
      const searchable = [
        lead.ragione_sociale,
        lead.citta,
        lead.provincia,
        lead.referente_nome,
        lead.referente_cognome,
        lead.partita_iva,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesStatus && searchable.includes(query.trim().toLowerCase());
    });
  }, [leads, query, status]);

  const activeCount = leads.filter((lead) => lead.attivo).length;
  const pendingCount = leads.length - activeCount;
  const todayCount = leads.filter((lead) => {
    if (!lead.created_at) return false;
    return new Date(lead.created_at).toDateString() === new Date().toDateString();
  }).length;

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setAuthError(null);
    setAuthLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setAuthError(loginError.message);
      setAuthLoading(false);
    }
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  async function setStoreActive(lead: StoreLead, nextActive: boolean) {
    if (!supabase) {
      setError("Configurazione Supabase mancante.");
      return;
    }

    if (!activationAvailable) {
      setError("La tabella attuale non espone i campi di attivazione.");
      return;
    }

    setUpdatingId(lead.id);
    setError(null);

    const { error: updateError } = await supabase
      .from("negozi")
      .update({
        attivo: nextActive,
        attivato_at: nextActive ? new Date().toISOString() : null,
      })
      .eq("id", lead.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setLeads((current) =>
        current.map((item) =>
          item.id === lead.id
            ? {
                ...item,
                attivo: nextActive,
                attivato_at: nextActive ? new Date().toISOString() : null,
              }
            : item
        )
      );
    }

    setUpdatingId(null);
  }

  if (authLoading && !session) {
    return (
      <main className="ub-dashboard ub-dashboard--auth">
        <section className="ub-dashboard-login">
          <p>Underbeach operator</p>
          <h1>Accesso dashboard</h1>
          <span>Verifica sessione in corso...</span>
        </section>
      </main>
    );
  }

  if (!supabase) {
    return (
      <main className="ub-dashboard ub-dashboard--auth">
        <section className="ub-dashboard-login">
          <p>Underbeach operator</p>
          <h1>Configurazione mancante</h1>
          <span>Imposta le variabili Supabase su Vercel per usare la dashboard.</span>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="ub-dashboard ub-dashboard--auth">
        <form className="ub-dashboard-login" onSubmit={handleLogin}>
          <p>Underbeach operator</p>
          <h1>Accesso dashboard</h1>
          <span>Accedi con l'utente abilitato alla lettura e attivazione negozi.</span>

          <label>
            Email
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label>
            Password
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {authError && <strong className="ub-dashboard__error">{authError}</strong>}

          <button className="ub-dashboard-action" disabled={authLoading} type="submit">
            {authLoading ? "Accesso..." : "Entra"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="ub-dashboard" aria-label="Underbeach dashboard">
      <aside className="ub-dashboard__sidebar" aria-label="Dashboard sidebar">
        <div className="ub-dashboard__rail">
          <span className="ub-dashboard-icon ub-dashboard-icon--active" />
          <span className="ub-dashboard-icon" />
          <span className="ub-dashboard-icon" />
          <span className="ub-dashboard-icon" />
        </div>

        <div className="ub-dashboard__nav">
          <div className="ub-dashboard__mark" />
          <nav>
            <span>Overview</span>
            <span>Negozi</span>
            <span>Attivazioni</span>
            <span>Export</span>
          </nav>
        </div>
      </aside>

      <section className="ub-dashboard__shell">
        <header className="ub-dashboard__topbar">
          <div>
            <span className="ub-dashboard__kicker">Maredamare</span>
            <h1>{activationAvailable ? "Attivazione negozi" : "Negozi registrati"}</h1>
          </div>
          <div className="ub-dashboard__account">
            <small>{session.user.email}</small>
            <button className="ub-dashboard__refresh" onClick={loadLeads} type="button">
              Aggiorna
            </button>
            <button
              className="ub-dashboard__refresh ub-dashboard__refresh--ghost"
              onClick={handleLogout}
              type="button"
            >
              Esci
            </button>
          </div>
        </header>

        <section className="ub-dashboard__stats" aria-label="Statistiche negozi">
          <article className="ub-dashboard-card">
            <strong>{leads.length}</strong>
            <span>Lead totali</span>
          </article>
          {activationAvailable ? (
            <>
              <article className="ub-dashboard-card">
                <strong>{activeCount}</strong>
                <span>Negozi attivi</span>
              </article>
              <article className="ub-dashboard-card">
                <strong>{pendingCount}</strong>
                <span>Da attivare</span>
              </article>
            </>
          ) : (
            <>
              <article className="ub-dashboard-card">
                <strong>{filteredLeads.length}</strong>
                <span>Risultati visibili</span>
              </article>
              <article className="ub-dashboard-card">
                <strong>CRM</strong>
                <span>Solo lettura</span>
              </article>
            </>
          )}
          <article className="ub-dashboard-card">
            <strong>{todayCount}</strong>
            <span>Nuovi oggi</span>
          </article>
        </section>

        <section className="ub-dashboard__table-panel" aria-label="Tabella negozi">
          <div className="ub-dashboard__tools">
            <input
              className="ub-dashboard__search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cerca negozio, referente, partita IVA..."
              value={query}
            />

            {activationAvailable && (
              <select
                className="ub-dashboard__filter"
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
                value={status}
              >
                <option value="all">Tutti</option>
                <option value="pending">Da attivare</option>
                <option value="active">Attivi</option>
              </select>
            )}
          </div>

          {error && <p className="ub-dashboard__error">{error}</p>}

          <div
            className={
              activationAvailable
                ? "ub-dashboard-table"
                : "ub-dashboard-table ub-dashboard-table--readonly"
            }
          >
            <div className="ub-dashboard-table__head">
              <span>Negozio</span>
              <span>Referente</span>
              <span>Contatti</span>
              {activationAvailable && (
                <>
                  <span>Stato</span>
                  <span>Azione</span>
                </>
              )}
            </div>

            {loading && <p className="ub-dashboard__empty">Caricamento negozi...</p>}

            {!loading && filteredLeads.length === 0 && (
              <p className="ub-dashboard__empty">Nessun negozio trovato.</p>
            )}

            {!loading &&
              filteredLeads.map((lead) => {
                const isActive = Boolean(lead.attivo);
                const referente = [lead.referente_nome, lead.referente_cognome]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <div className="ub-dashboard-table__row" key={lead.id}>
                    <span>
                      <strong>{lead.ragione_sociale || "Senza nome"}</strong>
                      <small>
                        {[lead.citta, lead.provincia].filter(Boolean).join(" - ") ||
                          "Località non indicata"}
                      </small>
                    </span>

                    <span>
                      <strong>{referente || "Non indicato"}</strong>
                      <small>{lead.partita_iva || "P.IVA non indicata"}</small>
                    </span>

                    <span>
                      <strong>{lead.telefono_negozio || "Telefono assente"}</strong>
                      <small>{lead.referente_cellulare || "Cellulare assente"}</small>
                    </span>

                    {activationAvailable && (
                      <>
                        <span>
                          <mark
                            className={
                              isActive
                                ? "ub-dashboard-status ub-dashboard-status--active"
                                : "ub-dashboard-status"
                            }
                          >
                            {isActive ? "Attivo" : "Da attivare"}
                          </mark>
                        </span>

                        <span>
                          <button
                            className={
                              isActive
                                ? "ub-dashboard-action ub-dashboard-action--ghost"
                                : "ub-dashboard-action"
                            }
                            disabled={updatingId === lead.id}
                            onClick={() => setStoreActive(lead, !isActive)}
                            type="button"
                          >
                            {updatingId === lead.id
                              ? "Salvataggio"
                              : isActive
                                ? "Disattiva"
                                : "Attiva"}
                          </button>
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
          </div>
        </section>
      </section>
    </main>
  );
}
