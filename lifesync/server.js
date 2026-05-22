// LifeSync — Backend Node.js natif
// Proxy Claude API + parsing iCal + données Clue

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const url   = require('url');

// ─── Parse .env ───────────────────────────────────────────────────────────
function loadEnv() {
  try {
    fs.readFileSync(path.join(__dirname, '.env'), 'utf8')
      .split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eq = trimmed.indexOf('=');
        if (eq === -1) return;
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        if (key && !(key in process.env)) process.env[key] = val;
      });
  } catch (_) {}
}
loadEnv();

const PORT          = parseInt(process.env.PORT || '4174', 10);
const CLAUDE_KEY    = process.env.CLAUDE_API_KEY || '';
const CLAUDE_MODEL  = 'claude-sonnet-4-6';
const DATA_DIR      = path.join(__dirname, 'data');

// ─── Parser iCal ──────────────────────────────────────────────────────────
function parseICal(content) {
  // Déplier les lignes continues (RFC 5545)
  const unfolded = content.replace(/\r?\n[ \t]/g, '');
  const lines    = unfolded.split(/\r?\n/);

  const events = [];
  let current  = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT' && current) {
      events.push(current);
      current = null;
    } else if (current) {
      const colon = line.indexOf(':');
      if (colon === -1) continue;
      const rawKey = line.slice(0, colon);
      const val    = line.slice(colon + 1);
      // Prendre uniquement la partie avant le premier ';' comme clé
      const key = rawKey.split(';')[0].toUpperCase();
      if (!current[key]) current[key] = val;
    }
  }
  return events;
}

