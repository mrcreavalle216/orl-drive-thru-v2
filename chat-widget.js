// ─── Chat Widget v2 ─────────────────────────────────────────
// Avatar-based agent with site interaction for ORL Drive Thru
// Features: voice TTS, mic input, display panel, speaking indicator,
// stop-on-input, chat persistence, dynamic suggestions, scroll
// reactions, copy recap, sound design, guided tour integration

(function() {

const AVATAR_IMG = 'images/stella.png';
const AGENT_NAME = 'Stella';

// ─── State ─────────────────────────────────────────────────
let chatOpen = false;
let messages = [];
let isTyping = false;
let displayOpen = false;
let userName = '';
let voiceEnabled = true;
let currentAudio = null;
let voiceSpeed = 1.15;
let voiceStyle = 'balanced'; // balanced, warm, energetic
let isSpeaking = false;
let scrollReactedSections = new Set();

// ─── Sound Design (Web Audio API) ──────────────────────────

let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playSound(type) {
  try {
    const ctx = getAudioCtx();
    if (type === 'open') {
      // Chat open: soft ascending chime
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.08, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      g.connect(ctx.destination);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(523, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.15);
      o.connect(g);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.4);
    } else if (type === 'send') {
      // Message send: soft pop
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.1, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      g.connect(ctx.destination);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.08);
      o.connect(g);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.15);
    } else if (type === 'display') {
      // Display panel: resonant tone with harmonic
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.06, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      g.connect(ctx.destination);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(440, ctx.currentTime);
      o.connect(g);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.6);
      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.03, ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      g2.connect(ctx.destination);
      const o2 = ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.setValueAtTime(660, ctx.currentTime);
      o2.connect(g2);
      o2.start(ctx.currentTime);
      o2.stop(ctx.currentTime + 0.5);
    } else if (type === 'notification') {
      // Scroll reaction: gentle ding
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.06, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      g.connect(ctx.destination);
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(698, ctx.currentTime);
      o.connect(g);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {}
}

// ─── Stop Speaking Helper ──────────────────────────────────

function stopSpeaking() {
  if (currentAudio) {
    audioEl.pause();
    audioEl.currentTime = 0;
    URL.revokeObjectURL(currentAudio);
    currentAudio = null;
  }
  isSpeaking = false;
  const fab = document.getElementById('chat-fab');
  if (fab) fab.classList.remove('speaking');
}

// ─── Chat History Persistence ──────────────────────────────

function saveHistory() {
  try {
    sessionStorage.setItem('stella-chat-history', JSON.stringify(messages));
    sessionStorage.setItem('stella-chat-user', userName);
  } catch (e) {}
}

function loadHistory() {
  try {
    const saved = sessionStorage.getItem('stella-chat-history');
    const savedUser = sessionStorage.getItem('stella-chat-user');
    if (saved) {
      messages = JSON.parse(saved);
      if (savedUser) userName = savedUser;
      return true;
    }
  } catch (e) {}
  return false;
}

function clearHistory() {
  messages = [];
  try {
    sessionStorage.removeItem('stella-chat-history');
    sessionStorage.removeItem('stella-chat-user');
  } catch (e) {}
}

