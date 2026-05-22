// Flair — app.js (frontend vanilla)

// ─── Détection file:// ────────────────────────────────────────────────────
if (location.protocol === 'file:') {
  const el = document.getElementById('file-error');
  el.hidden = false;
  el.textContent = 'Ouvre http://127.0.0.1:4173 pour utiliser Flair.';
  throw new Error('file:// not supported');
}

// ─── Données initiales ────────────────────────────────────────────────────

const INITIAL_DEALS = [
  {
    id: 'init-1',
    name: 'Chance EDP',
    brand: 'Chanel',
    vendor: 'Sephora',
    price: 92,
    refPrice: 120,
    volume: 50,
    profile: 'femme',
    family: 'floral',
    type: 'EDP',
    offerUrl: 'https://www.sephora.fr',
    date: '2026-05-10',
  },
  {
    id: 'init-2',
    name: 'Sauvage EDT',
    brand: 'Dior',
    vendor: 'Nocibé',
    price: 84,
    refPrice: 108,
    volume: 100,
    profile: 'homme',
    family: 'frais',
    type: 'EDT',
    offerUrl: 'https://www.nocibe.fr',
    date: '2026-05-05',
  },
  {
    id: 'init-3',
    name: 'Libre EDP',
    brand: 'Yves Saint Laurent',
    vendor: 'Notino',
    price: 76,
    refPrice: 98,
    volume: 50,
    profile: 'femme',
    family: 'ambre',
    type: 'EDP',
    offerUrl: 'https://www.notino.fr',
    date: '2026-05-15',
  },
  {
    id: 'init-4',
    name: 'Acqua di Giò EDT',
    brand: 'Giorgio Armani',
    vendor: 'Marionnaud',
    price: 62,
    refPrice: 82,
    volume: 100,
    profile: 'homme',
    family: 'frais',
    type: 'EDT',
    offerUrl: 'https://www.marionnaud.fr',
    date: '2026-04-28',
  },
  {
    id: 'init-5',
    name: 'Angel EDP',
    brand: 'Mugler',
    vendor: 'Sephora',
    price: 52,
    refPrice: 72,
    volume: 50,
    profile: 'femme',
    family: 'gourmand',
    type: 'EDP',
    offerUrl: 'https://www.sephora.fr',
    date: '2026-05-01',
  },
  {
    id: 'init-6',
    name: 'CK One EDT',
    brand: 'Calvin Klein',
    vendor: 'Notino',
    price: 32,
    refPrice: 48,
    volume: 200,
    profile: 'mixte',
    family: 'frais',
    type: 'EDT',
    offerUrl: 'https://www.notino.fr',
    date: '2026-04-25',
  },
];

// ─── Calcul du score ──────────────────────────────────────────────────────

