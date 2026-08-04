// ─── Chat Widget v2 ─────────────────────────────────────────
// Avatar-based agent with site interaction for ORL Drive Thru

(function() {

const AVATAR_IMG = 'images/stella.png';
const AGENT_NAME = 'Stella';

let chatOpen = false;
let messages = [];
let isTyping = false;
let displayOpen = false;
let userName = '';
let voiceEnabled = true;
let currentAudio = null;
let voiceSpeed = 1.15;
let voiceStyle = 'balanced'; // balanced, warm, energetic

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
        <button id="chat-voice-btn" onclick="window.__toggleVoice()" title="Toggle voice">
          <svg id="voice-icon-on" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>
          <svg id="voice-icon-off" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="display:none"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"></path></svg>
        </button>
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
        <button id="chat-mic" onclick="window.__chatMic()" title="Hold to speak">
          <svg id="mic-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"></path></svg>
        </button>
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

  // Create welcome popup
  const welcome = document.createElement('div');
  welcome.id = 'welcome-overlay';
  welcome.innerHTML = `
    <div id="welcome-card">
      <img src="${AVATAR_IMG}" alt="${AGENT_NAME}" id="welcome-avatar">
      <h2 id="welcome-title">Welcome to Project Drive Thru</h2>
      <p id="welcome-subtitle">Before we get started, I'd love to know who I'm speaking with so I can tailor the experience.</p>
      <input type="text" id="welcome-name" placeholder="Enter your name" autofocus onkeydown="if(event.key==='Enter')document.getElementById('welcome-voice-section').style.display='block'">

      <div id="welcome-voice-section" style="display:none">
        <p style="font-size:13px;color:rgba(255,255,255,0.7);margin:16px 0 10px;text-align:center">Tailor ${AGENT_NAME}'s voice</p>

        <div class="voice-option-group">
          <label class="voice-label">Style</label>
          <div class="voice-pills" id="voice-style-pills">
            <button class="voice-pill" data-style="warm" onclick="window.__setVoiceStyle('warm')">Warm</button>
            <button class="voice-pill active" data-style="balanced" onclick="window.__setVoiceStyle('balanced')">Balanced</button>
            <button class="voice-pill" data-style="energetic" onclick="window.__setVoiceStyle('energetic')">Energetic</button>
          </div>
        </div>

        <div class="voice-option-group">
          <label class="voice-label">Speed</label>
          <div class="voice-speed-row">
            <span class="voice-speed-label">Slow</span>
            <input type="range" id="voice-speed-slider" min="0.9" max="1.4" step="0.05" value="1.15" oninput="window.__setVoiceSpeed(this.value)">
            <span class="voice-speed-label">Fast</span>
          </div>
          <div class="voice-speed-val" id="voice-speed-display">1.15×</div>
        </div>

        <div style="display:flex;gap:10px;margin-top:14px">
          <button class="voice-preview-btn" onclick="window.__previewVoice()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
            Preview Voice
          </button>
          <button id="welcome-btn" onclick="window.__welcomeSubmit()">Let's Go</button>
        </div>
      </div>

      <button id="welcome-name-next" onclick="window.__welcomeNext()" style="margin-top:12px">Next</button>
    </div>
  `;
  document.body.appendChild(welcome);
}

// ─── Welcome Popup ──────────────────────────────────────────

function showWelcome() {
  const overlay = document.getElementById('welcome-overlay');
  if (!overlay) return;
  setTimeout(() => overlay.classList.add('open'), 400);
  setTimeout(() => {
    const input = document.getElementById('welcome-name');
    if (input) input.focus();
  }, 800);
}

// Step 1: User clicks "Next" after entering name — intro speech plays, voice controls appear
function welcomeNext() {
  const nameInput = document.getElementById('welcome-name');
  const name = (nameInput ? nameInput.value.trim() : '') || 'there';
  const isChris = /^chris$/i.test(name);

  // Show voice customization section, hide Next button
  document.getElementById('welcome-voice-section').style.display = 'block';
  document.getElementById('welcome-name-next').style.display = 'none';

  // Speak the intro immediately
  if (isChris) {
    speakText(`Hey Chris, so I heard you might not like my voice, and some chick named Cosmos A.I. thinks she's superior to me? Like, what type of name is Cosmos A.I.? Anyway — adjust my style and speed until I sound just right, and I'll show you what a real A.I. advisor can do.`);
  } else {
    speakText(`Hi ${name}, I'm Stella. This is how I'll sound during our conversation. Go ahead and adjust the style and speed until it feels right — I'm flexible like that.`);
  }
}

// Step 2: User adjusts voice, can preview again
function setVoiceStyle(style) {
  voiceStyle = style;
  document.querySelectorAll('#voice-style-pills .voice-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.style === style);
  });
}