function rebuildChatFromHistory() {
  const container = document.getElementById('chat-messages');
  if (!container || messages.length === 0) return;
  container.innerHTML = '';
  messages.forEach(m => {
    const div = document.createElement('div');
    div.className = `chat-msg ${m.role}`;
    if (m.role === 'assistant') {
      div.innerHTML = `<img src="${AVATAR_IMG}" alt="${AGENT_NAME}" class="chat-msg-avatar"><div class="chat-bubble">${formatText(m.content)}</div>`;
    } else {
      div.innerHTML = `<div class="chat-bubble">${formatText(m.content)}</div>`;
    }
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
  const suggestions = document.getElementById('chat-suggestions');
  if (suggestions) suggestions.style.display = 'none';
}

// ─── Create Widget ──────────────────────────────────────────

function createWidget() {
  const widget = document.createElement('div');
  widget.id = 'chat-widget';
  widget.innerHTML = `
    <div id="stella-scroll-bubble" class="scroll-bubble"></div>
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
        <button id="chat-recap-btn" onclick="window.__copyRecap()" title="Copy conversation recap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
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
      <div id="chat-dynamic-suggestions"></div>
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

  // Create backdrop for display panel
  const backdrop = document.createElement('div');
  backdrop.id = 'agent-display-backdrop';
  backdrop.onclick = () => window.__closeDisplay();
  document.body.appendChild(backdrop);

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

  // Toast notification
  const toast = document.createElement('div');
  toast.id = 'stella-toast';
  document.body.appendChild(toast);

  // Create welcome popup
  const welcome = document.createElement('div');
  welcome.id = 'welcome-overlay';
  welcome.innerHTML = `
    <div id="welcome-card">

      <!-- SCREEN 1: Name entry -->
      <div id="welcome-screen-1">
        <img src="${AVATAR_IMG}" alt="${AGENT_NAME}" id="welcome-avatar">
        <h2 id="welcome-title">Welcome to Project Drive Thru</h2>
        <p id="welcome-subtitle">Before we get started, I'd love to know who I'm speaking with so I can tailor the experience.</p>
        <input type="text" id="welcome-name" placeholder="Enter your name" autofocus onkeydown="if(event.key==='Enter')window.__welcomeNext()">
        <button onclick="window.__welcomeNext()" style="display:block;width:100%;padding:16px 24px;font-size:16px;font-weight:700;background:linear-gradient(135deg,#3282b8,#5cb8ff);color:#fff;border:none;border-radius:14px;cursor:pointer;font-family:inherit;transition:all 0.25s;box-shadow:0 4px 24px rgba(50,130,184,0.35);letter-spacing:0.3px;margin-top:16px;text-align:center;-webkit-appearance:none;appearance:none">Next</button>
      </div>

      <!-- SCREEN 2: Voice customization -->
      <div id="welcome-screen-2" style="display:none">
        <img src="${AVATAR_IMG}" alt="${AGENT_NAME}" id="welcome-avatar-2" style="width:100px;height:100px;border-radius:50%;object-fit:cover;object-position:top;border:3px solid rgba(100,180,255,0.4);box-shadow:0 0 40px rgba(100,180,255,0.2);margin:0 auto 20px;display:block">
        <h2 style="font-size:22px;font-weight:800;color:#fff;margin-bottom:8px;letter-spacing:-0.3px">Tailor ${AGENT_NAME}'s Voice</h2>
        <p style="font-size:14px;color:rgba(200,210,230,0.6);margin-bottom:24px;line-height:1.5">Adjust how I sound — pick a style and speed, then preview.</p>

        <div style="margin:16px 0;text-align:left">
          <label style="font-size:12px;text-transform:uppercase;letter-spacing:1.2px;color:rgba(200,210,230,0.5);font-weight:600;display:block;margin-bottom:10px;text-align:center">Style</label>
          <div id="voice-style-pills" style="display:flex;gap:8px">
            <button data-style="warm" onclick="window.__setVoiceStyle('warm')" style="flex:1;padding:12px 14px;font-size:14px;font-weight:700;background:rgba(255,255,255,0.04);border:1.5px solid rgba(100,180,255,0.15);border-radius:12px;color:rgba(200,210,230,0.5);cursor:pointer;font-family:inherit;transition:all 0.25s;-webkit-appearance:none;appearance:none;text-align:center;letter-spacing:0.3px" class="voice-pill">Warm</button>
            <button data-style="balanced" onclick="window.__setVoiceStyle('balanced')" style="flex:1;padding:12px 14px;font-size:14px;font-weight:700;background:linear-gradient(135deg,rgba(50,130,184,0.25),rgba(92,184,255,0.15));border:1.5px solid rgba(100,180,255,0.5);border-radius:12px;color:#fff;cursor:pointer;font-family:inherit;transition:all 0.25s;-webkit-appearance:none;appearance:none;text-align:center;letter-spacing:0.3px;box-shadow:0 0 20px rgba(100,180,255,0.15),inset 0 0 12px rgba(100,180,255,0.08)" class="voice-pill active">Balanced</button>
            <button data-style="energetic" onclick="window.__setVoiceStyle('energetic')" style="flex:1;padding:12px 14px;font-size:14px;font-weight:700;background:rgba(255,255,255,0.04);border:1.5px solid rgba(100,180,255,0.15);border-radius:12px;color:rgba(200,210,230,0.5);cursor:pointer;font-family:inherit;transition:all 0.25s;-webkit-appearance:none;appearance:none;text-align:center;letter-spacing:0.3px" class="voice-pill">Energetic</button>
          </div>
        </div>

        <div style="margin:16px 0;text-align:left">
          <label style="font-size:12px;text-transform:uppercase;letter-spacing:1.2px;color:rgba(200,210,230,0.5);font-weight:600;display:block;margin-bottom:10px;text-align:center">Speed</label>
          <div style="display:flex;align-items:center;gap:12px">
            <span style="font-size:11px;color:rgba(200,210,230,0.4);min-width:30px">Slow</span>
            <input type="range" id="voice-speed-slider" min="0.9" max="1.4" step="0.05" value="1.15" oninput="window.__setVoiceSpeed(this.value)" style="flex:1;-webkit-appearance:none;appearance:none;height:5px;background:rgba(100,180,255,0.15);border-radius:4px;outline:none;border:none">
            <span style="font-size:11px;color:rgba(200,210,230,0.4);min-width:30px">Fast</span>
          </div>
          <div id="voice-speed-display" style="text-align:center;font-size:13px;color:#5cb8ff;margin-top:6px;font-weight:600">1.15×</div>
        </div>

        <div style="display:flex;gap:12px;margin-top:24px">
          <button onclick="window.__previewVoice()" style="flex:0 0 auto;padding:16px 24px;font-size:15px;font-weight:700;background:rgba(100,180,255,0.06);border:2px solid rgba(100,180,255,0.3);border-radius:14px;color:#5cb8ff;cursor:pointer;font-family:inherit;transition:all 0.25s;display:flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap;-webkit-appearance:none;appearance:none;letter-spacing:0.3px">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
            Preview
          </button>
          <button onclick="window.__welcomeSubmit()" style="flex:1;padding:16px 24px;font-size:16px;font-weight:700;background:linear-gradient(135deg,#3282b8,#5cb8ff);color:#fff;border:none;border-radius:14px;cursor:pointer;font-family:inherit;transition:all 0.25s;box-shadow:0 4px 24px rgba(50,130,184,0.35);letter-spacing:0.3px;-webkit-appearance:none;appearance:none;text-align:center;display:flex;align-items:center;justify-content:center">Let's Go</button>
        </div>
      </div>

    </div>
  `;
  document.body.appendChild(welcome);

  // Setup input listener to stop speaking when user types
  setTimeout(() => {
    const input = document.getElementById('chat-input');
    if (input) {
      input.addEventListener('input', () => {
        if (isSpeaking) stopSpeaking();
      });
    }
  }, 100);
}

// ─── Welcome Popup ──────────────────────────────────────────

function showWelcome() {
  // If chat history exists from this session, skip welcome
  if (loadHistory()) {
    const overlay = document.getElementById('welcome-overlay');
    if (overlay) overlay.remove();
    rebuildChatFromHistory();
    setupScrollObserver();
    return;
  }

  const overlay = document.getElementById('welcome-overlay');
  if (!overlay) return;
  setTimeout(() => overlay.classList.add('open'), 400);
  setTimeout(() => {
    const input = document.getElementById('welcome-name');
    if (input) input.focus();
  }, 800);
}

// Step 1: User clicks "Next" after entering name — swap to screen 2, speak intro
function welcomeNext() {
  const nameInput = document.getElementById('welcome-name');
  const name = (nameInput ? nameInput.value.trim() : '') || 'there';
  userName = name;
  const isChris = /^chris$/i.test(name);

  // Swap screens
  document.getElementById('welcome-screen-1').style.display = 'none';
  document.getElementById('welcome-screen-2').style.display = 'block';

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
    const isActive = p.dataset.style === style;
    p.classList.toggle('active', isActive);
    if (isActive) {
      p.style.background = 'linear-gradient(135deg,rgba(50,130,184,0.25),rgba(92,184,255,0.15))';
      p.style.borderColor = 'rgba(100,180,255,0.5)';
      p.style.color = '#fff';
      p.style.boxShadow = '0 0 20px rgba(100,180,255,0.15),inset 0 0 12px rgba(100,180,255,0.08)';
    } else {
      p.style.background = 'rgba(255,255,255,0.04)';
      p.style.borderColor = 'rgba(100,180,255,0.15)';
      p.style.color = 'rgba(200,210,230,0.5)';
      p.style.boxShadow = 'none';
    }
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
    greeting = `Alright Chris, I'm all yours. I know every number in this proposal cold — pricing, timelines, ROI, you name it. Type a question or just hit the mic button and talk to me. What do you want to dig into first?`;
  } else {
    greeting = `Alright ${name}, I'm all yours. I know this entire proposal inside and out — pricing, ROI, deployment, all of it. You can type or just hit the mic button and talk to me. What catches your eye?`;
  }

  const div = document.createElement('div');
  div.className = 'chat-msg assistant';
  div.innerHTML = `<img src="${AVATAR_IMG}" alt="${AGENT_NAME}" class="chat-msg-avatar"><div class="chat-bubble">${greeting}</div>`;
  msgContainer.appendChild(div);

  // Save greeting to history
  messages = [{ role: 'assistant', content: greeting }];
  saveHistory();

  // Show post-welcome suggestions including tour
  showDynamicSuggestions([
    'Take the Guided Tour',
    'Show me a 5-year cost comparison',
    'What makes you different from Cosmos AI?'
  ]);

  // Auto-open chat after welcome, then speak the greeting
  if (!chatOpen) {
    setTimeout(() => {
      toggleChat();
      if (voiceEnabled) speakText(greeting);
    }, 600);
  } else {
    if (voiceEnabled) speakText(greeting);
  }

  // Setup scroll observer now that welcome is done
  setupScrollObserver();
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
    // Close display panel so they don't overlap
    if (displayOpen) closeDisplay();
    panel.classList.add('open');
    fab.classList.add('active');
    badge.style.display = 'none';
    playSound('open');
    setTimeout(() => document.getElementById('chat-input').focus(), 300);
  } else {
    panel.classList.remove('open');
    fab.classList.remove('active');
  }
}