function calcScore(deal) {
  const discountPct  = deal.discountPct;
  const pricePerMl   = deal.pricePerMl;
  let score;

  if (discountPct !== null && discountPct !== undefined) {
    score = (discountPct * 0.5) + (100 - pricePerMl * 10) * 0.5;
  } else {
    score = (100 - pricePerMl * 10);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function enrichDeal(deal) {
  const d = { ...deal };
  d.discountPct = d.refPrice ? Math.round((1 - d.price / d.refPrice) * 100) : null;
  d.pricePerMl  = +(d.price / d.volume).toFixed(2);
  d.score       = calcScore(d);
  return d;
}

// ─── State ────────────────────────────────────────────────────────────────

let userDeals  = [];
let favorites  = new Set();
let allDeals   = [];
let filters    = { search: '', budget: 200, profile: 'all', family: 'all', type: 'all', discountOnly: false };
let sortBy     = 'score';
let fragellaCachedResults = [];

function loadStorage() {
  try {
    const raw = localStorage.getItem('flair_deals');
    if (raw) userDeals = JSON.parse(raw);
  } catch (_) { userDeals = []; }
  try {
    const raw = localStorage.getItem('flair_favorites');
    if (raw) favorites = new Set(JSON.parse(raw));
  } catch (_) { favorites = new Set(); }
}

function saveDeals() {
  localStorage.setItem('flair_deals', JSON.stringify(userDeals));
}

function saveFavorites() {
  localStorage.setItem('flair_favorites', JSON.stringify([...favorites]));
}

function buildAllDeals() {
  allDeals = [...INITIAL_DEALS, ...userDeals].map(enrichDeal);
}

// ─── Filtrage + Tri ───────────────────────────────────────────────────────

function applyFiltersAndSort() {
  const q = filters.search.toLowerCase().trim();

  let result = allDeals.filter(deal => {
    if (q && !`${deal.name} ${deal.brand} ${deal.vendor}`.toLowerCase().includes(q)) return false;
    if (deal.price > filters.budget) return false;
    if (filters.profile !== 'all' && deal.profile !== filters.profile) return false;
    if (filters.family  !== 'all' && deal.family  !== filters.family)  return false;
    if (filters.type    !== 'all' && deal.type    !== filters.type)    return false;
    if (filters.discountOnly && (deal.discountPct === null || deal.discountPct <= 0)) return false;
    return true;
  });

  if (sortBy === 'score')      result.sort((a, b) => b.score - a.score);
  else if (sortBy === 'discount') result.sort((a, b) => (b.discountPct || 0) - (a.discountPct || 0));
  else if (sortBy === 'pricePerMl') result.sort((a, b) => a.pricePerMl - b.pricePerMl);

  return result;
}

// ─── Rendu ────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (_) { return dateStr; }
}

function renderDeals() {
  const grid   = document.getElementById('deals-grid');
  const result = applyFiltersAndSort();

  updateBestDeal(result);

  if (result.length === 0) {
    grid.innerHTML = '<div class="empty-state">Aucune offre ne correspond à vos filtres.</div>';
    return;
  }

  grid.innerHTML = result.map(deal => {
    const isFav   = favorites.has(deal.id);
    const discount = deal.discountPct !== null && deal.discountPct > 0
      ? `<span class="deal-discount">-${deal.discountPct}%</span>` : '';
    const refPrice = deal.refPrice
      ? `<span class="deal-ref-price">${deal.refPrice}€</span>` : '';
    const link = deal.offerUrl
      ? `<a href="${deal.offerUrl}" target="_blank" rel="noopener" class="deal-link">Voir l'offre ↗</a>` : '';

    return `
      <article class="deal-card${isFav ? ' is-favorite' : ''}" data-id="${deal.id}">
        <div class="deal-card-header">
          <span class="deal-name">${esc(deal.name)}</span>
          <button
            class="btn-favorite${isFav ? ' active' : ''}"
            data-id="${deal.id}"
            aria-label="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}"
            title="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}"
          >♥</button>
        </div>
        <div class="deal-brand">${esc(deal.brand)}</div>
        <div class="deal-meta">
          <span class="deal-tag">${esc(deal.profile)}</span>
          <span class="deal-tag tag-family">${esc(deal.family)}</span>
          <span class="deal-tag tag-type">${esc(deal.type)}</span>
        </div>
        <div class="deal-price-row">
          <span class="deal-price">${deal.price}€</span>
          ${refPrice}${discount}
        </div>
        <div class="deal-per-ml">${deal.pricePerMl}€/ml · ${deal.volume}ml</div>
        <div class="deal-footer">
          <span class="deal-vendor">${esc(deal.vendor)}</span>
          <span class="deal-score">Score ${deal.score}</span>
        </div>
        <div class="deal-date">${formatDate(deal.date)}</div>
        ${link}
      </article>`;
  }).join('');

  // Boutons favoris
  grid.querySelectorAll('.btn-favorite').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      toggleFavorite(btn.dataset.id);
    });
  });
}

function updateBestDeal(filteredDeals) {
  const block = document.getElementById('best-deal');
  if (!filteredDeals.length) { block.hidden = true; return; }

  const best = filteredDeals.reduce((a, b) => a.score >= b.score ? a : b);
  block.hidden = false;

  const discount = best.discountPct !== null && best.discountPct > 0
    ? `<span class="best-deal-discount">-${best.discountPct}%</span>` : '';

  document.getElementById('best-deal-content').innerHTML = `
    <span class="best-deal-name">${esc(best.name)}</span>
    <span class="best-deal-brand">${esc(best.brand)}</span>
    <span class="best-deal-vendor">${esc(best.vendor)}</span>
    <span class="best-deal-price">${best.price}€</span>
    ${discount}
    <span class="best-deal-score">Score ${best.score}/100</span>
  `;
}

function toggleFavorite(id) {
  if (favorites.has(id)) favorites.delete(id);
  else favorites.add(id);
  saveFavorites();
  renderDeals();
}

// ─── Événements filtres / tris ────────────────────────────────────────────

