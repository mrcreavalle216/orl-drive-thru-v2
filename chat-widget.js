// ─── Chat Widget v2 ─────────────────────────────────────────
// Avatar-based agent with site interaction for ORL Drive Thru

(function() {

const AVATAR_IMG = 'images/stella.png';
const AGENT_NAME = 'Stella';

let chatOpen = false;
let messages = [];
let isTyping = false;
let displayOpen = false;

// ─── Create Widget ──────────────────────────────────────────

function createWidget() {
  const widget = document.createElement('div');
  widget.id = 'chat-widget';
  widget.innerHTML = `
    <button id="chat-fab" onclick="window.__chatToggle()" title="Ask ${AGENT_NAME}">
      <img id="chat-fab-avatar" src="${AVATAR_IMG}" alt="${AGENT_NAME}">
      <div id="chat-fab-pulse"></div>
      <div id="chat-fab-badge" style="display:none">1</div>
    </button>
    <div id="chat-panel">
      <div id="chat-header">
        <div id="chat-header-title">
          <img src="${AVATAR_IMG}" alt="${AGENT_NAME}" class="chat-header-img">
          <div>
            <div style="font-weight:700;font-size:14px">${AGENT_NAME}</div>
            <div style="font-size:11px;opacity:0.6">AI Advisor &bull; Ask me anything about this proposal</div>
          </div>
        </div>
        <button id="chat-close-btn" onclick="window.__chatToggle()" title="Close">&times;</button>
      </div>
      <div id="chat-messages">
        <div class="chat-msg assistant">
          <img src="${AVATAR_IMG}" alt="${AGENT_NAME}" class="chat-msg-avatar">
          <div class="chat-bubble">Hi! I'm ${AGENT_NAME}, your AI advisor for this proposal. I can walk you through pricing, show ROI projections, compare models side-by-side, and even build custom scenarios right on the page. What would you like to explore?</div>
        </div>
      </div>
      <div id="chat-suggestions">
        <button class="chat-suggest" onclick="window.__chatQuick('Show me a 5-year cost comparison')">5-Year Comparison</button>
        <button class="chat-suggest" onclick="window.__chatQuick('What\\'s the ROI on subscription?')">ROI Analysis</button>
        <button class="chat-suggest" onclick="window.__chatQuick('Compare the two models')">Compare Models</button>
      </div>
      <div id="chat-input-area">
        <input type="text" id="chat-input" placeholder="Ask about pricing, ROI, projections..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window.__chatSend()}">
        <button id="chat-send" onclick="window.__chatSend()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(widget);

  // Create the display panel (for tables/charts rendered on the page)
  const display = document.createElement('div');
  display.id = 'agent-display';
  display.innerHTML = `
    <div id="agent-display-header">
      <div id="agent-display-title">
        <img src="${AVATAR_IMG}" alt="${AGENT_NAME}" class="chat-header-img">
        <span>${AGENT_NAME}'s Analysis</span>
      </div>
      <button id="agent-display-close" onclick="window.__closeDisplay()">&times;</button>
    </div>
    <div id="agent-display-content"></div>
  `;
  document.body.appendChild(display);
}

// ─── Toggle Chat ────────────────────────────────────────────

function toggleChat() {
  chatOpen = !chatOpen;
  const panel = document.getElementById('chat-panel');
  const fab = document.getElementById('chat-fab');
  const badge = document.getElementById('chat-fab-badge');

  if (chatOpen) {
    panel.classList.add('open');
    fab.classList.add('active');
    badge.style.display = 'none';
    setTimeout(() => document.getElementById('chat-input').focus(), 300);
  } else {
    panel.classList.remove('open');
    fab.classList.remove('active');
  }
}

// ─── Quick Suggestion ───────────────────────────────────────

function quickSend(text) {
  if (!chatOpen) toggleChat();
  setTimeout(() => {
    document.getElementById('chat-input').value = text;
    sendMessage();
  }, 300);
}

// ─── Add Message ────────────────────────────────────────────

function addMessage(role, text) {
  messages.push({ role, content: text });
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}`;

  if (role === 'assistant') {
    div.innerHTML = `<img src="${AVATAR_IMG}" alt="${AGENT_NAME}" class="chat-msg-avatar"><div class="chat-bubble">${formatText(text)}</div>`;
  } else {
    div.innerHTML = `<div class="chat-bubble">${formatText(text)}</div>`;
  }

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;

  // Hide suggestions after first user message
  const suggestions = document.getElementById('chat-suggestions');
  if (role === 'user' && suggestions) {
    suggestions.style.display = 'none';
  }
}

// ─── Process Agent Commands ─────────────────────────────────
// Commands embedded in responses: {{SWITCH_TAB:sub}}, {{SCROLL_TO:#id}}, {{HIGHLIGHT:#id}}

function processCommands(text) {
  let cleaned = text;
  const commands = [];

  // Extract {{SWITCH_TAB:xxx}}
  cleaned = cleaned.replace(/\{\{SWITCH_TAB:(\w+)\}\}/g, (_, tab) => {
    commands.push({ type: 'switchTab', tab });
    return '';
  });

  // Extract {{SCROLL_TO:#xxx}}
  cleaned = cleaned.replace(/\{\{SCROLL_TO:(#[\w-]+)\}\}/g, (_, selector) => {
    commands.push({ type: 'scrollTo', selector });
    return '';
  });

  // Extract {{HIGHLIGHT:#xxx}}
  cleaned = cleaned.replace(/\{\{HIGHLIGHT:(#[\w-]+)\}\}/g, (_, selector) => {
    commands.push({ type: 'highlight', selector });
    return '';
  });

  // Extract display tables: {{DISPLAY}}...{{/DISPLAY}}
  cleaned = cleaned.replace(/\{\{DISPLAY\}\}([\s\S]*?)\{\{\/DISPLAY\}\}/g, (_, content) => {
    commands.push({ type: 'display', content: content.trim() });
    return '';
  });

  // Execute commands
  commands.forEach(cmd => {
    switch (cmd.type) {
      case 'switchTab':
        if (typeof switchTab === 'function') {
          switchTab(cmd.tab);
        }
        break;
      case 'scrollTo':
        const scrollEl = document.querySelector(cmd.selector);
        if (scrollEl) {
          scrollEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        break;
      case 'highlight':
        const hlEl = document.querySelector(cmd.selector);
        if (hlEl) {
          hlEl.classList.add('agent-highlight');
          setTimeout(() => hlEl.classList.remove('agent-highlight'), 3000);
        }
        break;
      case 'display':
        showDisplay(cmd.content);
        break;
    }
  });

  return cleaned.trim();
}

// ─── Display Panel (renders tables on the page) ─────────────

function showDisplay(content) {
  const panel = document.getElementById('agent-display');
  const container = document.getElementById('agent-display-content');
  container.innerHTML = formatDisplayContent(content);
  panel.classList.add('open');
  displayOpen = true;
}

function closeDisplay() {
  const panel = document.getElementById('agent-display');
  panel.classList.remove('open');
  displayOpen = false;
}

function formatDisplayContent(text) {
  const lines = text.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].includes('|') && i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i + 1].trim())) {
      const headers = lines[i].split('|').filter(c => c.trim()).map(c => c.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && !/^\|[\s\-:|]+\|$/.test(lines[i].trim())) {
        rows.push(lines[i].split('|').filter(c => c.trim()).map(c => c.trim()));
        i++;
      }
      let table = '<table class="display-table"><thead><tr>';
      headers.forEach(h => { table += `<th>${inlineFormat(h)}</th>`; });
      table += '</tr></thead><tbody>';
      rows.forEach((row, ri) => {
        const isLast = ri === rows.length - 1 && row.some(c => /total|net/i.test(c));
        table += `<tr class="${isLast ? 'total-row' : ''}">`;
        row.forEach(cell => { table += `<td>${inlineFormat(cell)}</td>`; });
        table += '</tr>';
      });
      table += '</tbody></table>';
      result.push(table);
    } else if (lines[i].startsWith('###')) {
      result.push(`<h3 class="display-heading">${inlineFormat(lines[i].replace(/^###\s*/, ''))}</h3>`);
      i++;
    } else if (lines[i].startsWith('##')) {
      result.push(`<h2 class="display-heading">${inlineFormat(lines[i].replace(/^##\s*/, ''))}</h2>`);
      i++;
    } else if (lines[i].trim()) {
      result.push(`<p>${inlineFormat(lines[i])}</p>`);
      i++;
    } else {
      i++;
    }
  }
  return result.join('');
}

// ─── Format Text (chat bubbles) ────────────────────────────

function formatText(text) {
  const lines = text.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].includes('|') && i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i + 1].trim())) {
      const headers = lines[i].split('|').filter(c => c.trim()).map(c => c.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes('|') && !/^\|[\s\-:|]+\|$/.test(lines[i].trim())) {
        rows.push(lines[i].split('|').filter(c => c.trim()).map(c => c.trim()));
        i++;
      }
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

// ─── Typing Indicator ───────────────────────────────────────

function showTyping() {
  isTyping = true;
  const container = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.id = 'chat-typing';
  div.className = 'chat-msg assistant';
  div.innerHTML = `<img src="${AVATAR_IMG}" alt="${AGENT_NAME}" class="chat-msg-avatar"><div class="chat-bubble typing"><span></span><span></span><span></span></div>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function hideTyping() {
  isTyping = false;
  const el = document.getElementById('chat-typing');
  if (el) el.remove();
}

// ─── Send Message ───────────────────────────────────────────

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
    let reply = data.content || data.message || 'Sorry, I couldn\'t process that.';

    // Process commands (tab switches, scrolls, display panels)
    reply = processCommands(reply);

    addMessage('assistant', reply);
  } catch (err) {
    hideTyping();
    addMessage('assistant', 'Sorry, I\'m having trouble connecting. Please check your connection and try again.');
    console.error('Chat error:', err);
  }
}

// ─── Expose Globals ─────────────────────────────────────────

window.__chatToggle = toggleChat;
window.__chatSend = sendMessage;
window.__chatQuick = quickSend;
window.__closeDisplay = closeDisplay;

// Create widget after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createWidget);
} else {
  createWidget();
}

})();
