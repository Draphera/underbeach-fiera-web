"use client";

import { useMemo, useState, type FormEvent } from "react";

export type Product = {
  id: string;
  nome: string;
  sku: string | null;
  categoria: string;
  descrizione: string | null;
  prezzo: number;
  prezzo_promozionale: number | null;
  taglie: string[];
  colori: string[];
  quantita: number;
  immagine_url: string | null;
  pubblicato: boolean;
  created_at: string;
  updated_at: string;
};

type ProductPanelProps = {
  products: Product[];
  loading: boolean;
  available: boolean;
  onRefresh: () => void;
  onSave: (form: FormData, productId?: string) => Promise<boolean>;
  onDelete: (product: Product) => Promise<boolean>;
};

const CATEGORIES = ["Beachwear", "Abbigliamento", "Underwear", "Lingerie", "Maglieria intima", "Calzetteria", "Altro"];

function formatPrice(value: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(value);
}

export function ProductsPanel({ products, loading, available, onRefresh, onSave, onDelete }: ProductPanelProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("tutte");
  const [editing, setEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "tutte" || product.categoria === category;
      const matchesQuery = !needle || [product.nome, product.sku, product.categoria, product.descrizione]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [category, products, query]);

  const publishedCount = products.filter((product) => product.pubblicato).length;
  const lowStockCount = products.filter((product) => product.quantita <= 3).length;

  if (!available) {
    return (
      <section className="ub-store-module-setup">
        <span className="ub-store-eyebrow">Configurazione richiesta</span>
        <h2>Attiva il catalogo prodotti</h2>
        <p>Esegui lo script <code>supabase/phase-2-products.sql</code> nel SQL Editor di Supabase, poi ricarica questa pagina.</p>
      </section>
    );
  }

  function openCreate() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setShowForm(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const saved = await onSave(new FormData(event.currentTarget), editing?.id);
    setSaving(false);
    if (saved) {
      setEditing(null);
      setShowForm(false);
    }
  }

  async function remove(product: Product) {
    if (!window.confirm(`Eliminare definitivamente "${product.nome}" dal catalogo?`)) return;
    setDeletingId(product.id);
    await onDelete(product);
    setDeletingId(null);
  }

  return (
    <section className="ub-store-products-panel">
      <div className="ub-store-section-heading">
        <div><span className="ub-store-eyebrow">Inventario negozio</span><h2>Catalogo prodotti</h2></div>
        <div className="ub-store-heading-actions">
          <button className="ub-store-secondary-button" onClick={onRefresh} type="button">Aggiorna</button>
          <button className="ub-store-button" onClick={openCreate} type="button">Nuovo prodotto</button>
        </div>
      </div>

      <div className="ub-store-product-stats">
        <article><span>Prodotti</span><strong>{products.length}</strong><small>Totale catalogo</small></article>
        <article><span>Pubblicati</span><strong>{publishedCount}</strong><small>Visibili nel catalogo</small></article>
        <article><span>Stock basso</span><strong>{lowStockCount}</strong><small>Tre pezzi o meno</small></article>
      </div>

      {showForm && (
        <form className="ub-store-product-form" onSubmit={submit}>
          <div className="ub-store-profile-form__header">
            <div><span className="ub-store-eyebrow">{editing ? "Modifica scheda" : "Nuovo inserimento"}</span><h2>{editing?.nome || "Aggiungi prodotto"}</h2></div>
            <button className="ub-store-secondary-button" disabled={saving} onClick={() => setShowForm(false)} type="button">Chiudi</button>
          </div>
          {editing && <input name="id" type="hidden" value={editing.id} />}
          <div className="ub-store-product-form__grid">
            <label className="ub-store-product-field--wide">Nome prodotto<input defaultValue={editing?.nome || ""} maxLength={140} name="nome" required /></label>
            <label>SKU / Codice articolo<input defaultValue={editing?.sku || ""} maxLength={80} name="sku" placeholder="Es. UB-BIK-001" /></label>
            <label>Categoria<select defaultValue={editing?.categoria || ""} name="categoria" required><option disabled value="">Seleziona</option>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Prezzo<input defaultValue={editing?.prezzo ?? ""} inputMode="decimal" min="0" name="prezzo" required step="0.01" type="number" /></label>
            <label>Prezzo promozionale<input defaultValue={editing?.prezzo_promozionale ?? ""} inputMode="decimal" min="0" name="prezzo_promozionale" step="0.01" type="number" /></label>
            <label>Quantita disponibile<input defaultValue={editing?.quantita ?? 0} min="0" name="quantita" required step="1" type="number" /></label>
            <label>Taglie<input defaultValue={editing?.taglie.join(", ") || ""} name="taglie" placeholder="XS, S, M, L" /><small>Separate da virgola</small></label>
            <label>Colori<input defaultValue={editing?.colori.join(", ") || ""} name="colori" placeholder="Nero, Bianco, Corallo" /><small>Separati da virgola</small></label>
            <label className="ub-store-product-field--wide">Descrizione<textarea defaultValue={editing?.descrizione || ""} maxLength={2000} name="descrizione" rows={5} /></label>
            <label className="ub-store-product-field--wide">Immagine prodotto<input accept="image/png,image/jpeg,image/webp" name="immagine" type="file" /><small>PNG, JPG o WEBP. Massimo 6 MB.</small></label>
            <label className="ub-store-product-toggle"><input defaultChecked={editing?.pubblicato || false} name="pubblicato" type="checkbox" value="true" /><span>Pubblica prodotto</span><small>Il prodotto sarà pronto per le future viste catalogo destinate ai clienti.</small></label>
          </div>
          <div className="ub-store-form-actions">
            <button className="ub-store-secondary-button" disabled={saving} onClick={() => setShowForm(false)} type="button">Annulla</button>
            <button className="ub-store-button" disabled={saving} type="submit">{saving ? "Salvataggio..." : editing ? "Salva modifiche" : "Crea prodotto"}</button>
          </div>
        </form>
      )}

      <div className="ub-store-product-tools">
        <input aria-label="Cerca prodotti" onChange={(event) => setQuery(event.target.value)} placeholder="Cerca nome, SKU o descrizione" value={query} />
        <select aria-label="Filtra per categoria" onChange={(event) => setCategory(event.target.value)} value={category}>
          <option value="tutte">Tutte le categorie</option>
          {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
        </select>
        <span>{filtered.length} risultati</span>
      </div>

      {loading && <div className="ub-store-product-empty">Caricamento catalogo...</div>}
      {!loading && filtered.length === 0 && <div className="ub-store-product-empty">{products.length ? "Nessun prodotto corrisponde ai filtri." : "Il catalogo e' vuoto. Inserisci il primo prodotto."}</div>}
      {!loading && filtered.length > 0 && (
        <div className="ub-store-product-grid">
          {filtered.map((product) => (
            <article className="ub-store-product-card" key={product.id}>
              <div className="ub-store-product-card__media">
                {product.immagine_url ? <img alt={product.nome} src={product.immagine_url} /> : <span>{product.nome.slice(0, 1).toUpperCase()}</span>}
                <mark className={product.pubblicato ? "is-published" : ""}>{product.pubblicato ? "Pubblicato" : "Bozza"}</mark>
              </div>
              <div className="ub-store-product-card__body">
                <div><span>{product.categoria}</span><small>{product.sku || "SKU non indicato"}</small></div>
                <h3>{product.nome}</h3>
                <p>{product.descrizione || "Nessuna descrizione."}</p>
                <div className="ub-store-product-card__price">
                  <strong>{formatPrice(product.prezzo_promozionale ?? product.prezzo)}</strong>
                  {product.prezzo_promozionale !== null && <del>{formatPrice(product.prezzo)}</del>}
                  <span className={product.quantita <= 3 ? "is-low" : ""}>{product.quantita} disponibili</span>
                </div>
                {(product.taglie.length > 0 || product.colori.length > 0) && <small className="ub-store-product-variants">{[product.taglie.join(" / "), product.colori.join(" / ")].filter(Boolean).join(" | ")}</small>}
                <div className="ub-store-product-card__actions">
                  <button className="ub-store-secondary-button" onClick={() => openEdit(product)} type="button">Modifica</button>
                  <button className="ub-store-danger-button" disabled={deletingId === product.id} onClick={() => remove(product)} type="button">{deletingId === product.id ? "Eliminazione..." : "Elimina"}</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