function bindFilters() {
  const search  = document.getElementById('deals-search');
  const budget  = document.getElementById('budget-slider');
  const budgetV = document.getElementById('budget-value');
  const profile = document.getElementById('filter-profile');
  const family  = document.getElementById('filter-family');
  const type    = document.getElementById('filter-type');
  const discOnly= document.getElementById('filter-discount');

  search.addEventListener('input', () => { filters.search = search.value; renderDeals(); });
  budget.addEventListener('input', () => {
    filters.budget = parseInt(budget.value, 10);
    budgetV.textContent = filters.budget >= 200 ? '200€+' : `${filters.budget}€`;
    renderDeals();
  });
  profile.addEventListener('change', () => { filters.profile = profile.value;  renderDeals(); });
  family.addEventListener('change',  () => { filters.family  = family.value;   renderDeals(); });
  type.addEventListener('change',    () => { filters.type    = type.value;     renderDeals(); });
  discOnly.addEventListener('change',() => { filters.discountOnly = discOnly.checked; renderDeals(); });

  document.querySelectorAll('input[name="sort"]').forEach(radio => {
    radio.addEventListener('change', () => { sortBy = radio.value; renderDeals(); });
  });
}

// ─── Modale ajout offre ───────────────────────────────────────────────────

function openModal() {
  document.getElementById('modal-add').hidden = false;
  document.getElementById('modal-perfume-name').focus();
}

function closeModal() {
  document.getElementById('modal-add').hidden = true;
  document.getElementById('form-add-deal').reset();
  const err = document.getElementById('form-error');
  err.hidden = true; err.textContent = '';
}

function openModalWithPrefill({ name, brand }) {
  document.getElementById('modal-perfume-name').value = name || '';
  document.getElementById('modal-brand').value        = brand || '';
  openModal();
}

function bindModal() {
  document.getElementById('btn-add-deal').addEventListener('click', openModal);
  document.getElementById('btn-modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-add').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('modal-add').hidden) closeModal();
  });

  document.getElementById('form-add-deal').addEventListener('submit', e => {
    e.preventDefault();
    submitDeal();
  });
}

function submitDeal() {
  const form = document.getElementById('form-add-deal');
  const err  = document.getElementById('form-error');
  err.hidden = true;

  const required = ['modal-perfume-name','modal-brand','modal-vendor','modal-price','modal-volume','modal-profile','modal-family','modal-type'];
  for (const id of required) {
    if (!document.getElementById(id).value.trim()) {
      err.hidden = false;
      err.textContent = 'Veuillez remplir tous les champs obligatoires (*).';
      document.getElementById(id).focus();
      return;
    }
  }

  const deal = {
    id:       Date.now().toString(),
    name:     document.getElementById('modal-perfume-name').value.trim(),
    brand:    document.getElementById('modal-brand').value.trim(),
    vendor:   document.getElementById('modal-vendor').value.trim(),
    price:    parseFloat(document.getElementById('modal-price').value),
    refPrice: parseFloat(document.getElementById('modal-ref-price').value) || null,
    volume:   parseFloat(document.getElementById('modal-volume').value),
    profile:  document.getElementById('modal-profile').value,
    family:   document.getElementById('modal-family').value,
    type:     document.getElementById('modal-type').value,
    offerUrl: document.getElementById('modal-url').value.trim() || null,
    date:     new Date().toISOString().slice(0, 10),
  };

  userDeals.push(deal);
  saveDeals();
  buildAllDeals();
  closeModal();
  renderDeals();
}

// ─── Section Fragella ─────────────────────────────────────────────────────

let fragellaPreviousResults = [];

function showFragellaStatus(msg, type) {
  const el = document.getElementById('fragella-status');
  el.hidden = false;
  el.className = `fragella-status is-${type}`;
  el.textContent = msg;
}

function hideFragellaStatus() {
  document.getElementById('fragella-status').hidden = true;
}

function renderFragellaGrid(items, saveAsCache) {
  const grid = document.getElementById('fragella-grid');
  if (saveAsCache) fragellaCachedResults = items;

  if (!items || items.length === 0) {
    grid.innerHTML = '<div class="empty-state">Aucun résultat.</div>';
    return;
  }

  grid.innerHTML = items.map((item, idx) => {
    const img = item.imageUrl || item.image_url || item.image || '';
    const year = item.year || item.releaseYear || '';
    const type = item.type || item.concentration || '';
    const note = item.topNote || item.mainNote || item.note || '';

    return `
      <article class="fragella-card" tabindex="0" data-idx="${idx}" role="button" aria-label="${esc(item.name || '')} par ${esc(item.brand || '')}">
        ${img
          ? `<img class="fragella-card-img" src="${esc(img)}" alt="${esc(item.name || '')}" loading="lazy">`
          : `<div class="fragella-card-img-placeholder" aria-hidden="true">✦</div>`
        }
        <div class="fragella-card-name">${esc(item.name || '—')}</div>
        <div class="fragella-card-brand">${esc(item.brand || '')}</div>
        <div class="fragella-card-meta">
          ${year ? `<span class="fragella-card-tag">${esc(String(year))}</span>` : ''}
          ${type ? `<span class="fragella-card-tag">${esc(type)}</span>` : ''}
          ${note ? `<span class="fragella-card-tag">${esc(note)}</span>` : ''}
        </div>
      </article>`;
  }).join('');

  grid.querySelectorAll('.fragella-card').forEach((card, idx) => {
    const handler = () => selectFragellaCard(items[idx], card, grid);
    card.addEventListener('click', handler);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });
  });
}

