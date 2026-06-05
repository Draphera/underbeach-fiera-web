import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const activeVatNumbers = new Set([
  "04123890401",
  "04590170403",
  "05824410658",
  "04421020270",
]);

const demoVatNumbers = [
  "04123890401",
  "03988260408",
  "04590170403",
  "02765070398",
  "06641891218",
  "05824410658",
  "07190350821",
  "04421020270",
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

async function main() {
  const env = parseEnv(await readFile(resolve(".env.local"), "utf8"));
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  for (const partitaIva of demoVatNumbers) {
    const isActive = activeVatNumbers.has(partitaIva);
    const { error } = await supabase
      .from("negozi")
      .update({
        attivo: isActive,
        attivato_at: isActive ? new Date().toISOString() : null,
      })
      .eq("partita_iva", partitaIva);

    if (error) {
      throw error;
    }
  }

  console.log("Updated demo activation statuses.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
