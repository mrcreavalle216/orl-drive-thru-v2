// ─── Guided Tour ────────────────────────────────────────────
// Custom lightweight tour for ORL Drive Thru dark theme

(function() {

const STEPS = [
  {
    target: '.hero',
    title: 'Welcome to Project Drive Thru',
    text: 'This proposal compares two investment models for deploying <strong>8 AI agents</strong> across your organization over 3 years. Use the tabs to switch between models.',
    position: 'bottom',
    beforeShow: () => {}
  },
  {
    target: '.tab-bar',
    title: 'Two Models to Compare',
    text: '<strong>Subscription</strong> — fully managed monthly service.<br><strong>Ownership</strong> — one-time build, you own the code.<br>Each has different cost structures, risk profiles, and operational requirements.',
    position: 'bottom',
    beforeShow: () => switchTab('sub')
  },
  {
    target: '#subSummary',
    title: 'Subscription at a Glance',
    text: 'Key numbers for the Subscription model: your <strong>monthly run rate</strong>, the <strong>Year 3 discount</strong> (20% off), the one-time <strong>foundation fee</strong>, and the <strong>3-year all-in total</strong>.',
    position: 'bottom',
    beforeShow: () => switchTab('sub')
  },
  {
    target: '#subAgentGrid',
    title: 'Per-Agent Pricing',
    text: 'Each of your 8 AI agents has its own monthly rate based on complexity and capabilities. They deploy in phases — not all at once — so costs ramp gradually.',
    position: 'top',
    beforeShow: () => {}
  },
  {
    target: '#subFeatureGrid',
    title: 'What Each Agent Does',
    text: 'Every agent has a specific feature set, target team, and time savings estimate. These are the <strong>initial capabilities</strong> — the platform grows over time.',
    position: 'top',
    beforeShow: () => {}
  },
  {
    target: '.tab-bar',
    title: 'Now Let\'s Look at Ownership',
    text: 'The Ownership model has a different cost structure. Let\'s switch tabs and compare.',
    position: 'bottom',
    beforeShow: () => switchTab('otp')
  },
  {
    target: '#otpSummary',
    title: 'Ownership Cost Breakdown',
    text: 'Ownership splits into <strong>4 cost categories</strong>: Build (paid to Insight), Maintenance (paid to Insight), plus Infrastructure and Token costs (paid directly by ORL to cloud providers).',
    position: 'bottom',
    beforeShow: () => switchTab('otp')
  },
  {
    target: '#otpAgentGrid',
    title: 'Per-Agent Build Costs',
    text: 'Each agent has a one-time build cost. ORL <strong>owns the codebase</strong> after delivery. Maintenance is separate — $600/mo per agent once live.',
    position: 'top',
    beforeShow: () => {}
  },
  {
    target: '#compareGrid',
    title: 'Side-by-Side Comparison',
    text: 'Here\'s the bottom line: <strong>3-year total cost</strong> for each model. The Subscription model is fully managed. The Ownership model gives you the code but adds operational responsibility.',
    position: 'top',
    beforeShow: () => {}
  },
  {
    target: '#paybackGrid',
    title: 'Payback Analysis',
    text: 'For each agent, this shows how many months of subscription payments it would take to equal the one-time build cost. Agents that pay back <strong>within 24 months</strong> may favor ownership.',
    position: 'top',
    beforeShow: () => {}
  },
  {
    target: null,
    title: 'You\'re All Set!',
    text: 'Explore both tabs at your own pace. Click the <strong>chat button</strong> in the bottom-right corner if you have any questions — the AI assistant can help you compare models and understand the details.',
    position: 'center',
    beforeShow: () => {}
  }
];

let currentStep = -1;
let overlay, tooltip, spotlight;

function createOverlay() {
  // Main overlay
  overlay = document.createElement('div');
  overlay.id = 'tour-overlay';
  overlay.innerHTML = `
    <div id="tour-spotlight"></div>
    <div id="tour-tooltip">
      <div id="tour-step-count"></div>
      <div id="tour-title"></div>
      <div id="tour-text"></div>
      <div id="tour-nav">
        <button id="tour-prev" onclick="window.__tourPrev()">Back</button>
        <button id="tour-skip" onclick="window.__tourEnd()">Skip Tour</button>
        <button id="tour-next" onclick="window.__tourNext()">Next</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  spotlight = document.getElementById('tour-spotlight');
  tooltip = document.getElementById('tour-tooltip');
}

function showStep(idx) {
  if (idx < 0 || idx >= STEPS.length) { endTour(); return; }
  currentStep = idx;
  const step = STEPS[idx];

  // Run beforeShow
  if (step.beforeShow) step.beforeShow();

  // Update content
  document.getElementById('tour-step-count').textContent = `${idx + 1} of ${STEPS.length}`;
  document.getElementById('tour-title').textContent = step.title;
  document.getElementById('tour-text').innerHTML = step.text;

  // Navigation buttons
  document.getElementById('tour-prev').style.display = idx > 0 ? '' : 'none';
  const nextBtn = document.getElementById('tour-next');
  nextBtn.textContent = idx === STEPS.length - 1 ? 'Finish' : 'Next';

  // Position
  setTimeout(() => positionTooltip(step), 100);
}

function positionTooltip(step) {
  if (!step.target || step.position === 'center') {
    // Center on screen
    spotlight.style.display = 'none';
    tooltip.style.left = '50%';
    tooltip.style.top = '50%';
    tooltip.style.transform = 'translate(-50%, -50%)';
    tooltip.style.maxWidth = '440px';
    return;
  }

  const el = document.querySelector(step.target);
  if (!el) { spotlight.style.display = 'none'; return; }

  // Scroll into view
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });

  setTimeout(() => {
    const rect = el.getBoundingClientRect();
    const pad = 12;

    // Spotlight
    spotlight.style.display = 'block';
    spotlight.style.left = (rect.left - pad + window.scrollX) + 'px';
    spotlight.style.top = (rect.top - pad + window.scrollY) + 'px';
    spotlight.style.width = (rect.width + pad * 2) + 'px';
    spotlight.style.height = (rect.height + pad * 2) + 'px';

    // Tooltip position
    tooltip.style.transform = 'none';
    tooltip.style.maxWidth = '400px';

    if (step.position === 'bottom') {
      tooltip.style.left = Math.max(20, rect.left) + 'px';
      tooltip.style.top = (rect.bottom + pad + 16 + window.scrollY) + 'px';
    } else {
      // top
      tooltip.style.left = Math.max(20, rect.left) + 'px';
      tooltip.style.top = (rect.top - pad - 16 + window.scrollY - tooltip.offsetHeight) + 'px';
    }

    // Keep tooltip on screen
    const tr = tooltip.getBoundingClientRect();
    if (tr.right > window.innerWidth - 20) {
      tooltip.style.left = (window.innerWidth - tr.width - 20) + 'px';
    }
  }, 350);
}

function startTour() {
  if (!overlay) createOverlay();
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  showStep(0);
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function endTour() {
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
  currentStep = -1;
  try { localStorage.setItem('orl-tour-seen', '1'); } catch(e) {}
}

window.__tourNext = () => showStep(currentStep + 1);
window.__tourPrev = () => showStep(currentStep - 1);
window.__tourEnd = endTour;
window.__tourStart = startTour;

// Add "Take a Tour" button to hero after dashboard init
const origInit = window.initDashboard;
window.initDashboard = function() {
  origInit.call(this);

  // Add tour button to hero
  const hero = document.querySelector('.hero');
  if (hero) {
    const btn = document.createElement('button');
    btn.id = 'tour-start-btn';
    btn.textContent = '▶  Take a Guided Tour';
    btn.onclick = startTour;
    hero.appendChild(btn);
  }

  // Auto-start on first visit
  try {
    if (!localStorage.getItem('orl-tour-seen')) {
      setTimeout(startTour, 800);
    }
  } catch(e) {}
};

})();
