# Dove portare Lele a bere

Una guida pratica alle cantine entro **un'ora di auto da Forlì**.

55 aziende tra Predappio, Bertinoro, Modigliana, Castrocaro, Brisighella, Faenza,
Castel Bolognese, Imola, Cesena, la valle del Bidente e quella del Savio. Per ognuna:
voto Google, costo della degustazione dove è pubblico, contatti, posizione sulla mappa
e i cinque alloggi Booking più vicini con punteggio sopra 8.

## Avvio locale

```bash
node scripts/serve.mjs
# http://localhost:8787
```

Sito statico: niente build, niente dipendenze da installare, nessuna API key.
L'unica libreria esterna è Leaflet, caricata da CDN.

## Aggiungere una cantina

1. Aggiungi un oggetto a `data/cantine.json` (schema in [CLAUDE.md](CLAUDE.md))
2. `node scripts/enrich-distanze.mjs` per calcolare km e minuti reali da Forlì
3. Ricarica la pagina — filtri, tendine e mappa si aggiornano da soli

## Da dove vengono i dati

Voti e coordinate dalle schede Google Maps; prezzi delle degustazioni dai siti delle
aziende e dalle piattaforme di prenotazione; alloggi da Booking; tempi di percorrenza
calcolati su strada con [OSRM](http://project-osrm.org/).

Dove un dato non è pubblicato, il campo resta vuoto e la scheda lo dichiara:
nessun numero è stimato o inventato. Fotografia di settembre 2026 — prima di partire,
chiama sempre.

## Cosa manca

Vedi [TODO.md](TODO.md). In sintesi: partenza da un luogo qualsiasi, filtri per prezzo
e orari, costruzione di itinerari e completamento dei prezzi delle degustazioni.
