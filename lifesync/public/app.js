// LifeSync — frontend

// ── Navigation ───────────────────────────────────────────────────────────
function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view-' + name).classList.remove('hidden');
  document.querySelector(`.nav-item[data-view="${name}"]`)?.classList.add('active');
}

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', () => switchView(el.dataset.view));
});
document.getElementById('btn-open-chat').addEventListener('click', () => switchView('chat'));
document.getElementById('btn-back-dash').addEventListener('click', () => switchView('dashboard'));

// ── Dashboard : date ─────────────────────────────────────────────────────
document.getElementById('today-label').textContent = new Date().toLocaleDateString('fr-FR', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
});

// ── Dashboard : chargement des événements ────────────────────────────────
async function loadDashboard() {
  try {
    const res  = await fetch('/api/events');
    const data = await res.json();

    renderEvents('events-wellyane', data.wellyane || [], 'badge-wellyane');
    renderEvents('events-david',    data.david    || [], 'badge-david');
  } catch (_) {
    renderError('events-wellyane');
    renderError('events-david');
  }
}

function renderEvents(listId, events, badgeId) {
  const ul    = document.getElementById(listId);
  const badge = document.getElementById(badgeId);

  if (badge) badge.textContent = events.length + ' événements';

  if (!events.length) {
    ul.innerHTML = '<li class="event-empty">Aucun événement à venir</li>';
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in3days = new Date(today.getTime() + 3 * 86400000);

  ul.innerHTML = events.slice(0, 5).map(ev => {
    const d      = new Date(ev.start);
    const soon   = d < in3days ? 'soon' : '';
    const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
    const timeStr = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const loc    = ev.location ? `<div class="event-loc">📍 ${esc(ev.location)}</div>` : '';
    return `<li class="event-item ${soon}">
      <div class="event-date">${esc(dateStr)}<br>${esc(timeStr)}</div>
      <div>
        <div class="event-title">${esc(ev.summary)}</div>
        ${loc}
      </div>
    </li>`;
  }).join('');
}

function renderError(listId) {
  document.getElementById(listId).innerHTML = '<li class="event-empty">Erreur de chargement</li>';
}

loadDashboard();

// ── Chat ─────────────────────────────────────────────────────────────────
const messagesEl = document.getElementById('messages');
const inputEl    = document.getElementById('user-input');
const sendBtn    = document.getElementById('send-btn');
let history = [];

function scrollBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }

function esc(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatMessage(text) {
  // Échapper d'abord, puis convertir le markdown
  let out = esc(text);

  // Liens [texte](url) → bouton cliquable (Doctolib en teal, autres en violet)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
    const isDocto = url.includes('doctolib');
    const cls = isDocto ? 'doctolib-link' : 'inline-link';
    const icon = isDocto ? '🏥 ' : '';
    return `<a href="${url}" target="_blank" class="${cls}">${icon}${label}</a>`;
  });

  // Gras
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Tirets → puces
  out = out.replace(/^- (.+)/gm, '• $1');
  // Sauts de ligne
  out = out.replace(/\n/g, '<br>');

  return out;
}

function addMessage(role, content, isError = false) {
  const wrap   = document.createElement('div');
  wrap.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;

  const avatar = document.createElement('div');
  avatar.className = `message-avatar ${role === 'user' ? 'user-avatar-msg' : 'ai-avatar'}`;
  avatar.textContent = role === 'user' ? 'W' : 'AI';

  const bubble = document.createElement('div');
  if (isError) {
    bubble.className = 'error-bubble';
    bubble.textContent = content;
  } else {
    bubble.className = 'message-bubble';
    bubble.innerHTML = formatMessage(content);
  }

  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  scrollBottom();
}

function showTyping() {
  const wrap   = document.createElement('div');
  wrap.className = 'message ai-message'; wrap.id = 'typing';
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar ai-avatar'; avatar.textContent = 'AI';
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
  wrap.appendChild(avatar); wrap.appendChild(bubble);
  messagesEl.appendChild(wrap); scrollBottom();
}
function hideTyping() { document.getElementById('typing')?.remove(); }

async function sendMessage(text) {
  text = text.trim();
  if (!text) return;

  document.getElementById('quick-actions')?.remove();

  addMessage('user', text);
  history.push({ role: 'user', content: text });
  inputEl.value = '';
  inputEl.style.height = 'auto';
  sendBtn.disabled = true;
  showTyping();

  try {
    const res  = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });
    const data = await res.json();
    hideTyping();

    if (!res.ok || data.error) {
      addMessage('ai', data.message || 'Erreur inconnue', true);
    } else {
      addMessage('ai', data.message);
      history.push({ role: 'assistant', content: data.message });
      if (data.sources) addLogEntry(data.sources);
    }
  } catch (err) {
    hideTyping();
    addMessage('ai', 'Erreur réseau : ' + err.message, true);
  }

  sendBtn.disabled = false;
  inputEl.focus();
}

// ── Console de log ───────────────────────────────────────────────────────
const logEntriesEl = document.getElementById('log-entries');
const ICON_MAP  = { gcal: 'log-icon-gcal', flo: 'log-icon-flo', doctolib: 'log-icon-doctolib' };
const EMOJI_MAP = { gcal: '📅', flo: '🌸', doctolib: '🏥' };

function addLogEntry(sources) {
  const empty = logEntriesEl.querySelector('.log-empty');
  if (empty) empty.remove();

  const now  = new Date();
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const entry = document.createElement('div');
  entry.className = 'log-entry';
  entry.innerHTML = `<div class="log-entry-time">${time}</div>` +
    sources.map(s => `
      <div class="log-item">
        <div class="log-item-icon ${ICON_MAP[s.icon] || ''}">${EMOJI_MAP[s.icon] || '•'}</div>
        <div>
          <div class="log-item-name">${esc(s.name)}</div>
          <div class="log-item-detail">${esc(s.detail)}</div>
        </div>
      </div>`).join('');

  logEntriesEl.prepend(entry);
}

sendBtn.addEventListener('click', () => sendMessage(inputEl.value));
inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(inputEl.value); }
});
inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 130) + 'px';
});
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => sendMessage(btn.dataset.text));
});
