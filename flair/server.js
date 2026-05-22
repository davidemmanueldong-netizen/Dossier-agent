// Flair — Backend Node.js natif (sans dépendances npm)
// Endpoints Fragella supposés : https://api.fragella.com/v1/fragrances?q=<query>
//                               https://api.fragella.com/v1/fragrances/similar?name=<name>
// Documenter la vraie URL dans README si différente.

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

// ─── Parse .env ──────────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    raw.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq === -1) return;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !(key in process.env)) process.env[key] = val;
    });
  } catch (_) {
    // .env absent : pas une erreur fatale
  }
}

loadEnv();

const PORT             = parseInt(process.env.PORT || '4173', 10);
const FRAGELLA_API_KEY = process.env.FRAGELLA_API_KEY || '';
const FRAGELLA_BASE    = 'https://api.fragella.com';

// ─── Cache mémoire (TTL 10 min) ──────────────────────────────────────────────

const cache = new Map(); // key → { data, expires }
const TTL   = 10 * 60 * 1000;

function cacheGet(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { cache.delete(key); return null; }
  return entry.data;
}

function cacheSet(key, data) {
  cache.set(key, { data, expires: Date.now() + TTL });
}

// ─── Enrichissement de requête ────────────────────────────────────────────────

const ENRICHED = {
  libre:   ['Libre Yves Saint Laurent'],
  sauvage: ['Sauvage Dior'],
  alien:   ['Alien Mugler'],
  chance:  ['Chance Chanel'],
  coco:    ['Coco Mademoiselle Chanel'],
  miss:    ['Miss Dior'],
  j12:     ['J12 Chanel'],
  boss:    ['Hugo Boss Bottled'],
};

function getEnrichedTerms(query) {
  const q = query.toLowerCase().trim();
  return ENRICHED[q] || [];
}

// ─── Appel HTTPS Fragella ─────────────────────────────────────────────────────

function fetchFragella(endpoint) {
  return new Promise((resolve, reject) => {
    const fullUrl = `${FRAGELLA_BASE}${endpoint}`;
    const parsedUrl = new URL(fullUrl);
    const options = {
      hostname: parsedUrl.hostname,
      path:     parsedUrl.pathname + parsedUrl.search,
      method:   'GET',
      headers:  { 'x-api-key': FRAGELLA_API_KEY, 'Accept': 'application/json' },
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode === 429) {
          return reject({ status: 429, error: 'quota', message: 'Quota Fragella dépassé. Réessaie dans quelques minutes.' });
        }
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (_) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', err => reject({ status: 500, error: 'network', message: err.message }));
    req.end();
  });
}

// ─── Recherche Fragella avec enrichissement ────────────────────────────────

async function searchFragella(query) {
  if (!FRAGELLA_API_KEY) {
    return { error: 'no_key', message: 'FRAGELLA_API_KEY manquante dans .env' };
  }

  const cacheKey = `search:${query}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const enrichedTerms = getEnrichedTerms(query);
  const allTerms = [query, ...enrichedTerms];

  const results = [];
  const seen    = new Set();

  for (const term of allTerms) {
    try {
      const encodedTerm = encodeURIComponent(term);
      const { status, data } = await fetchFragella(`/v1/fragrances?q=${encodedTerm}&limit=8`);
      if (status !== 200) continue;
      const items = Array.isArray(data) ? data : (data.results || data.data || []);
      items.forEach(item => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          results.push(item);
        }
      });
    } catch (err) {
      if (err.status === 429) return err;
    }
  }

  // Trier : les items dont le name contient la requête originale passent en premier
  const q = query.toLowerCase();
  results.sort((a, b) => {
    const aMatch = (a.name || '').toLowerCase().includes(q) ? 0 : 1;
    const bMatch = (b.name || '').toLowerCase().includes(q) ? 0 : 1;
    return aMatch - bMatch;
  });

  const trimmed = results.slice(0, 8);
  cacheSet(cacheKey, trimmed);
  return trimmed;
}

// ─── Similaires Fragella ───────────────────────────────────────────────────

async function similarFragella(name) {
  if (!FRAGELLA_API_KEY) {
    return { error: 'no_key', message: 'FRAGELLA_API_KEY manquante dans .env' };
  }

  const cacheKey = `similar:${name}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  try {
    const encodedName = encodeURIComponent(name);
    const { status, data } = await fetchFragella(`/v1/fragrances/similar?name=${encodedName}&limit=8`);
    if (status !== 200) return [];
    const items = Array.isArray(data) ? data : (data.results || data.data || []);
    const trimmed = items.slice(0, 8);
    cacheSet(cacheKey, trimmed);
    return trimmed;
  } catch (err) {
    if (err.status === 429) return err;
    return [];
  }
}

// ─── MIME types ────────────────────────────────────────────────────────────

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.json': 'application/json',
};

// ─── Fichiers statiques ─────────────────────────────────────────────────────

function serveStatic(req, res) {
  const parsed   = url.parse(req.url);
  let   filePath = parsed.pathname;

  // Bloquer l'accès à .env et server.js
  const basename = path.basename(filePath);
  if (basename === '.env' || basename === 'server.js') {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  if (filePath === '/') filePath = '/index.html';

  // Chercher d'abord dans public/, puis dans assets/
  let fullPath = path.join(__dirname, 'public', filePath);
  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(__dirname, filePath);
  }

  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  const ext      = path.extname(fullPath).toLowerCase();
  const mimeType = MIME[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(fullPath);
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(content);
  } catch (_) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
}

// ─── Serveur HTTP ───────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const parsed  = url.parse(req.url, true);
  const pathname = parsed.pathname;

  res.setHeader('Access-Control-Allow-Origin', `http://127.0.0.1:${PORT}`);

  // ── GET /api/status ──────────────────────────────────────────────────────
  if (pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, fragella: !!FRAGELLA_API_KEY }));
    return;
  }

  // ── GET /api/fragrances?search=... ───────────────────────────────────────
  if (pathname === '/api/fragrances' && req.method === 'GET') {
    const query = (parsed.query.search || '').trim();
    if (!query) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing_param', message: 'Paramètre search requis' }));
      return;
    }

    try {
      const result = await searchFragella(query);
      if (result && result.error) {
        const statusCode = result.status || 500;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error('[FLAIR] Erreur /api/fragrances :', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'server_error', message: 'Erreur interne' }));
    }
    return;
  }

  // ── GET /api/fragrances/similar?name=... ─────────────────────────────────
  if (pathname === '/api/fragrances/similar' && req.method === 'GET') {
    const name = (parsed.query.name || '').trim();
    if (!name) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing_param', message: 'Paramètre name requis' }));
      return;
    }

    try {
      const result = await similarFragella(name);
      if (result && result.error) {
        const statusCode = result.status || 500;
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error('[FLAIR] Erreur /api/fragrances/similar :', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'server_error', message: 'Erreur interne' }));
    }
    return;
  }

  // ── Fichiers statiques ───────────────────────────────────────────────────
  serveStatic(req, res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[FLAIR] server running on http://127.0.0.1:${PORT}`);
  if (!FRAGELLA_API_KEY) {
    console.warn('[FLAIR] ⚠ FRAGELLA_API_KEY non définie — la recherche Fragella sera désactivée');
  }
});