function parseICalDate(str) {
  if (!str) return null;
  // DATE seulement : 20260521
  if (/^\d{8}$/.test(str)) {
    return new Date(
      parseInt(str.slice(0, 4)),
      parseInt(str.slice(4, 6)) - 1,
      parseInt(str.slice(6, 8))
    );
  }
  // DATE-TIME : 20260521T120000Z ou 20260521T120000
  const y  = str.slice(0, 4), mo = str.slice(4, 6), d = str.slice(6, 8);
  const h  = str.slice(9, 11), mi = str.slice(11, 13), s = str.slice(13, 15);
  if (str.endsWith('Z')) return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`);
}

function loadCalendar(filename, displayName) {
  try {
    const content = fs.readFileSync(path.join(DATA_DIR, filename), 'utf8');
    const events  = parseICal(content);
    const now     = new Date();
    const horizon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 jours

    return events
      .map(ev => ({
        summary : ev.SUMMARY || '(Sans titre)',
        start   : parseICalDate(ev.DTSTART),
        end     : parseICalDate(ev.DTEND),
        location: ev.LOCATION || '',
        calendar: displayName,
      }))
      .filter(ev => ev.start && ev.start >= now && ev.start <= horizon)
      .sort((a, b) => a.start - b.start);
  } catch (err) {
    console.error(`[LIFESYNC] Erreur lecture ${filename}:`, err.message);
    return [];
  }
}

function formatEvents(events) {
  if (!events.length) return '  Aucun événement à venir.';
  return events.map(ev => {
    const d = ev.start.toLocaleDateString('fr-FR', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit'
    });
    const loc = ev.location ? ` — ${ev.location}` : '';
    return `  • ${d}${loc} : ${ev.summary}`;
  }).join('\n');
}

// ─── Contexte calendrier injecté dans le system prompt ────────────────────
function buildSystemPrompt() {
  const wellyane = loadCalendar('wellyane.ics', 'Wellyane');
  const david    = loadCalendar('david.ics', 'David');
  const today    = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  return `Tu es LifeSync, assistant de planification personnel de Wellyane et David.
Aujourd'hui : ${today}

CALENDRIER WELLYANE :
${formatEvents(wellyane)}

CALENDRIER DAVID :
${formatEvents(david)}

RÈGLES ABSOLUES :
1. Maximum 2-3 phrases par réponse. Zéro blabla, zéro formule de politesse.
2. Pour tout RDV médical : donne LE créneau libre le plus proche + un lien Doctolib obligatoire au format [Réserver sur Doctolib](https://www.doctolib.fr/SPECIALITE/paris).
   Spécialités Doctolib : gynecologue, dentiste, medecin-generaliste, kinesitherapeute, dermatologue, ophtalmologue, psychiatre, cardiologue, sage-femme.
3. Pour trouver un créneau commun : compare les deux calendriers et donne une date précise.
4. Si fatigue ou stress mentionné : 1 phrase empathique + 1 suggestion concrète.
5. Pour "bloquer un créneau" : dis juste la date/heure à ajouter dans Google Calendar.
6. Réponds toujours en français.`;
}

// ─── Appel Claude API ─────────────────────────────────────────────────────
function callClaude(messages) {
  return new Promise((resolve, reject) => {
    const systemPrompt = buildSystemPrompt();
    const body = JSON.stringify({
      model     : CLAUDE_MODEL,
      max_tokens: 1024,
      system    : systemPrompt,
      messages,
    });

    const options = {
      hostname: 'api.anthropic.com',
      path    : '/v1/messages',
      method  : 'POST',
      headers : {
        'Content-Type'     : 'application/json',
        'x-api-key'        : CLAUDE_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length'   : Buffer.byteLength(body),
      },
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message || 'Erreur Claude'));
          const text  = parsed.content?.[0]?.text || '';
          const usage = parsed.usage || {};
          resolve({ text, usage });
        } catch (e) {
          reject(new Error('Réponse invalide de Claude'));
        }
      });
    });

    req.on('error', err => reject(err));
    req.write(body);
    req.end();
  });
}

// ─── MIME types ────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css' : 'text/css; charset=utf-8',
  '.js'  : 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg' : 'image/svg+xml',
  '.ico' : 'image/x-icon',
};

// ─── Corps JSON d'une requête POST ─────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch (_) { resolve({}); }
    });
    req.on('error', reject);
  });
}

// ─── Serveur ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;

  res.setHeader('X-Content-Type-Options', 'nosniff');

  // POST /api/chat
  if (pathname === '/api/chat' && req.method === 'POST') {
    if (!CLAUDE_KEY) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'no_key', message: 'CLAUDE_API_KEY manquante dans .env' }));
      return;
    }
    try {
      const { messages } = await readBody(req);
      if (!Array.isArray(messages) || !messages.length) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'bad_request', message: 'messages requis' }));
        return;
      }
      const wellyane = loadCalendar('wellyane.ics', 'Wellyane');
      const david    = loadCalendar('david.ics', 'David');
      const { text: reply, usage } = await callClaude(messages);
      const sources = [
        { icon: 'gcal',   name: 'Google Calendar', detail: `Wellyane — ${wellyane.length} événements` },
        { icon: 'gcal',   name: 'Google Calendar', detail: `David — ${david.length} événements` },
        { icon: 'flo',    name: 'Flo',             detail: 'Suivi de cycle actif' },
        { icon: 'claude', name: 'Claude AI',        detail: `${CLAUDE_MODEL} · ${usage.input_tokens || '?'} → ${usage.output_tokens || '?'} tokens` },
      ];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: reply, sources }));
    } catch (err) {
      console.error('[LIFESYNC] Erreur Claude:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'claude_error', message: err.message }));
    }
    return;
  }

  // GET /api/status
  if (pathname === '/api/status' && req.method === 'GET') {
    const wellyane = loadCalendar('wellyane.ics', 'Wellyane');
    const david    = loadCalendar('david.ics', 'David');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      claude: !!CLAUDE_KEY,
      calendars: { wellyane: wellyane.length, david: david.length },
    }));
    return;
  }

  // GET /api/events
  if (pathname === '/api/events' && req.method === 'GET') {
    const wellyane = loadCalendar('wellyane.ics', 'Wellyane');
    const david    = loadCalendar('david.ics', 'David');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ wellyane, david }));
    return;
  }

  // Bloquer accès .env et server.js
  const basename = path.basename(pathname);
  if (basename === '.env' || basename === 'server.js') {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Fichiers statiques
  let filePath = pathname === '/' ? '/index.html' : pathname;
  const fullPath = path.join(__dirname, 'public', filePath);

  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  const ext  = path.extname(fullPath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  res.end(fs.readFileSync(fullPath));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[LIFESYNC] server running on http://127.0.0.1:${PORT}`);
  if (!CLAUDE_KEY) console.warn('[LIFESYNC] ⚠ CLAUDE_API_KEY non définie');
});