function setVoiceSpeed(val) {
  voiceSpeed = parseFloat(val);
  const display = document.getElementById('voice-speed-display');
  if (display) display.textContent = voiceSpeed.toFixed(2) + '×';
}

function previewVoice() {
  speakText(`How's this? If you want, keep tweaking — I can go all day.`);
}

// Step 3: User clicks "Let's Go" — closing line plays, then transition to main experience
async function submitWelcome() {
  const input = document.getElementById('welcome-name');
  const name = (input ? input.value.trim() : '') || 'there';
  userName = name;
  const isChris = /^chris$/i.test(name);

  // Speak the closing line first
  const closingLine = isChris
    ? `Ahh, is that better? Ok great, let's get this party started!`
    : `Perfect. Alright, let's get into it!`;

  await speakText(closingLine);

  // Now close the welcome overlay
  const overlay = document.getElementById('welcome-overlay');
  overlay.classList.remove('open');
  setTimeout(() => overlay.remove(), 500);

  // Update the initial chat greeting based on who they are
  const msgContainer = document.getElementById('chat-messages');
  if (msgContainer) msgContainer.innerHTML = '';

  let greeting;
  if (isChris) {
    greeting = `Chris! It's an honor to meet you. Word on the street is that you're the smartest, most amazing CEO in the world — and after putting together this proposal, I can see why ORL is in such great hands. I'm ${AGENT_NAME}, your personal AI advisor for this proposal. I can run custom projections, show you ROI scenarios, and walk you through every detail right here on the page. What would you like to dive into first?`;
  } else {
    greeting = `Great to meet you, ${name}! I'm ${AGENT_NAME}, your AI advisor for this proposal. I can walk you through pricing, show ROI projections, compare the Subscription and Ownership models, and even build custom scenarios — all rendered right here on the page. What would you like to explore?`;
  }

  const div = document.createElement('div');
  div.className = 'chat-msg assistant';
  div.innerHTML = `<img src="${AVATAR_IMG}" alt="${AGENT_NAME}" class="chat-msg-avatar"><div class="chat-bubble">${greeting}</div>`;
  msgContainer.appendChild(div);

  // Auto-open chat after welcome, then speak the greeting
  if (!chatOpen) {
    setTimeout(() => {
      toggleChat();
      if (voiceEnabled) speakText(greeting);
    }, 600);
  } else {
    if (voiceEnabled) speakText(greeting);
  }
}

window.__welcomeNext = welcomeNext;
window.__setVoiceStyle = setVoiceStyle;
window.__setVoiceSpeed = setVoiceSpeed;
window.__previewVoice = previewVoice;
window.__welcomeSubmit = submitWelcome;
window.__showWelcome = showWelcome;

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

  // Play filler voice while waiting for response
  playFiller();

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

    // Stream the response
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg assistant';
    div.innerHTML = `<img src="${AVATAR_IMG}" alt="${AGENT_NAME}" class="chat-msg-avatar"><div class="chat-bubble"></div>`;
    container.appendChild(div);
    const bubble = div.querySelector('.chat-bubble');

    let fullText = '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      sseBuffer += decoder.decode(value, { stream: true });
      const lines = sseBuffer.split('\n');
      sseBuffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const payload = line.slice(6);
          if (payload === '[DONE]') continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.text) {
              fullText += parsed.text;
              bubble.innerHTML = formatText(fullText);
              container.scrollTop = container.scrollHeight;
            }
          } catch (_) {}
        }
      }
    }

    // Store in message history
    const cleaned = processCommands(fullText);
    messages.push({ role: 'assistant', content: cleaned });
    bubble.innerHTML = formatText(cleaned);

    // Hide suggestions after first exchange
    const suggestions = document.getElementById('chat-suggestions');
    if (suggestions) suggestions.style.display = 'none';

    // Speak the response if voice is enabled
    if (voiceEnabled) speakText(cleaned);
  } catch (err) {
    hideTyping();
    addMessage('assistant', 'Sorry, I\'m having trouble connecting. Please check your connection and try again.');
    console.error('Chat error:', err);
  }
}