function selectFragellaCard(item, card, grid) {
  grid.querySelectorAll('.fragella-card').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  showFragellaDetail(item);
  loadSimilar(item);
}

function showFragellaDetail(item) {
  const detail = document.getElementById('fragella-detail');
  const content= document.getElementById('fragella-detail-content');
  detail.hidden = false;

  const img  = item.imageUrl || item.image_url || item.image || '';
  const year = item.year || item.releaseYear || '';
  const type = item.type || item.concentration || '';
  const note = item.topNote || item.mainNote || item.note || '';
  const desc = item.description || item.summary || '';

  content.innerHTML = `
    ${img
      ? `<img class="fragella-detail-img" src="${esc(img)}" alt="${esc(item.name || '')}">`
      : `<div class="fragella-detail-img-placeholder" aria-hidden="true">✦</div>`
    }
    <div class="fragella-detail-name">${esc(item.name || '—')}</div>
    <div class="fragella-detail-brand">${esc(item.brand || '')}</div>
    <div class="fragella-detail-tags">
      ${year ? `<span class="fragella-detail-tag">${esc(String(year))}</span>` : ''}
      ${type ? `<span class="fragella-detail-tag">${esc(type)}</span>` : ''}
      ${note ? `<span class="fragella-detail-tag">${esc(note)}</span>` : ''}
    </div>
    ${desc ? `<p class="fragella-detail-desc">${esc(desc)}</p>` : ''}
    <button class="btn-track" type="button" id="btn-track-perfume">♡ Suivre ce parfum</button>
  `;

  document.getElementById('btn-track-perfume').addEventListener('click', () => {
    openModalWithPrefill({ name: item.name || '', brand: item.brand || '' });
  });
}

async function loadSimilar(item) {
  const name = item.name || '';
  if (!name) return;

  showFragellaStatus('Chargement des parfums similaires…', 'loading');

  try {
    const res  = await fetch(`/api/fragrances/similar?name=${encodeURIComponent(name)}`);
    const data = await res.json();
    hideFragellaStatus();

    if (data.error === 'quota')  { showFragellaStatus('Quota Fragella dépassé. Réessaie dans quelques minutes.', 'error'); return; }
    if (data.error === 'no_key') { showFragellaStatus('Configure ta clé Fragella dans .env', 'error'); return; }

    renderFragellaGrid(Array.isArray(data) ? data : [], false);
  } catch (_) {
    hideFragellaStatus();
  }
}

async function searchFragella(query) {
  showFragellaStatus('Recherche en cours…', 'loading');
  document.getElementById('fragella-detail').hidden = true;

  try {
    const res  = await fetch(`/api/fragrances?search=${encodeURIComponent(query)}`);
    const data = await res.json();
    hideFragellaStatus();

    if (data.error === 'quota')  { showFragellaStatus('Quota Fragella dépassé. Réessaie dans quelques minutes.', 'error'); return; }
    if (data.error === 'no_key') { showFragellaStatus('Configure ta clé Fragella dans .env pour activer la recherche.', 'error'); return; }
    if (!Array.isArray(data))    { showFragellaStatus('Réponse inattendue du serveur.', 'error'); return; }
    if (data.length === 0)       { showFragellaStatus('Aucun résultat pour cette recherche.', 'empty'); return; }

    renderFragellaGrid(data, true);
  } catch (_) {
    showFragellaStatus('Erreur de connexion au serveur.', 'error');
  }
}

function bindFragella() {
  const input = document.getElementById('fragella-input');
  const btn   = document.getElementById('btn-fragella-search');

  const doSearch = () => {
    const q = input.value.trim();
    if (!q) return;
    searchFragella(q);
  };

  btn.addEventListener('click', doSearch);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

  document.getElementById('btn-fragella-back').addEventListener('click', () => {
    document.getElementById('fragella-detail').hidden = true;
    renderFragellaGrid(fragellaCachedResults, false);
  });
}

// ─── Utilitaires ──────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Init ─────────────────────────────────────────────────────────────────

function init() {
  loadStorage();
  buildAllDeals();
  bindFilters();
  bindModal();
  bindFragella();
  renderDeals();
}

init();
