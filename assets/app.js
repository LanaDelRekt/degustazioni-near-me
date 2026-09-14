/* Dove portare Lele a bere — logica della guida.
 *
 * Tutto parte da due file in data/: cantine.json e alloggi.json.
 * Nessuna build, nessuna dipendenza oltre a Leaflet. Per aggiungere una
 * cantina basta una riga di JSON: filtri, mappa e schede si aggiornano da soli.
 */

const ORIGINE = { nome: 'Forlì', lat: 44.22266, lng: 12.04068 };
const ALLOGGI_PER_CANTINA = 3;

const stato = {
  cantine: [],
  alloggi: [],
  visibili: [],
  marker: new Map(),
  evidenziata: null,
};

const $ = (sel) => document.querySelector(sel);

const el = {
  lista: $('#lista'),
  conteggio: $('#conteggio'),
  conteggioHero: $('#conteggio-hero'),
  testo: $('#f-testo'),
  vitigno: $('#f-vitigno'),
  tipologia: $('#f-tipologia'),
  zona: $('#f-zona'),
  minuti: $('#f-minuti'),
  minutiOut: $('#f-minuti-out'),
  voto: $('#f-voto'),
  votoOut: $('#f-voto-out'),
  ordine: $('#f-ordine'),
  bio: $('#f-bio'),
  prezzo: $('#f-prezzo'),
  consigliate: $('#f-consigliate'),
  contaConsigliate: $('#conta-consigliate'),
  reset: $('#reset'),
};

/* ------------------------------------------------------------------ utility */

/** Distanza in linea d'aria in km (formula dell'emisenoverso). */
function kmAria(a, b) {
  const R = 6371;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function stelle(voto) {
  if (voto == null) return '';
  const piene = Math.floor(voto);
  const mezza = voto - piene >= 0.25 && voto - piene < 0.75;
  const extra = voto - piene >= 0.75 ? 1 : 0;
  return '★'.repeat(piene + extra) + (mezza ? '⯨' : '') + '☆'.repeat(5 - piene - extra - (mezza ? 1 : 0));
}

function prezzoTesto(c) {
  if (c.costo_degustazione == null) return null;
  return c.costo_degustazione_max
    ? `${c.costo_degustazione}–${c.costo_degustazione_max} €`
    : `da ${c.costo_degustazione} €`;
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])
  );

const mapsLink = (c) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${c.nome} ${c.comune}`)}`;

const indicazioniLink = (c) =>
  `https://www.google.com/maps/dir/?api=1&origin=${ORIGINE.lat},${ORIGINE.lng}&destination=${c.lat},${c.lng}`;

const bookingLink = (a) => `https://www.booking.com/hotel/it/${a.slug}.it.html`;

/* --------------------------------------------------------------- caricamento */

async function carica() {
  const [cantine, alloggi] = await Promise.all([
    fetch('data/cantine.json').then((r) => r.json()),
    fetch('data/alloggi.json').then((r) => r.json()),
  ]);

  stato.alloggi = alloggi;
  stato.cantine = cantine.map((c) => ({
    ...c,
    dormire: [...alloggi]
      .map((a) => ({ ...a, km: kmAria(c, a) }))
      .sort((x, y) => x.km - y.km)
      .slice(0, ALLOGGI_PER_CANTINA),
  }));

  popolaSelect(el.vitigno, stato.cantine.flatMap((c) => c.vitigni ?? []));
  popolaSelect(el.tipologia, stato.cantine.flatMap((c) => c.tipologie ?? []));
  popolaSelect(el.zona, stato.cantine.map((c) => c.zona));

  el.conteggioHero.textContent = stato.cantine.length;
  el.contaConsigliate.textContent = `(${stato.cantine.filter((c) => c.consigliata).length})`;
  disegnaMappa();
  applica();
}

function popolaSelect(select, valori) {
  const unici = [...new Set(valori.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'it'));
  for (const v of unici) {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v[0].toUpperCase() + v.slice(1);
    select.append(opt);
  }
}

/* --------------------------------------------------------------------- mappa */

let mappa;
let gruppoMarker;

/** Su touch la mappa parte bloccata: altrimenti si mangia lo scroll della pagina. */
const TOUCH = window.matchMedia('(hover: none)').matches;
const MOVIMENTO = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

