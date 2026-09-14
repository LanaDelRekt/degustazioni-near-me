# TODO

Obiettivo di fondo: da elenco statico a **motore di suggerimenti**.
Io dico cosa voglio bere, da dove parto e quanto tempo ho — il sito mi dà la lista.

Ordinati per rapporto valore/fatica. Le caselle sono da spuntare man mano.

---

## 1. Partenza da un luogo qualsiasi

Oggi l'origine è fissa su Forlì e i tempi sono precalcolati. Il passo successivo è
scegliere il punto di partenza.

- [ ] Campo "Parto da" con ricerca indirizzo via Nominatim (OSM, gratuito, senza chiave)
- [ ] Pulsante "usa la mia posizione" (`navigator.geolocation`)
- [ ] Ricalcolo dei tempi lato client con OSRM `/table`, in una sola chiamata per tutte
      le cantine visibili — con cache in `sessionStorage` per non ripetere le richieste
- [ ] Fallback esplicito alla linea d'aria se OSRM non risponde, etichettato come tale
- [ ] `min_auto`/`km_auto` da Forlì restano nel JSON come valore di default offline

## 2. Filtri: completare il "scelgo cosa bere"

- [ ] Filtro per **fascia di prezzo** della degustazione (slider, non solo "prezzo noto")
- [ ] Filtro **senza appuntamento** (`su_prenotazione: false`) — per il giro improvvisato
- [ ] Filtro **aperto adesso**: serve prima il campo `orari` nel dataset
- [ ] Filtro **ci si mangia** / **ci si dorme** (agriturismo, ristorante, camere)
- [ ] Filtro **accessibile** (parcheggio, accesso disabili, dog friendly)
- [ ] Filtri combinabili sincronizzati nella URL (`?vitigno=Albana&max=30`) così un giro
      si può mandare a qualcuno per messaggio
- [ ] Chip dei filtri attivi, rimovibili uno per uno

## 3. Itinerari

Il vero salto: non una cantina, ma una giornata.

- [ ] Modalità "costruisci il giro": seleziona 2–4 cantine e ottieni percorso ordinato
- [ ] Tempo totale stimato (guida + ~1h per degustazione) e avviso se sfora la giornata
- [ ] Suggerimento automatico: "3 cantine entro 40 min, tutte con Albana, stessa zona"
- [ ] Export del giro su Google Maps con waypoint
- [ ] Un pranzo consigliato lungo il percorso (serve un `data/ristoranti.json`)

## 4. Dati da completare

- [ ] **Prezzi delle degustazioni**: coperti 8 su 54. Il resto va chiesto per telefono
      o mail — è il buco più grosso della guida
- [ ] **Vini in catalogo**: compilati solo dove il sito elenca le etichette. Valutare
      uno scraper per le pagine `/vini` più comuni
- [ ] **Vitigni**: oggi indicativi. Verificarli azienda per azienda sulle schede tecniche
- [ ] **Orari di apertura**: campo assente, serve per il filtro "aperto adesso"
- [ ] **Foto**: una immagine per cantina renderebbe le schede molto più leggibili
      (serve capire licenze — no scraping di foto Google)
- [ ] Cantine da valutare per l'inserimento: Torre San Martino (Modigliana), Mutiliana,
      Fattoria Casetto dei Mandorli, Tenuta Santa Lucia, Podere Palazzo, Zinzani
- [ ] Verificare Tenuta Amalia e Chiara Condello: pochissime recensioni Google,
      il voto non è significativo

## 5. Manutenzione

- [ ] Script `scripts/aggiorna-google.mjs` per rinfrescare voti e recensioni
      (oggi è stato fatto a mano dal browser)
- [ ] Data di ultimo aggiornamento per ogni scheda, mostrata in pagina
- [ ] Validatore dello schema JSON eseguito in CI, così un campo sbagliato non arriva online
- [ ] GitHub Action che pubblica su Pages a ogni push su `main`

## 6. Rifiniture

- [ ] Pagina di dettaglio per cantina con URL propria (`#/cantina/nicolucci`), condivisibile
- [ ] Vista elenco compatta oltre alle schede
- [ ] Preferiti salvati in `localStorage` ("già state", "da provare")
- [ ] Clustering dei marker quando la mappa è molto zoomata fuori
- [ ] Versione inglese: il pubblico dell'enoturismo romagnolo è per metà straniero
