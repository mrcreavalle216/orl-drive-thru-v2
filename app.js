// ─── Password Gate ──────────────────────────────────────────

// Auto-bypass if already authenticated this session
(function() {
  if (sessionStorage.getItem('orl-auth') === 'true') {
    document.addEventListener('DOMContentLoaded', function() {
      document.getElementById("pw-gate").style.display = "none";
      document.getElementById("main-content").style.display = "block";
      initDashboard();
      if (typeof window.__showWelcome === 'function') {
        window.__showWelcome();
      }
    });
  }
})();

function checkPw() {
  if (document.getElementById("pw-input").value === PASSWORD) {
    sessionStorage.setItem('orl-auth', 'true');
    document.getElementById("pw-gate").style.display = "none";
    document.getElementById("main-content").style.display = "block";
    initDashboard();
    // Show welcome popup after dashboard loads
    if (typeof window.__showWelcome === 'function') {
      window.__showWelcome();
    }
  } else {
    document.getElementById("pw-error").textContent = "Access denied.";
  }
}

// ─── Helpers ────────────────────────────────────────────────

function getDate(month) {
  return new Date(2026, 8 + month - 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric"
  });
}

function fmt(val) {
  return "$" + val.toLocaleString("en-US");
}

function fmtK(val) {
  return "$" + Math.round(val / 1000) + "K";
}

function getInfra(month) {
  if (month <= 2) return 320;
  if (month <= 5) return 960;
  if (month <= 7) return 1600;
  if (month <= 9) return 2240;
  if (month <= 12) return 2800;
  return 3040;
}

function getMaint(month) {
  if (month <= 2) return 0;
  return 600 * AGENTS.filter(a => month >= a.goLive).length;
}

// ─── Dashboard Init ─────────────────────────────────────────

function renderAgentShowcase() {
  const el = document.getElementById('agentShowcase');
  if (!el) return;
  AGENTS.forEach(a => {
    const f = FEATURES[a.name];
    el.innerHTML += `<div class="showcase-card animate">
      <img class="showcase-avatar" src="images/${a.name.toLowerCase()}.png" alt="${a.name}">
      <div class="showcase-name">${a.name}</div>
      <div class="showcase-role">${f.desc}</div>
      <div class="showcase-team">${f.team}</div>
      <div class="showcase-time">⏱ ${a.timeSaved} saved</div>
    </div>`;
  });
}