function disegnaMappa() {
  mappa = L.map('mappa', {
    scrollWheelZoom: false,
    dragging: !TOUCH,
    tap: false,
  }).setView([44.2, 11.98], 10);

  if (TOUCH) {
    const sblocca = $('#mappa-sblocca');
    sblocca.hidden = false;
    sblocca.addEventListener('click', () => {
      mappa.dragging.enable();
      sblocca.hidden = true;
    });
  }

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(mappa);

  L.marker([ORIGINE.lat, ORIGINE.lng], {
    icon: L.divIcon({
      className: '',
      html: '<div class="pin" style="background:#241b1d" title="Forlì">FO</div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    }),
    zIndexOffset: -100,
  })
    .addTo(mappa)
    .bindPopup('<b>Forlì</b><div class="pop-meta">Punto di partenza</div>');

  gruppoMarker = L.layerGroup().addTo(mappa);
}

function aggiornaMarker(cantine) {
  gruppoMarker.clearLayers();
  stato.marker.clear();

  for (const c of cantine) {
    const alta = (c.google_rating ?? 0) >= 4.8;
    const marker = L.marker([c.lat, c.lng], {
      icon: L.divIcon({
        className: '',
        html: `<div class="pin ${alta ? 'alta' : ''} ${c.consigliata ? 'scelta' : ''}">${
          c.google_rating?.toFixed(1) ?? '–'
        }</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      }),
      title: c.nome,
    });

    marker.bindPopup(
      `<b>${esc(c.nome)}</b>
       <div class="pop-meta">${esc(c.comune)} · ${c.min_auto}′ da Forlì · ★ ${c.google_rating ?? '–'}</div>`
    );
    marker.on('click', () => evidenzia(c.id, true));
    marker.addTo(gruppoMarker);
    stato.marker.set(c.id, marker);
  }

  if (cantine.length) {
    const bounds = L.latLngBounds(cantine.map((c) => [c.lat, c.lng]));
    bounds.extend([ORIGINE.lat, ORIGINE.lng]);
    mappa.fitBounds(bounds, { padding: [40, 40] });
  }
}

function evidenzia(id, scrollaAllaScheda) {
  if (stato.evidenziata) {
    document.getElementById(`c-${stato.evidenziata}`)?.classList.remove('evidenza');
    stato.marker.get(stato.evidenziata)?.getElement()?.querySelector('.pin')?.classList.remove('evidenza');
  }
  stato.evidenziata = id;
  const card = document.getElementById(`c-${id}`);
  card?.classList.add('evidenza');
  stato.marker.get(id)?.getElement()?.querySelector('.pin')?.classList.add('evidenza');
  if (scrollaAllaScheda) card?.scrollIntoView({ behavior: MOVIMENTO, block: 'center' });
}

/* ------------------------------------------------------------------- filtri */

function applica() {
  const testo = el.testo.value.trim().toLowerCase();
  const vitigno = el.vitigno.value;
  const tipologia = el.tipologia.value;
  const zona = el.zona.value;
  const maxMin = Number(el.minuti.value);
  const minVoto = Number(el.voto.value);

  el.minutiOut.textContent = maxMin;
  el.votoOut.textContent = minVoto ? minVoto.toFixed(1) : '0';

  let out = stato.cantine.filter((c) => {
    if (el.consigliate.checked && !c.consigliata) return false;
    if (maxMin < 60 && (c.min_auto ?? 999) > maxMin) return false;
    if (minVoto && (c.google_rating ?? 0) < minVoto) return false;
    if (zona && c.zona !== zona) return false;
    if (vitigno && !(c.vitigni ?? []).includes(vitigno)) return false;
    if (tipologia && !(c.tipologie ?? []).includes(tipologia)) return false;
    if (el.bio.checked && !c.bio) return false;
    if (el.prezzo.checked && c.costo_degustazione == null) return false;
    if (testo) {
      const blob = [c.nome, c.comune, c.zona, c.descrizione, ...(c.vitigni ?? []), ...(c.tipologie ?? [])]
        .join(' ')
        .toLowerCase();
      if (!blob.includes(testo)) return false;
    }
    return true;
  });

  const ordinatori = {
    consigliate: (a, b) => Number(b.consigliata) - Number(a.consigliata) || (a.min_auto ?? 999) - (b.min_auto ?? 999),
    distanza: (a, b) => (a.min_auto ?? 999) - (b.min_auto ?? 999),
    voto: (a, b) => (b.google_rating ?? 0) - (a.google_rating ?? 0) || (b.google_recensioni ?? 0) - (a.google_recensioni ?? 0),
    recensioni: (a, b) => (b.google_recensioni ?? 0) - (a.google_recensioni ?? 0),
    prezzo: (a, b) => (a.costo_degustazione ?? 1e9) - (b.costo_degustazione ?? 1e9),
    nome: (a, b) => a.nome.localeCompare(b.nome, 'it'),
  };
  out = out.sort(ordinatori[el.ordine.value]);

  stato.visibili = out;
  rendi(out);
  aggiornaMarker(out);
}

/* ---------------------------------------------------------------- rendering */

function rendi(cantine) {
  el.conteggio.innerHTML = cantine.length
    ? `<strong>${cantine.length}</strong> ${cantine.length === 1 ? 'cantina' : 'cantine'} su ${stato.cantine.length}`
    : 'Nessuna cantina con questi filtri';

  if (!cantine.length) {
    el.lista.innerHTML = '<p class="vuoto">Nessun risultato. Prova ad allargare il raggio o ad azzerare i filtri.</p>';
    return;
  }

  el.lista.innerHTML = cantine.map(schedaHTML).join('');

  for (const card of el.lista.querySelectorAll('.card')) {
    card.addEventListener('click', (ev) => {
      if (ev.target.closest('a')) return;
      const id = card.id.slice(2);
      evidenzia(id);
      const m = stato.marker.get(id);
      if (m) {
        mappa.setView(m.getLatLng(), Math.max(mappa.getZoom(), 12), { animate: true });
        m.openPopup();
        // Su mobile la mappa sta sopra la lista: senza questo il pan avviene fuori schermo.
        if (TOUCH) document.querySelector('.mappa-box').scrollIntoView({ behavior: MOVIMENTO, block: 'center' });
      }
    });
  }
}

function schedaHTML(c) {
  const prezzo = prezzoTesto(c);

  const badge = [
    c.consigliata ? '<span class="badge scelta">★ scelta di Daniele</span>' : '',
    `<span class="badge">${esc(c.zona)}</span>`,
    c.bio ? '<span class="badge bio">biologica</span>' : '',
    prezzo ? `<span class="badge prezzo">degustazione ${esc(prezzo)}</span>` : '',
    ...(c.vitigni ?? []).slice(0, 3).map((v) => `<span class="badge">${esc(v)}</span>`),
  ].filter(Boolean).join('');

  const dormire = c.dormire
    .map(
      (a) => `<li>
        <a href="${bookingLink(a)}" target="_blank" rel="noopener">${esc(a.nome)}</a>
        <span class="meta"><span class="punteggio">${a.voto.toFixed(1)}</span> ${a.km.toFixed(0)} km</span>
      </li>`
    )
    .join('');

  return `
<article class="card${c.consigliata ? ' consigliata' : ''}" id="c-${esc(c.id)}">
  <div class="card-top">
    <div>
      <h3>${
        c.consigliata ? '<span class="stella-daniele" title="Consigliata da Daniele">★</span>' : ''
      }${esc(c.nome)}</h3>
      <p class="luogo">${esc(c.comune)} (${esc(c.provincia)})</p>
    </div>
    <div class="voto">${
      c.google_rating == null
        ? '<span class="voto-assente">nessuna<br>scheda Google</span>'
        : `<div class="stelle" title="Voto Google Maps">${stelle(c.google_rating)}</div>
           <div class="voto-num">${c.google_rating.toFixed(1)}</div>
           <span class="voto-rec">${c.google_recensioni ?? 0} recensioni</span>`
    }</div>
  </div>

  <div class="badge-riga">${badge}</div>

  <p class="descr">${esc(c.descrizione)}</p>

  <div class="dati">
    <div><span class="k">Distanza da Forlì</span><span class="v">${c.km_auto} km · ${c.min_auto} min</span></div>
    <div><span class="k">Costo degustazione</span>${
      prezzo ? `<span class="v">${esc(prezzo)}</span>` : '<span class="v na">da chiedere</span>'
    }</div>
    <div><span class="k">Vini in catalogo</span>${
      c.vini_catalogo ? `<span class="v">${c.vini_catalogo}</span>` : '<span class="v na">n/d</span>'
    }</div>
    <div><span class="k">Visita</span><span class="v">${
      c.su_prenotazione ? 'su prenotazione' : 'accesso libero'
    }</span></div>
  </div>

  <div class="azioni">
    ${c.telefono ? `<a class="primaria" href="tel:${c.telefono.replace(/\s/g, '')}">Chiama</a>` : ''}
    ${c.email ? `<a class="${c.telefono ? '' : 'primaria'}" href="mailto:${esc(c.email)}">Email</a>` : ''}
    ${c.sito ? `<a href="${esc(c.sito)}" target="_blank" rel="noopener">Sito</a>` : ''}
    <a href="${mapsLink(c)}" target="_blank" rel="noopener">Google Maps</a>
    <a href="${indicazioniLink(c)}" target="_blank" rel="noopener">Indicazioni</a>
  </div>

  <div class="dormire">
    <h4>Dormire qui vicino · Booking</h4>
    <ol>${dormire}</ol>
  </div>
</article>`;
}

/* -------------------------------------------------------------------- eventi */

const controlli = [el.testo, el.vitigno, el.tipologia, el.zona, el.minuti, el.voto, el.ordine, el.bio, el.prezzo, el.consigliate];
for (const nodo of controlli) {
  nodo.addEventListener('input', applica);
}

el.reset.addEventListener('click', () => {
  el.testo.value = '';
  el.vitigno.value = '';
  el.tipologia.value = '';
  el.zona.value = '';
  el.minuti.value = 60;
  el.voto.value = 0;
  el.ordine.value = 'distanza';
  el.bio.checked = false;
  el.prezzo.checked = false;
  el.consigliate.checked = false;
  applica();
});

carica().catch((err) => {
  console.error(err);
  el.lista.innerHTML = '<p class="vuoto">Non sono riuscito a caricare i dati. Ricarica la pagina.</p>';
});
