// LifeSync — frontend chat

const messagesEl = document.getElementById('messages');
const inputEl    = document.getElementById('user-input');
const sendBtn    = document.getElementById('send-btn');

// Historique de conversation (envoyé à Claude à chaque tour)
let history = [];

// ─── Utilitaires DOM ──────────────────────────────────────────────────────

function scrollBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Formatage minimal du markdown (bold, bullet points, sauts de ligne)
function formatMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/^•\s/gm, '• ')
    .replace(/\n/g, '<br>');
}

function addMessage(role, content, isError = false) {
  const wrap = document.createElement('div');
  wrap.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;

  const avatar = document.createElement('div');
  avatar.className = `message-avatar ${role === 'user' ? 'user-avatar-msg' : 'ai-avatar'}`;
  avatar.textContent = role === 'user' ? 'Moi' : 'AI';

  const bubble = document.createElement('div');

  if (isError) {
    bubble.className = 'error-bubble';
    bubble.innerHTML = `⚠️ ${esc(content)}`;
  } else {
    bubble.className = 'message-bubble';
    bubble.innerHTML = formatMarkdown(esc(content)
      .replace(/&lt;br&gt;/g, '<br>')
      .replace(/&lt;strong&gt;/g, '<strong>')
      .replace(/&lt;\/strong&gt;/g, '</strong>')
    );
    // Re-appliquer le formatage correctement
    bubble.innerHTML = formatMarkdown(content);
  }

  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  scrollBottom();
  return wrap;
}

function showTyping() {
  const wrap = document.createElement('div');
  wrap.className = 'message ai-message';
  wrap.id = 'typing-indicator';

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar ai-avatar';
  avatar.textContent = 'AI';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.innerHTML = `
    <div class="typing-indicator">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;

  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  scrollBottom();
}

function hideTyping() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

// ─── Envoi d'un message ───────────────────────────────────────────────────

async function sendMessage(text) {
  text = text.trim();
  if (!text) return;

  // Masquer les boutons rapides après le premier envoi
  const quickActions = document.getElementById('quick-actions');
  if (quickActions) quickActions.style.display = 'none';

  // Afficher le message utilisateur
  addMessage('user', text);
  history.push({ role: 'user', content: text });

  // Vider l'input
  inputEl.value = '';
  inputEl.style.height = 'auto';
  sendBtn.disabled = true;

  // Afficher le loader
  showTyping();

  try {
    const res = await fetch('/api/chat', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify({ messages: history }),
    });

    const data = await res.json();
    hideTyping();

    if (!res.ok || data.error) {
      const msg = data.message || 'Erreur inconnue';
      addMessage('ai', `Erreur Claude : ${msg}`, true);
    } else {
      addMessage('ai', data.message);
      history.push({ role: 'assistant', content: data.message });
    }
  } catch (err) {
    hideTyping();
    addMessage('ai', `Erreur réseau : ${err.message}\nVérifiez votre connexion et votre clé API.`, true);
  }

  sendBtn.disabled = false;
  inputEl.focus();
}

// ─── Événements ───────────────────────────────────────────────────────────

sendBtn.addEventListener('click', () => sendMessage(inputEl.value));

inputEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage(inputEl.value);
  }
});

// Auto-resize textarea
inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + 'px';
});

// Boutons rapides
document.querySelectorAll('.quick-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    sendMessage(btn.dataset.text);
  });
});