function initDashboard() {
  renderAgentShowcase();
  const n = TOTAL_MONTHS;
  const totalBuild = AGENTS.reduce((s, a) => s + a.buildCost, 0);

  // ── Build Subscription Data ───────────────────────────────
  const subRows = [];
  let subCumulative = 0;

  for (let m = 1; m <= n; m++) {
    const row = { month: m, date: getDate(m), agents: {}, infra: getInfra(m), total: 0 };
    const isYear3 = m >= 25;

    AGENTS.forEach(a => {
      if (m >= a.goLive) {
        const rate = isYear3 ? Math.round(0.8 * a.subRate) : a.subRate;
        row.agents[a.name] = rate;
        row.total += rate;
      } else {
        row.agents[a.name] = 0;
      }
    });

    subCumulative += row.total;
    row.cumulative = subCumulative;
    row.isPhaseStart = AGENTS.some(a => a.goLive === m);
    row.isYear3 = isYear3;
    subRows.push(row);
  }

  const subTotal = subCumulative;
  const subYear1 = subRows.filter(r => r.month <= 12).reduce((s, r) => s + r.total, 0);
  const subYear2 = subRows.filter(r => r.month > 12 && r.month <= 24).reduce((s, r) => s + r.total, 0);
  const subYear3 = subRows.filter(r => r.month > 24).reduce((s, r) => s + r.total, 0);

  // ── Build OTP Data ────────────────────────────────────────
  const otpRows = [];
  let otpCumulative = 0;
  let otpChartCumulative = 0;

  for (let m = 1; m <= n; m++) {
    const infra = getInfra(m);
    const maint = getMaint(m);
    const row = {
      month: m, date: getDate(m), agents: {},
      buildPmt: 0, infra, maint, tokenTotal: 0, total: 0
    };

    // Build payment at milestone (go-live)
    AGENTS.forEach(a => {
      if (m === a.goLive) row.buildPmt += a.buildCost;
    });

    AGENTS.forEach(a => {
      if (m >= a.goLive) {
        row.agents[a.name] = a.tokenCost;
        row.tokenTotal += a.tokenCost;
      } else {
        row.agents[a.name] = 0;
      }
    });

    // Monthly build = each agent's buildCost / remaining months (so installments sum to actual build cost)
    row.monthlyPmt = 0;
    AGENTS.forEach(a => {
      if (m >= a.goLive) {
        const agentMonths = n - a.goLive + 1;
        row.monthlyPmt += Math.round(a.buildCost / agentMonths);
      }
    });
    // Total monthly cost and cumulative include all cost categories
    row.total = row.monthlyPmt + row.tokenTotal + row.maint + row.infra;
    otpCumulative += row.total;
    row.cumulative = otpCumulative;
    // Chart cumulative uses actual milestone build payments for accurate TCO comparison
    otpChartCumulative += row.buildPmt + row.tokenTotal + row.maint + row.infra;
    row.chartCumulative = otpChartCumulative;
    row.coreCost = row.buildPmt + row.maint;
    row.estOngoing = row.tokenTotal + row.infra;
    row.isPhaseStart = AGENTS.some(a => a.goLive === m);
    otpRows.push(row);
  }

  // TCO = actual build + all recurring costs
  const otpYear1 = otpRows.filter(r => r.month <= 12).reduce((s, r) => s + r.buildPmt + r.maint + r.tokenTotal + r.infra, 0);
  const otpYear2 = otpRows.filter(r => r.month > 12 && r.month <= 24).reduce((s, r) => s + r.buildPmt + r.maint + r.tokenTotal + r.infra, 0);
  const otpYear3 = otpRows.filter(r => r.month > 24).reduce((s, r) => s + r.buildPmt + r.maint + r.tokenTotal + r.infra, 0);
  const otpTokens = otpRows.reduce((s, r) => s + r.tokenTotal, 0);
  const otpInfra = otpRows.reduce((s, r) => s + r.infra, 0);
  const otpMaint = otpRows.reduce((s, r) => s + r.maint, 0);
  const otpTotal = totalBuild + otpMaint + otpTokens + otpInfra;

  // ── Subscription Summary Cards ────────────────────────────
  const fullRunRate = AGENTS.reduce((s, a) => s + a.subRate, 0);
  const y3RunRate = AGENTS.reduce((s, a) => s + Math.round(0.8 * a.subRate), 0);

  document.getElementById("subSummary").innerHTML = `
    <div class="summary-card"><div class="val">${fmt(fullRunRate)}/mo</div><div class="lbl">Full Run Rate (Mo 9–24)</div></div>
    <div class="summary-card"><div class="val">${fmt(y3RunRate)}/mo</div><div class="lbl">Year 3 Rate (20% Off)</div></div>
    <div class="summary-card"><div class="val">${fmt(FOUNDATION_FEE)}</div><div class="lbl">Foundation Fee (One-Time)</div></div>
    <div class="summary-card" style="border-top:4px solid var(--green);background:linear-gradient(135deg,rgba(27,122,61,0.12),rgba(46,204,113,0.06));box-shadow:0 8px 32px rgba(27,122,61,0.18)"><div class="val" style="font-size:32px;background:linear-gradient(135deg,var(--green),#2ea04e);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${fmt(subTotal + FOUNDATION_FEE)}</div><div class="lbl" style="font-weight:700;color:var(--green)">3-Year All-In Total</div></div>`;

  // ── Subscription Agent Cards ──────────────────────────────
  const subGrid = document.getElementById("subAgentGrid");
  AGENTS.forEach(a => {
    const y3Rate = Math.round(0.8 * a.subRate);
    const totalMonths = n - a.goLive + 1;
    const fullMonths = Math.min(24, n) - a.goLive + 1;
    const reducedMonths = totalMonths - fullMonths;
    const agentTotal = a.subRate * fullMonths + y3Rate * reducedMonths;

    subGrid.innerHTML += `<div class="agent-card" style="border-left-color:${a.color}">

      <div class="name">${a.name}</div>
      <div class="phase" style="white-space:nowrap">${a.phase} — Go-Live ${getDate(a.goLive)}</div>
      <div class="rate">Full: <span>${fmt(a.subRate)}/mo</span></div>
      <div class="rate">Year 3: <span>${fmt(y3Rate)}/mo</span></div>
      <div class="rate">${totalMonths} months (${fullMonths} full + ${reducedMonths} reduced)</div>
      <div class="total">3-Year: ${fmt(agentTotal)}</div>
      <div class="rate" style="font-size:10px;color:#999;margin-top:6px">18-mo lock-in · 60-day notice after M18 · 50% penalty on remaining months up to M24</div>
      <img class="agent-char" src="images/${a.name.toLowerCase()}.png" alt="${a.name}">
    </div>`;
  });

  // ── Subscription Feature Cards ────────────────────────────
  const subFeatures = document.getElementById("subFeatureGrid");
  AGENTS.forEach(a => {
    const f = FEATURES[a.name];
    subFeatures.innerHTML += `<div class="feature-card" style="position:relative;overflow:hidden">
      <div class="feature-header">
        <div class="feature-dot" style="background:${a.color}"></div>
        <div><div class="fname">${a.name}</div></div>
        <div class="fdesc">${f.desc}</div>
      </div>
      <div class="feature-body">
        <div class="feat-label">Initial Feature Set — ${f.team}</div>
        <ul class="feature-list">${f.features.map(ft => "<li>" + ft + "</li>").join("")}</ul>
        <div class="feature-deps"><strong>Dependencies:</strong> ${f.deps}</div>
        <div class="feature-deps" style="margin-top:3px"><strong>HITL Gate:</strong> ${f.hitl}</div>
        <div class="feature-savings">⏱ ${a.timeSaved} saved</div>
      </div>
      <img class="feature-char" src="images/${a.name.toLowerCase()}.png" alt="${a.name}">
    </div>`;
  });

  // ── Subscription Year Summary ─────────────────────────────
  const yearData = [
    { l: "Year 1", s: "Sep 2026 – Aug 2027", a: subYear1, d: subRows.slice(0, 12) },
    { l: "Year 2", s: "Sep 2027 – Aug 2028", a: subYear2, d: subRows.slice(12, 24) },
    { l: "Year 3", s: "Sep 2028 – Aug 2029", a: subYear3, d: subRows.slice(24, 36) }
  ];

  const subYearEl = document.getElementById("subYearSummary");
  yearData.forEach(y => {
    const totals = y.d.map(r => r.total);
    const lo = Math.min(...totals);
    const hi = Math.max(...totals);
    const detail = lo !== hi
      ? `Monthly range: ${fmt(lo)} – ${fmt(hi)}`
      : `Flat: ${fmt(hi)}/mo × 12`;
    subYearEl.innerHTML += `<div class="year-box">
      <h3>${y.l} <span style="font-weight:400;font-size:11px;color:#999">${y.s}</span></h3>
      <div class="amount">${fmt(y.a)}</div>
      <div class="detail">${detail}</div>
    </div>`;
  });

  // ── Subscription Monthly Table ────────────────────────────
  const subTable = document.getElementById("subTableBody");
  subRows.forEach(row => {
    let cls = (row.isPhaseStart && row.month > 1 ? " phase-start" : "") + (row.isYear3 ? " year3" : "");
    let extra = "";
    if (row.isPhaseStart) {
      extra = '<br><small style="color:var(--accent)">▸ ' +
        AGENTS.filter(a => a.goLive === row.month).map(a => a.name).join(" + ") + "</small>";
    }
    let cells = `<td>${row.month}</td><td>${row.date}${extra}</td>`;
    AGENTS.forEach(a => {
      const v = row.agents[a.name];
      cells += v === 0
        ? '<td class="zero">—</td>'
        : `<td>${fmt(v)}</td>`;
    });
    cells += `<td class="total-col">${fmt(row.total)}</td><td class="cumul-col">${fmt(row.cumulative)}</td>`;
    subTable.innerHTML += `<tr class="${cls}">${cells}</tr>`;
  });

  // Total row
  let totalCells = '<td style="font-weight:700">TOTAL</td><td></td>';
  AGENTS.forEach(a => {
    const y3Rate = Math.round(0.8 * a.subRate);
    const fullMonths = Math.min(24, n) - a.goLive + 1;
    const reducedMonths = n - a.goLive + 1 - fullMonths;
    totalCells += `<td style="font-weight:700;border-top:2px solid var(--dark)">${fmt(a.subRate * fullMonths + y3Rate * reducedMonths)}</td>`;
  });
  totalCells += `<td class="total-col" style="border-top:2px solid var(--dark);font-size:13px">${fmt(subTotal)}</td><td></td>`;
  subTable.innerHTML += `<tr style="background:var(--light)">${totalCells}</tr>`;

  // ── OTP Summary Cards ─────────────────────────────────────
  document.getElementById("otpSummary").innerHTML = `
    <div class="summary-card" style="border-top:3px solid var(--gold)"><div class="val" style="color:var(--gold)">${fmt(totalBuild)}</div><div class="lbl">Build</div><div style="font-size:10px;color:#999;margin-top:4px">Billed by Insight</div></div>
    <div class="summary-plus">+</div>
    <div class="summary-card" style="border-top:3px solid var(--gold)"><div class="val" style="color:var(--gold)">${fmt(otpMaint)}</div><div class="lbl">Maintenance (36 Mo)</div><div style="font-size:10px;color:#999;margin-top:4px">Billed by Insight</div></div>
    <div class="summary-plus">+</div>
    <div class="summary-card" style="border-top:3px solid #888;opacity:0.85"><div class="val" style="color:#888">${fmt(otpInfra)}</div><div class="lbl">Est. Infrastructure (36 Mo)</div><div style="font-size:10px;color:#999;margin-top:4px">Paid directly by ORL</div></div>
    <div class="summary-plus">+</div>
    <div class="summary-card" style="border-top:3px solid #888;opacity:0.85"><div class="val" style="color:#888">${fmt(otpTokens)}</div><div class="lbl">Est. Tokens (36 Mo)</div><div style="font-size:10px;color:#999;margin-top:4px">Paid directly by ORL</div></div>
    <div class="summary-plus">=</div>
    <div class="summary-card" style="border-top:4px solid var(--green);background:linear-gradient(135deg,rgba(27,122,61,0.12),rgba(46,204,113,0.06));box-shadow:0 8px 32px rgba(27,122,61,0.18)"><div class="val" style="font-size:32px;background:linear-gradient(135deg,var(--green),#2ea04e);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${fmt(otpTotal)}</div><div class="lbl" style="font-weight:700;color:var(--green)">Est. 3-Year Total Cost of Ownership</div></div>`;

  // ── OTP Agent Cards ───────────────────────────────────────
  const otpGrid = document.getElementById("otpAgentGrid");
  AGENTS.forEach(a => {
    const paybackMonths = Math.round(a.buildCost / a.subRate * 10) / 10;
    const maintTotal = 600 * (n - a.goLive + 1);

    otpGrid.innerHTML += `<div class="agent-card" style="border-left-color:${a.color}">

      <div class="name">${a.name}</div>
      <div class="phase" style="white-space:nowrap">${a.phase} — Delivery ${getDate(a.goLive)}</div>
      <div class="rate" style="color:var(--gold)">Build: <span>${fmt(a.buildCost)}</span></div>
      <div class="rate" style="color:var(--gold)">Maintenance: <span>${fmt(600)}/mo</span> (${fmt(maintTotal)} over term)</div>
      <div class="rate" style="color:#888;font-size:11px">Est. Tokens: <span>${fmt(a.tokenCost)}/mo</span> (ongoing, paid by ORL)</div>
      <div class="rate">Payback: <span>${paybackMonths} mo</span> vs subscription</div>
      <div class="total" style="color:var(--gold)">Build: ${fmt(a.buildCost)}</div>
      <img class="agent-char" src="images/${a.name.toLowerCase()}.png" alt="${a.name}">
    </div>`;
  });

  // ── OTP Feature Cards ─────────────────────────────────────
  const otpFeatures = document.getElementById("otpFeatureGrid");
  AGENTS.forEach(a => {
    const f = FEATURES[a.name];
    otpFeatures.innerHTML += `<div class="feature-card" style="position:relative;overflow:hidden">
      <div class="feature-header">
        <div class="feature-dot" style="background:${a.color}"></div>
        <div><div class="fname">${a.name}</div></div>
        <div class="fdesc">${f.desc}</div>
      </div>
      <div class="feature-body">
        <div class="feat-label">Initial Feature Set — ${f.team}</div>
        <ul class="feature-list">${f.features.map(ft => "<li>" + ft + "</li>").join("")}</ul>
        <div class="feature-deps"><strong>Dependencies:</strong> ${f.deps}</div>
        <div class="feature-deps" style="margin-top:3px"><strong>HITL Gate:</strong> ${f.hitl}</div>
        <div class="feature-savings">⏱ ${a.timeSaved} saved</div>
      </div>
      <img class="feature-char" src="images/${a.name.toLowerCase()}.png" alt="${a.name}">
    </div>`;
  });

  // ── OTP Year Summary ──────────────────────────────────────
  // Compute year splits for core vs ongoing
  const otpY1Core = otpRows.filter(r => r.month <= 12).reduce((s, r) => s + r.coreCost, 0);
  const otpY2Core = otpRows.filter(r => r.month > 12 && r.month <= 24).reduce((s, r) => s + r.coreCost, 0);
  const otpY3Core = otpRows.filter(r => r.month > 24).reduce((s, r) => s + r.coreCost, 0);
  const otpY1Ongoing = otpRows.filter(r => r.month <= 12).reduce((s, r) => s + r.estOngoing, 0);
  const otpY2Ongoing = otpRows.filter(r => r.month > 12 && r.month <= 24).reduce((s, r) => s + r.estOngoing, 0);
  const otpY3Ongoing = otpRows.filter(r => r.month > 24).reduce((s, r) => s + r.estOngoing, 0);

  const otpYearData = [
    { l: "Year 1", s: "Sep 2026 – Aug 2027", a: otpYear1, core: otpY1Core, ongoing: otpY1Ongoing },
    { l: "Year 2", s: "Sep 2027 – Aug 2028", a: otpYear2, core: otpY2Core, ongoing: otpY2Ongoing },
    { l: "Year 3", s: "Sep 2028 – Aug 2029", a: otpYear3, core: otpY3Core, ongoing: otpY3Ongoing }
  ];

  const otpYearEl = document.getElementById("otpYearSummary");
  otpYearData.forEach(y => {
    otpYearEl.innerHTML += `<div class="year-box">
      <h3>${y.l} <span style="font-weight:400;font-size:11px;color:#999">${y.s}</span></h3>
      <div class="amount">${fmt(y.a)}</div>
      <div style="font-size:11px;margin-top:4px;color:var(--gold)">Build + Maint: ${fmt(y.core)}</div>
      <div style="font-size:11px;color:#888">Est. Ongoing: ${fmt(y.ongoing)}</div>
    </div>`;
  });

  // ── OTP Monthly Table ─────────────────────────────────────
  const otpTable = document.getElementById("otpTableBody");
  otpRows.forEach(row => {
    let cls = row.isPhaseStart && row.month > 1 ? " phase-start" : "";
    let extra = "";
    if (row.isPhaseStart) {
      extra = '<br><small style="color:var(--accent)">▸ ' +
        AGENTS.filter(a => a.goLive === row.month).map(a => a.name).join(" + ") + "</small>";
    }

    let cells = `<td>${row.month}</td><td>${row.date}${extra}</td>`;
    cells += row.buildPmt > 0 ? `<td style="color:var(--purple);font-weight:700">${fmt(row.buildPmt)}</td>` : '<td class="zero">—</td>';

    AGENTS.forEach(a => {
      const v = row.agents[a.name];
      cells += v === 0 ? '<td class="zero">—</td>' : `<td style="color:#999">${fmt(v)}</td>`;
    });

    cells += `<td style="color:#999">${fmt(row.tokenTotal)}</td>`;
    cells += `<td style="color:#999">${fmt(row.infra)}</td>`;
    cells += row.month <= 2
      ? `<td style="color:var(--green,#2ecc71);font-weight:600;font-size:11px">FREE</td>`
      : `<td style="color:var(--gold)">${fmt(row.maint)}</td>`;
    cells += `<td class="total-col">${fmt(row.monthlyPmt)}</td>`;
    cells += `<td class="cumul-col">${fmt(row.cumulative)}</td>`;
    otpTable.innerHTML += `<tr class="${cls}">${cells}</tr>`;
  });

  // ── Comparison Section ────────────────────────────────────
  const compareGrid = document.getElementById("compareGrid");
  compareGrid.innerHTML = `
    <div class="compare-box sub">
      <h3 style="color:var(--accent)">Subscription Model</h3>
      <div class="big" style="color:var(--accent)">${fmt(subTotal + FOUNDATION_FEE)}</div>
      <div class="sub-text">3-Year All-In (incl. ${fmt(FOUNDATION_FEE)} foundation)</div>
      <div style="margin-top:16px">
        <div class="compare-line"><span>Year 1</span><span>${fmt(subYear1)}</span></div>
        <div class="compare-line"><span>Year 2</span><span>${fmt(subYear2)}</span></div>
        <div class="compare-line"><span>Year 3 (20% off)</span><span>${fmt(subYear3)}</span></div>
        <div class="compare-line"><span>Foundation Fee</span><span>${fmt(FOUNDATION_FEE)}</span></div>
      </div>
    </div>
    <div class="compare-box otp">
      <h3 style="color:var(--gold)">One-Time Purchase Model</h3>
      <div class="big" style="color:var(--gold)">${fmt(otpTotal)}</div>
      <div class="sub-text">Est. 3-Year Total Cost of Ownership</div>
      <div style="margin-top:16px">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--gold);margin-bottom:6px">Billed by Insight</div>
        <div class="compare-line" style="color:var(--gold);font-weight:600"><span>Build</span><span>${fmt(totalBuild)}</span></div>
        <div class="compare-line" style="color:var(--gold);font-weight:600"><span>Maintenance (36 mo)</span><span>${fmt(otpMaint)}</span></div>
        <div class="compare-line" style="border-top:1px solid var(--gold);padding-top:8px;margin-top:8px;color:var(--gold);font-weight:700"><span>Subtotal — Insight</span><span>${fmt(totalBuild + otpMaint)}</span></div>
        <div style="border-top:1px dashed #555;margin:12px 0 8px;padding-top:8px">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:6px">Estimated Client Costs (Paid Directly by ORL)</div>
          <div class="compare-line" style="color:#999"><span>Est. Tokens (36 mo)</span><span>${fmt(otpTokens)}</span></div>
          <div class="compare-line" style="color:#999"><span>Est. Infrastructure (36 mo)</span><span>${fmt(otpInfra)}</span></div>
          <div class="compare-line" style="border-top:1px solid #888;padding-top:8px;margin-top:8px;color:#888;font-weight:700"><span>Subtotal — Est. ORL Direct</span><span>${fmt(otpTokens + otpInfra)}</span></div>
        </div>
        <div class="compare-line" style="border-top:2px solid #555;padding-top:10px;margin-top:10px;font-weight:700;font-size:14px"><span>Est. Total Cost of Ownership</span><span>${fmt(otpTotal)}</span></div>
      </div>
    </div>`;

  // ── Payback Cards ─────────────────────────────────────────
  const paybackGrid = document.getElementById("paybackGrid");
  AGENTS.forEach(a => {
    const months = Math.round(a.buildCost / a.subRate * 10) / 10;
    let cls, label;
    if (months <= 20) { cls = "ok"; label = "Within contract"; }
    else if (months <= 24) { cls = "warn"; label = "Near contract end"; }
    else { cls = "over"; label = "Exceeds 24-mo term"; }

    paybackGrid.innerHTML += `<div class="payback-card ${cls}">
      <div class="pb-name">${a.name}</div>
      <div class="pb-months">${months}</div>
      <div class="pb-detail">months · ${label}</div>
    </div>`;
  });

  // ── Build Charts ──────────────────────────────────────────
  buildCharts(AGENTS, subRows, otpRows, n);

  // ── Enhanced Scroll Animations (staggered cascade) ────────
  const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Find siblings in the same grid/row for staggered cascade
        const parent = entry.target.parentElement;
        const siblings = Array.from(parent.querySelectorAll('.animate:not(.visible)'));
        const idx = siblings.indexOf(entry.target);
        const delay = Math.max(0, idx) * 80;
        setTimeout(() => entry.target.classList.add("visible"), delay);
        scrollObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });

  document.querySelectorAll(
    ".summary-card, .agent-card, .feature-card, .chart-wrap, .year-box, .compare-box, .payback-card, .notes, .section-title, .showcase-card, .model-card, .landing-stat, .lsection-title, .lsection-desc, .pdf-download-row"
  ).forEach(el => {
    el.classList.add("animate");
    scrollObserver.observe(el);
  });

  // ── Counter Animations on Dollar Values ────────────────────
  document.querySelectorAll(".summary-card .val").forEach(el => {
    const text = el.textContent;
    const match = text.match(/\$([\d,]+)/);
    if (match) {
      const target = parseInt(match[1].replace(/,/g, ""));
      const prefix = text.substring(0, text.indexOf("$"));
      const suffix = text.substring(text.indexOf(match[1]) + match[1].length);

      const counterObserver = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          const duration = 1200;
          const start = performance.now();
          requestAnimationFrame(function tick(now) {
            const progress = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(target * ease);
            el.textContent = prefix + "$" + current.toLocaleString("en-US") + suffix;
            if (progress < 1) requestAnimationFrame(tick);
          });
          counterObserver.disconnect();
        }
      }, { threshold: 0.5 });

      counterObserver.observe(el);
    }
  });
}

// ─── Tab Switching ──────────────────────────────────────────

function switchTab(tab) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(el => {
    el.classList.remove("active", "active-sub", "active-otp");
  });

  document.getElementById("tab-" + tab).classList.add("active");
  const btns = document.querySelectorAll(".tab-btn");
  if (tab === "sub") {
    btns[0].classList.add("active", "active-sub");
  } else {
    btns[1].classList.add("active", "active-otp");
  }
}