// ─── Quick Suggestion ───────────────────────────────────────

function quickSend(text) {
  // Handle tour trigger
  if (/take the guided tour/i.test(text)) {
    if (typeof window.__tourStart === 'function') {
      if (chatOpen) toggleChat();
      window.__tourStart();
      return;
    }
  }
  if (!chatOpen) toggleChat();
  setTimeout(() => {
    document.getElementById('chat-input').value = text;
    sendMessage();
  }, 300);
}

// ─── Add Message ────────────────────────────────────────────

function addMessage(role, text) {
  messages.push({ role, content: text });
  saveHistory();
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
  // Clear dynamic suggestions on new user message
  if (role === 'user') {
    const dynSug = document.getElementById('chat-dynamic-suggestions');
    if (dynSug) dynSug.innerHTML = '';
  }
}

// ─── Process Agent Commands ─────────────────────────────────
// Commands embedded in responses: {{SWITCH_TAB:sub}}, {{SCROLL_TO:#id}}, {{HIGHLIGHT:#id}}, {{SUGGESTIONS:a|b|c}}

function processCommands(text) {
  let cleaned = text;
  const commands = [];
  let pendingSuggestions = [];

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

  // Extract {{SUGGESTIONS:text1|text2|text3}}
  cleaned = cleaned.replace(/\{\{SUGGESTIONS:(.*?)\}\}/g, (_, list) => {
    pendingSuggestions = list.split('|').map(s => s.trim()).filter(Boolean);
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

  // Show dynamic follow-up suggestions
  if (pendingSuggestions.length > 0) {
    setTimeout(() => showDynamicSuggestions(pendingSuggestions), 300);
  }

  return cleaned.trim();
}

// ─── Dynamic Follow-Up Suggestions ─────────────────────────

function showDynamicSuggestions(suggestions) {
  const container = document.getElementById('chat-dynamic-suggestions');
  if (!container) return;
  container.innerHTML = '';
  suggestions.forEach(text => {
    const btn = document.createElement('button');
    btn.className = 'chat-dynamic-suggest';
    btn.textContent = text;
    btn.onclick = () => {
      container.innerHTML = '';
      quickSend(text);
    };
    container.appendChild(btn);
  });
}

// ─── Display Panel (renders tables on the page) ─────────────

function showDisplay(content) {
  // Close chat panel so they don't overlap
  if (chatOpen) {
    chatOpen = false;
    const chatPanel = document.getElementById('chat-panel');
    const fab = document.getElementById('chat-fab');
    if (chatPanel) chatPanel.classList.remove('open');
    if (fab) fab.classList.remove('active');
  }

  const panel = document.getElementById('agent-display');
  const container = document.getElementById('agent-display-content');
  const bk = document.getElementById('agent-display-backdrop');
  container.innerHTML = formatDisplayContent(content);
  panel.classList.add('open');
  if (bk) bk.classList.add('open');
  displayOpen = true;
  playSound('display');
}

function closeDisplay() {
  const panel = document.getElementById('agent-display');
  const bk = document.getElementById('agent-display-backdrop');
  panel.classList.remove('open');
  if (bk) bk.classList.remove('open');
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

  // Stop Stella if she's currently speaking
  stopSpeaking();

  input.value = '';
  addMessage('user', text);
  showTyping();
  playSound('send');

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
    stopFiller();

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
    saveHistory();
    bubble.innerHTML = formatText(cleaned);

    // Hide static suggestions after first exchange
    const suggestions = document.getElementById('chat-suggestions');
    if (suggestions) suggestions.style.display = 'none';

    // Speak the response if voice is enabled
    if (voiceEnabled) speakText(cleaned);
  } catch (err) {
    hideTyping();
    stopFiller();
    addMessage('assistant', 'Sorry, I\'m having trouble connecting. Please check your connection and try again.');
    console.error('Chat error:', err);
  }
}

// ─── Voice Fillers (while response generates) ─────────────

const FILLER_PHRASES = [
  "On it.",
  "One sec.",
  "Let me pull that up.",
  "Pulling the numbers.",
  "Got it, one sec.",
  "Yep, hang on.",
  "Oh yeah, let me grab that.",
  "Give me a beat.",
  "Right, so...",
  "Mmhmm, let me check."
];

const FILLER_PHRASES_2 = [
  "Almost there.",
  "Ok bear with me.",
  "Just crunching a couple things.",
  "Alright, pulling it together now.",
  "Hold tight, almost got it.",
  "Gimme one more sec.",
  "Yeah ok, here we go."
];

let fillerPlaying = false;
let fillerTimer = null;
let responseReady = false;

function playFiller() {
  if (!voiceEnabled) return;
  responseReady = false;
  const phrase = FILLER_PHRASES[Math.floor(Math.random() * FILLER_PHRASES.length)];
  fillerPlaying = true;
  speakText(phrase).then(() => {
    fillerPlaying = false;
    // If response still isn't ready after first filler, queue another
    if (!responseReady && isTyping) {
      fillerTimer = setTimeout(() => {
        if (!responseReady && isTyping && voiceEnabled) {
          const phrase2 = FILLER_PHRASES_2[Math.floor(Math.random() * FILLER_PHRASES_2.length)];
          fillerPlaying = true;
          speakText(phrase2).then(() => { fillerPlaying = false; });
        }
      }, 800);
    }
  });
}

function stopFiller() {
  responseReady = true;
  if (fillerTimer) {
    clearTimeout(fillerTimer);
    fillerTimer = null;
  }
}

// ─── Voice (ElevenLabs TTS) ────────────────────────────────

function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  document.getElementById('voice-icon-on').style.display = voiceEnabled ? '' : 'none';
  document.getElementById('voice-icon-off').style.display = voiceEnabled ? 'none' : '';
  const btn = document.getElementById('chat-voice-btn');
  btn.title = voiceEnabled ? 'Voice on — click to mute' : 'Voice off — click to unmute';
  if (!voiceEnabled) stopSpeaking();
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

    // Speaking indicator: add class
    isSpeaking = true;
    const fab = document.getElementById('chat-fab');
    if (fab) fab.classList.add('speaking');

    return new Promise((resolve) => {
      audioEl.onended = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === url) currentAudio = null;
        isSpeaking = false;
        if (fab) fab.classList.remove('speaking');
        resolve();
      };
      audioEl.onerror = () => {
        isSpeaking = false;
        if (fab) fab.classList.remove('speaking');
        resolve();
      };
      audioEl.play().catch(playErr => {
        console.warn('Voice play blocked — click the speaker icon to retry.', playErr.message);
        isSpeaking = false;
        if (fab) fab.classList.remove('speaking');
        resolve();
      });
    });
  } catch (err) {
    console.warn('TTS error:', err);
    isSpeaking = false;
    const fab = document.getElementById('chat-fab');
    if (fab) fab.classList.remove('speaking');
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
  stopSpeaking();

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

// ─── Copy Conversation Recap ───────────────────────────────

function copyRecap() {
  if (messages.length === 0) {
    showToast('No conversation to copy yet');
    return;
  }

  let recap = `── ${AGENT_NAME} Conversation Recap ──\n`;
  recap += `Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\n`;
  if (userName) recap += `Participant: ${userName}\n`;
  recap += `Messages: ${messages.length}\n\n`;

  messages.forEach(m => {
    const speaker = m.role === 'assistant' ? AGENT_NAME : (userName || 'You');
    recap += `${speaker}:\n${m.content}\n\n`;
  });

  recap += `── End of Recap ──`;

  navigator.clipboard.writeText(recap).then(() => {
    showToast('Conversation copied to clipboard');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = recap;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast('Conversation copied to clipboard');
  });
}

function showToast(msg) {
  const toast = document.getElementById('stella-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ─── Scroll Reactions (IntersectionObserver) ────────────────

const SCROLL_REACTIONS = {
  'compareGrid': "This is where it gets interesting — the side-by-side tells the real story.",
  'paybackGrid': "These payback numbers don't lie — most agents earn back their cost in under 18 months.",
  'subChart': "See how costs ramp? You're not paying the full twenty-five thousand from day one.",
  'otpSummary': "Ownership has its perks — you own every line of code after delivery.",
  'subAgentGrid': "Eight agents, eight specialists. Each one built for a specific team.",
  'subFeatureGrid': "This is what each agent actually does — the real capabilities under the hood."
};

function setupScrollObserver() {
  if (typeof IntersectionObserver === 'undefined') return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      if (scrollReactedSections.has(id) || chatOpen || displayOpen) return;

      scrollReactedSections.add(id);
      const reaction = SCROLL_REACTIONS[id];
      if (!reaction) return;

      // Show scroll bubble near FAB
      showScrollBubble(reaction);
      playSound('notification');
    });
  }, { threshold: 0.3 });

  // Observe key sections
  Object.keys(SCROLL_REACTIONS).forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  });
}

function showScrollBubble(text) {
  const bubble = document.getElementById('stella-scroll-bubble');
  if (!bubble) return;
  bubble.textContent = text;
  bubble.classList.add('show');
  setTimeout(() => bubble.classList.remove('show'), 4000);
}

// ─── Expose Globals ─────────────────────────────────────────

window.__chatToggle = toggleChat;
window.__chatSend = sendMessage;
window.__chatQuick = quickSend;
window.__closeDisplay = closeDisplay;
window.__toggleVoice = toggleVoice;
window.__chatMic = toggleMic;
window.__copyRecap = copyRecap;

// Create widget after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createWidget);
} else {
  createWidget();
}

})();
