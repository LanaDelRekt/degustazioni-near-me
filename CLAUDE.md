# CLAUDE.md

Contesto per chi lavora su questo repo (persone o agenti).

## Cos'è

**Dove portare Lele a bere: una guida pratica** — sito statico che elenca le cantine
entro **un'ora di auto da Forlì**, con voto Google, costo della degustazione, contatti,
posizione su mappa e i cinque alloggi Booking più vicini.

Sito pubblico, pensato per GitHub Pages. Nessuna build, nessun framework, nessuna API key.

## Struttura

```
index.html              markup e testo della pagina
assets/styles.css       stile, temi chiaro/scuro via prefers-color-scheme
assets/app.js           caricamento dati, filtri, mappa, rendering schede
data/cantine.json       il dataset principale
data/alloggi.json       strutture Booking con voto > 8
scripts/enrich-distanze.mjs  ricalcola km/minuti reali da Forlì (OSRM)
scripts/serve.mjs       server statico per lo sviluppo locale
```

## Come si lavora

```bash
node scripts/serve.mjs          # http://localhost:8787
node scripts/enrich-distanze.mjs # dopo aver aggiunto o spostato cantine
```

`enrich-distanze.mjs` riscrive `data/cantine.json` aggiungendo `km_auto`/`min_auto` e
riordinando per distanza. Usa il server pubblico OSRM: gratis, senza chiave, ma non
va martellato — lanciarlo solo quando i dati cambiano davvero.

## Schema dati — `data/cantine.json`

Un array di oggetti. Campi obbligatori in **grassetto**.

| campo | tipo | note |
|---|---|---|
| **id** | string | slug stabile, usato negli id DOM e come chiave |
| **nome** | string | come compare su Google Maps |
| **comune**, **provincia** | string | provincia a due lettere |
| **zona** | string | raggruppamento usato dal filtro (Predappio, Bertinoro, Faenza…) |
| **lat**, **lng** | number | coordinate esatte dalla scheda Google Maps |
| google_rating | number\|null | 0–5. `null` = l'azienda non ha una scheda Google: la card mostra "nessuna scheda Google" invece di stelle finte |
| google_recensioni | number\|null | |
| sito, telefono, email | string\|null | `null` se non esiste, mai stringa vuota. Se manca il telefono, il pulsante Email prende il posto della primaria |
| indirizzo | string | via e civico, senza comune |
| vitigni | string[] | **indicativi**, alimentano il filtro "cosa vuoi bere" |
| tipologie | string[] | rosso, bianco, rosato, spumante, passito, macerato, vermouth, sfuso |
| bio | boolean | |
| costo_degustazione | number\|null | euro a persona, formula più economica |
| costo_degustazione_max | number | opzionale, se esiste una forbice |
| vini_catalogo | number\|null | solo se verificabile sul sito dell'azienda |
| su_prenotazione | boolean | `false` = si entra senza appuntamento |
| **consigliata** | boolean | scelta personale di Daniele: stella ★, bordo oro e filtro dedicato in cima al pannello. Non è un punteggio e non ha nulla a che vedere col voto Google |
| descrizione | string | 1–2 frasi, concrete, niente marketing |
| km_auto, min_auto | number | **generati** da `enrich-distanze.mjs`, non scrivere a mano |

## Schema dati — `data/alloggi.json`

`nome`, `comune`, `voto` (scala Booking 0–10, mai sotto 8), `recensioni`, `lat`, `lng`, `slug`.

Lo `slug` è l'ultimo segmento dell'URL Booking: da
`booking.com/hotel/it/`**`panorama-bertinoro`**`.it.html`.
L'app costruisce il link da lì, non memorizzare URL interi.

Gli alloggi **non** sono legati a una cantina specifica: `app.js` calcola a runtime i più
vicini in linea d'aria. Quanti ne mostra lo decide la costante `ALLOGGI_PER_CANTINA`
in cima a `app.js` — cambiarla è l'unica modifica necessaria. Aggiungere una struttura
al file la rende disponibile a tutte le cantine vicine, senza toccare altro.

La soglia "voto sopra 8" è una promessa fatta in pagina: ogni struttura che entra nel
file deve rispettarla. Le ricerche Booking si fanno con `&nflt=review_score%3D80`.

## Principi da rispettare

1. **Niente dati inventati.** Se un prezzo o un numero di etichette non è pubblicato,
   il campo resta `null` e la scheda mostra "da chiedere" / "n/d". Meglio un buco
   dichiarato di un numero plausibile ma falso.
2. **Distanze reali.** `min_auto` è tempo su strada, non linea d'aria. Se un giorno
   servirà un'altra origine, va ricalcolato, non stimato.
3. **I dati stanno in `data/`.** `app.js` non deve contenere elenchi di cantine, alloggi,
   zone o vitigni: le tendine si popolano da sole leggendo il JSON.
4. **Zero dipendenze di build.** Solo Leaflet da CDN. Il sito deve funzionare aprendo
   `index.html` da un server statico qualsiasi.
5. **Italiano** in interfaccia, commenti, nomi dei campi e messaggi di commit.
6. **Temi.** Ogni colore nuovo va definito come token su `:root` e ridefinito nel blocco
   `prefers-color-scheme: dark`. Mai un colore che esista solo in un tema.
7. **Mobile prima di tutto.** Il sito si usa in macchina o in piedi in cantina. Breakpoint
   a 760px (due colonne di filtri), 420px (una colonna) e 360px (dati impilati). I link
   d'azione restano sopra i 44px di altezza. Su touch la mappa parte con il drag disattivato
   e un velo "Tocca per usare la mappa": senza, si mangia lo scroll verticale della pagina.
   Verifica le modifiche a 390, 360 e 320px prima di pubblicare.

## Provenienza dei dati

- Voti, recensioni, coordinate, telefoni, siti: schede Google Maps, lette a settembre 2026.
- Prezzi delle degustazioni: siti delle aziende e piattaforme di prenotazione (Winedering,
  pagine "visite" ufficiali). Coperti circa 8 casi su 55.
- Alloggi: ricerche Booking per località con filtro punteggio ≥ 8.
- Tempi di percorrenza: OSRM, profilo `driving`, origine Piazza Saffi a Forlì.
