import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const isDryRun = process.argv.includes("--dry-run");

const demoStores = [
  {
    ragione_sociale: "Riviera Swim Lab",
    indirizzo: "Viale Regina Elena 42",
    cap: "47921",
    citta: "Rimini",
    provincia: "RN",
    telefono_negozio: "0541182044",
    partita_iva: "04123890401",
    referente_nome: "Giulia",
    referente_cognome: "Marini",
    referente_cellulare: "3491182044",
    sito_internet: "rivieraswimlab.it",
    social: "instagram.com/rivieraswimlab",
    logo_url: null,
    created_at: "2026-06-05T08:10:00.000Z",
    attivo: true,
    attivato_at: "2026-06-05T08:45:00.000Z",
  },
  {
    ragione_sociale: "Onda Blu Beachwear",
    indirizzo: "Via Roma 18",
    cap: "47841",
    citta: "Cattolica",
    provincia: "RN",
    telefono_negozio: "0541962240",
    partita_iva: "03988260408",
    referente_nome: "Marco",
    referente_cognome: "Valentini",
    referente_cellulare: "3475521988",
    sito_internet: "ondablubeachwear.it",
    social: "instagram.com/ondablu_store",
    logo_url: null,
    created_at: "2026-06-05T08:22:00.000Z",
    attivo: false,
    attivato_at: null,
  },
  {
    ragione_sociale: "Coral Bay Store",
    indirizzo: "Via Dante 77",
    cap: "47042",
    citta: "Cesenatico",
    provincia: "FC",
    telefono_negozio: "0547671182",
    partita_iva: "04590170403",
    referente_nome: "Elena",
    referente_cognome: "Fabbri",
    referente_cellulare: "3338104412",
    sito_internet: "coralbaystore.it",
    social: "facebook.com/coralbaystore",
    logo_url: null,
    created_at: "2026-06-05T08:35:00.000Z",
    attivo: true,
    attivato_at: "2026-06-05T09:05:00.000Z",
  },
  {
    ragione_sociale: "Sale e Sole Boutique",
    indirizzo: "Piazza Matteotti 5",
    cap: "48015",
    citta: "Cervia",
    provincia: "RA",
    telefono_negozio: "0544972011",
    partita_iva: "02765070398",
    referente_nome: "Andrea",
    referente_cognome: "Ricci",
    referente_cellulare: "3389027115",
    sito_internet: "salesoleboutique.it",
    social: "instagram.com/salesoleboutique",
    logo_url: null,
    created_at: "2026-06-05T08:48:00.000Z",
    attivo: false,
    attivato_at: null,
  },
  {
    ragione_sociale: "Mediterranea Moda Mare",
    indirizzo: "Via Partenope 31",
    cap: "80121",
    citta: "Napoli",
    provincia: "NA",
    telefono_negozio: "081412908",
    partita_iva: "06641891218",
    referente_nome: "Francesca",
    referente_cognome: "Esposito",
    referente_cellulare: "3669142088",
    sito_internet: "mediterraneamodamare.it",
    social: "instagram.com/mediterraneamare",
    logo_url: null,
    created_at: "2026-06-05T09:04:00.000Z",
    attivo: false,
    attivato_at: null,
  },
  {
    ragione_sociale: "Costa Viva Concept Store",
    indirizzo: "Lungomare Trieste 94",
    cap: "84123",
    citta: "Salerno",
    provincia: "SA",
    telefono_negozio: "089225174",
    partita_iva: "05824410658",
    referente_nome: "Luca",
    referente_cognome: "De Santis",
    referente_cellulare: "3397742081",
    sito_internet: "costavivastore.it",
    social: "facebook.com/costavivaconcept",
    logo_url: null,
    created_at: "2026-06-05T09:17:00.000Z",
    attivo: true,
    attivato_at: "2026-06-05T09:42:00.000Z",
  },
  {
    ragione_sociale: "Isola Beach Atelier",
    indirizzo: "Via Vittorio Emanuele 120",
    cap: "90133",
    citta: "Palermo",
    provincia: "PA",
    telefono_negozio: "091551204",
    partita_iva: "07190350821",
    referente_nome: "Marta",
    referente_cognome: "Greco",
    referente_cellulare: "3284479012",
    sito_internet: "isolabeachatelier.it",
    social: "instagram.com/isolabeachatelier",
    logo_url: null,
    created_at: "2026-06-05T09:31:00.000Z",
    attivo: false,
    attivato_at: null,
  },
  {
    ragione_sociale: "Laguna Resort Shop",
    indirizzo: "Fondamenta Nuove 12",
    cap: "30121",
    citta: "Venezia",
    provincia: "VE",
    telefono_negozio: "041720318",
    partita_iva: "04421020270",
    referente_nome: "Paolo",
    referente_cognome: "Moretti",
    referente_cellulare: "3482207318",
    sito_internet: "lagunaresortshop.it",
    social: "instagram.com/lagunaresortshop",
    logo_url: null,
    created_at: "2026-06-05T09:46:00.000Z",
    attivo: true,
    attivato_at: "2026-06-05T10:03:00.000Z",
  },
];

function parseEnv(content) {
  return Object.fromEntries(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

function withoutActivationColumns(store) {
  const { attivo, attivato_at, ...baseStore } = store;
  return baseStore;
}

function shouldFallbackToBaseInsert(message) {
  const normalized = message.toLowerCase();
  return normalized.includes("attivo") || normalized.includes("attivato_at");
}

async function main() {
  const activeCount = demoStores.filter((store) => store.attivo).length;
  const pendingCount = demoStores.length - activeCount;

  console.log(`Demo stores ready: ${demoStores.length}`);
  console.log(`Active: ${activeCount}`);
  console.log(`Pending: ${pendingCount}`);

  if (isDryRun) {
    console.table(
      demoStores.map((store) => ({
        negozio: store.ragione_sociale,
        citta: store.citta,
        referente: `${store.referente_nome} ${store.referente_cognome}`,
        attivo: store.attivo,
      }))
    );
    return;
  }

  const envPath = resolve(".env.local");
  const env = parseEnv(await readFile(envPath, "utf8"));
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const { error } = await supabase.from("negozi").insert(demoStores);

  if (!error) {
    console.log("Inserted demo stores with activation fields.");
    return;
  }

  if (!shouldFallbackToBaseInsert(error.message)) {
    throw error;
  }

  console.log("Activation columns unavailable. Retrying base insert.");
  const { error: fallbackError } = await supabase
    .from("negozi")
    .insert(demoStores.map(withoutActivationColumns));

  if (fallbackError) {
    throw fallbackError;
  }

  console.log("Inserted demo stores without activation fields.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