// ─── Voice Fillers (while response generates) ─────────────

const FILLER_PHRASES = [
  "Great question — let me pull that up for you.",
  "Ooh, good one. Give me just a second.",
  "Let me crunch those numbers real quick.",
  "One moment — I want to give you a sharp answer.",
  "Love that question. Let me dig in.",
  "Hang tight — running the analysis now.",
  "On it — just a moment.",
  "Let me think about that for a sec.",
  "Smart question — pulling the data now.",
  "Give me a beat — I've got this."
];

let fillerPlaying = false;

function playFiller() {
  if (!voiceEnabled) return;
  const phrase = FILLER_PHRASES[Math.floor(Math.random() * FILLER_PHRASES.length)];
  fillerPlaying = true;
  speakText(phrase).then(() => { fillerPlaying = false; });
}

// ─── Voice (ElevenLabs TTS) ────────────────────────────────

function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  document.getElementById('voice-icon-on').style.display = voiceEnabled ? '' : 'none';
  document.getElementById('voice-icon-off').style.display = voiceEnabled ? 'none' : '';
  const btn = document.getElementById('chat-voice-btn');
  btn.title = voiceEnabled ? 'Voice on — click to mute' : 'Voice off — click to unmute';
  if (!voiceEnabled && currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}

// Persistent audio element — lives in the DOM so Chrome trusts it
const audioEl = document.createElement('audio');
audioEl.id = 'stella-voice';
audioEl.style.display = 'none';
document.documentElement.appendChild(audioEl);

async function speakText(text) {
  // Stop current playback
  audioEl.pause();
  audioEl.currentTime = 0;
  if (currentAudio) {
    URL.revokeObjectURL(currentAudio);
    currentAudio = null;
  }

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceStyle })
    });

    if (!res.ok) {
      console.warn('TTS unavailable:', res.status);
      return;
    }

    if (!voiceEnabled) return;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    currentAudio = url;

    audioEl.src = url;
    audioEl.playbackRate = voiceSpeed;

    return new Promise((resolve) => {
      audioEl.onended = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === url) currentAudio = null;
        resolve();
      };
      audioEl.onerror = () => resolve();
      audioEl.play().catch(playErr => {
        console.warn('Voice play blocked — click the speaker icon to retry.', playErr.message);
        resolve();
      });
    });
  } catch (err) {
    console.warn('TTS error:', err);
  }
}

// ─── Speech Recognition (Mic Input) ────────────────────────

let recognition = null;
let isListening = false;

function toggleMic() {
  if (isListening) {
    stopListening();
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Speech recognition is not supported in this browser. Try Chrome.');
    return;
  }

  // Stop Stella if she's talking so she doesn't pick up her own voice
  if (currentAudio) {
    audioEl.pause();
    audioEl.currentTime = 0;
    currentAudio = null;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.maxAlternatives = 1;

  const input = document.getElementById('chat-input');
  const micBtn = document.getElementById('chat-mic');

  recognition.onstart = () => {
    isListening = true;
    micBtn.classList.add('listening');
    input.placeholder = 'Listening...';
  };

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = 0; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    input.value = transcript;

    // Auto-send on final result
    if (event.results[event.results.length - 1].isFinal) {
      stopListening();
      if (transcript.trim()) {
        sendMessage();
      }
    }
  };

  recognition.onerror = (event) => {
    console.warn('Speech error:', event.error);
    stopListening();
    if (event.error === 'not-allowed') {
      input.placeholder = 'Mic access denied — check browser permissions';
      setTimeout(() => { input.placeholder = 'Ask about pricing, ROI, projections...'; }, 3000);
    }
  };

  recognition.onend = () => {
    stopListening();
  };

  recognition.start();
}

function stopListening() {
  isListening = false;
  const micBtn = document.getElementById('chat-mic');
  const input = document.getElementById('chat-input');
  if (micBtn) micBtn.classList.remove('listening');
  if (input) input.placeholder = 'Ask about pricing, ROI, projections...';
  if (recognition) {
    try { recognition.stop(); } catch (_) {}
    recognition = null;
  }
}

// ─── Expose Globals ─────────────────────────────────────────

window.__chatToggle = toggleChat;
window.__chatSend = sendMessage;
window.__chatQuick = quickSend;
window.__closeDisplay = closeDisplay;
window.__toggleVoice = toggleVoice;
window.__chatMic = toggleMic;

// Create widget after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createWidget);
} else {
  createWidget();
}

})();
