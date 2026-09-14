/**
 * Calcola distanza e tempo di guida reali da Forlì a ogni cantina
 * usando il servizio pubblico OSRM (open source, nessuna API key).
 *
 *   node scripts/enrich-distanze.mjs
 *
 * Scrive i campi `km_auto` e `min_auto` dentro data/cantine.json.
 * Da rilanciare solo quando si aggiungono o si spostano cantine.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGINE = { nome: 'Forlì, Piazza Saffi', lat: 44.22266, lng: 12.04068 };
const OSRM = 'https://router.project-osrm.org';

const cantine = JSON.parse(await readFile(join(ROOT, 'data/cantine.json'), 'utf8'));

// OSRM /table accetta molte destinazioni in una sola chiamata: le mandiamo a blocchi
// per restare comodamente sotto i limiti del server demo pubblico.
const BLOCCO = 25;
const risultati = [];

for (let i = 0; i < cantine.length; i += BLOCCO) {
  const blocco = cantine.slice(i, i + BLOCCO);
  const coords = [ORIGINE, ...blocco].map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `${OSRM}/table/v1/driving/${coords}?sources=0&annotations=duration,distance`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OSRM ha risposto ${res.status} per il blocco ${i}`);
  const dati = await res.json();
  if (dati.code !== 'Ok') throw new Error(`OSRM: ${dati.code} ${dati.message ?? ''}`);

  // L'indice 0 è l'origine stessa, le destinazioni partono da 1.
  blocco.forEach((cantina, j) => {
    const secondi = dati.durations[0][j + 1];
    const metri = dati.distances[0][j + 1];
    risultati.push({
      id: cantina.id,
      min_auto: secondi == null ? null : Math.round(secondi / 60),
      km_auto: metri == null ? null : Math.round(metri / 100) / 10,
    });
  });

  console.log(`blocco ${i / BLOCCO + 1}: ${blocco.length} cantine`);
}

const perId = new Map(risultati.map((r) => [r.id, r]));
for (const cantina of cantine) {
  const r = perId.get(cantina.id);
  cantina.km_auto = r?.km_auto ?? null;
  cantina.min_auto = r?.min_auto ?? null;
}

cantine.sort((a, b) => (a.min_auto ?? 9999) - (b.min_auto ?? 9999));

await writeFile(
  join(ROOT, 'data/cantine.json'),
  JSON.stringify(cantine, null, 1).replace(/\n\s+(?=[\d"\]])/g, (m) => m) + '\n',
  'utf8'
);

const fuori = cantine.filter((c) => (c.min_auto ?? 0) > 60);
console.log(`\nAggiornate ${cantine.length} cantine.`);
console.log(`Oltre i 60 minuti: ${fuori.length ? fuori.map((c) => `${c.nome} (${c.min_auto}′)`).join(', ') : 'nessuna'}`);
