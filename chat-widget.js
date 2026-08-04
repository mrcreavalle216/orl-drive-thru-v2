// ─── Chat Widget ────────────────────────────────────────────
// Floating chat agent for ORL Drive Thru

(function() {

let chatOpen = false;
let messages = [];
let isTyping = false;

function createWidget() {
  const widget = document.createElement('div');
  widget.id = 'chat-widget';
  widget.innerHTML = `
    <button id="chat-fab" onclick="window.__chatToggle()" title="Ask a question">
      <svg id="chat-fab-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
      <svg id="chat-fab-close" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </button>
    <div id="chat-panel">
      <div id="chat-header">
        <div id="chat-header-title">
          <div id="chat-avatar">AI</div>
          <div>
            <div style="font-weight:700;font-size:14px">Drive Thru Assistant</div>
            <div style="font-size:11px;opacity:0.6">Ask about pricing, features, or models</div>
          </div>
        </div>
      </div>
      <div id="chat-messages">
        <div class="chat-msg assistant">
          <div class="chat-bubble">Hi! I can help you understand the two investment models in this proposal. What would you like to know?</div>
        </div>
      </div>
      <div id="chat-input-area">
        <input type="text" id="chat-input" placeholder="Ask a question..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.__chatSend()}">
        <button id="chat-send" onclick="window.__chatSend()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(widget);
}

function toggleChat() {
  chatOpen = !chatOpen;
  const panel = document.getElementById('chat-panel');
  const iconOpen = document.getElementById('chat-fab-icon');
  const iconClose = document.getElementById('chat-fab-close');

  if (chatOpen) {
    panel.classList.add('open');
    iconOpen.style.display = 'none';
    iconClose.style.display = '';
    document.getElementById('chat-input').focus();
  } else {
    panel.classList.remove('open');
    iconOpen.style.display = '';
    iconClose.style.display = 'none';
  }
}

function addMessage(role, text) {
  messages.push({ role, content: text });
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;
  div.innerHTML = `<div class="chat-bubble">${formatText(text)}</div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function formatText(text) {
  // Split into lines and detect markdown tables
  const lines = text.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    // Detect markdown table: line with | and next line is separator (|---|)
    if (lines[i].includes('|') && i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i + 1].trim())) {
      // Parse header
      const headers = lines[i].split('|').filter(c => c.trim()).map(c => c.trim());
      i += 2; // skip header + separator

      // Parse rows
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && !/^\|[\s\-:|]+\|$/.test(lines[i].trim())) {
        const cells = lines[i].split('|').filter(c => c.trim()).map(c => c.trim());
        rows.push(cells);
        i++;
      }

      // Build HTML table
      let table = '<table class="chat-table"><thead><tr>';
      headers.forEach(h => { table += `<th>${inlineFormat(h)}</th>`; });
      table += '</tr></thead><tbody>';
      rows.forEach(row => {
        table += '<tr>';
        row.forEach(cell => { table += `<td>${inlineFormat(cell)}</td>`; });
        table += '</tr>';
      });
      table += '</tbody></table>';
      result.push(table);
    } else {
      result.push(inlineFormat(lines[i]));
      i++;
    }
  }

  return result.join('<br>');
}

function inlineFormat(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:rgba(100,180,255,0.1);padding:1px 4px;border-radius:3px;font-size:12px">$1</code>');
}

function showTyping() {
  isTyping = true;
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.id = 'chat-typing';
  div.className = 'chat-msg assistant';
  div.innerHTML = `<div class="chat-bubble typing"><span></span><span></span><span></span></div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function hideTyping() {
  isTyping = false;
  const el = document.getElementById('chat-typing');
  if (el) el.remove();
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text || isTyping) return;

  input.value = '';
  addMessage('user', text);
  showTyping();

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      })
    });

    hideTyping();

    if (!res.ok) {
      const err = await res.text();
      addMessage('assistant', 'Sorry, I\'m having trouble connecting right now. Please try again in a moment.');
      console.error('Chat API error:', err);
      return;
    }

    const data = await res.json();
    const reply = data.content || data.message || 'Sorry, I couldn\'t process that.';
    addMessage('assistant', reply);
  } catch (err) {
    hideTyping();
    addMessage('assistant', 'Sorry, I\'m having trouble connecting. Please check your connection and try again.');
    console.error('Chat error:', err);
  }
}

window.__chatToggle = toggleChat;
window.__chatSend = sendMessage;

// Create widget after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createWidget);
} else {
  createWidget();
}

})();
