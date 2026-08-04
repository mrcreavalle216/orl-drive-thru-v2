// ─── PDF Summary Generation ────────────────────────────────
// Uses jsPDF to generate downloadable pricing summaries

function generateSubPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'letter');
  const W = 216, H = 279, M = 20;

  // Colors
  const hdrBg = [15, 15, 40];
  const txt = [40, 42, 54];
  const gry = [120, 130, 150];
  const accentRGB = [50, 130, 184];

  // ── Header ───────────────────────────────────────────────
  doc.setFillColor(...hdrBg);
  doc.rect(0, 0, W, 52, 'F');
  // Accent line
  doc.setFillColor(...accentRGB);
  doc.rect(0, 52, W, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Subscription Model Summary', M, 22);
  doc.setFontSize(11);
  doc.setTextColor(160, 175, 200);
  doc.text('ORL Project Drive Thru — 3-Year AI Platform Investment', M, 32);
  doc.setFontSize(10);
  doc.setTextColor(120, 135, 160);
  doc.text('Prepared by Insight Consultants  •  Confidential', M, 40);
  doc.text(new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), W - M, 40, { align: 'right' });

  let y = 64;

  // ── Summary Metrics ──────────────────────────────────────
  const fullRunRate = AGENTS.reduce((s, a) => s + a.subRate, 0);
  const y3RunRate = AGENTS.reduce((s, a) => s + Math.round(0.8 * a.subRate), 0);
  let subTotal = 0;
  for (let m = 1; m <= 36; m++) {
    AGENTS.forEach(a => {
      if (m >= a.goLive) subTotal += m >= 25 ? Math.round(0.8 * a.subRate) : a.subRate;
    });
  }

  doc.setFontSize(14);
  doc.setTextColor(...txt);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', M, y);
  y += 10;

  const metrics = [
    ['Full Monthly Run Rate (Months 9–24)', '$' + fullRunRate.toLocaleString() + '/mo'],
    ['Year 3 Renewal Rate (20% Discount)', '$' + y3RunRate.toLocaleString() + '/mo'],
    ['Foundation Fee (One-Time)', '$' + FOUNDATION_FEE.toLocaleString()],
    ['3-Year All-In Total', '$' + (subTotal + FOUNDATION_FEE).toLocaleString()]
  ];

  doc.setFontSize(11);
  metrics.forEach(([label, val], i) => {
    const isTotal = i === metrics.length - 1;
    if (isTotal) {
      doc.setDrawColor(200, 205, 215);
      doc.line(M, y - 2, W - M, y - 2);
      y += 3;
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...gry);
    doc.text(label, M, y);
    doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
    doc.setTextColor(isTotal ? accentRGB[0] : txt[0], isTotal ? accentRGB[1] : txt[1], isTotal ? accentRGB[2] : txt[2]);
    doc.text(val, W - M, y, { align: 'right' });
    y += isTotal ? 9 : 7;
  });

  y += 6;

  // ── Per-Agent Table ──────────────────────────────────────
  doc.setFontSize(14);
  doc.setTextColor(...txt);
  doc.setFont('helvetica', 'bold');
  doc.text('Per-Agent Breakdown', M, y);
  y += 10;

  // Table header
  doc.setFillColor(235, 238, 245);
  doc.rect(M, y - 5, W - 2 * M, 8, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...gry);
  doc.setFont('helvetica', 'bold');
  const colsSub = [M + 2, M + 28, M + 60, M + 90, M + 115, M + 140];
  ['Agent', 'Phase', 'Go-Live', 'Rate/Mo', 'Year 3 Rate', '36-Mo Total'].forEach((h, i) => {
    doc.text(h, colsSub[i], y);
  });
  y += 7;

  doc.setFontSize(10);
  doc.setTextColor(...txt);
  AGENTS.forEach(a => {
    const y3Rate = Math.round(0.8 * a.subRate);
    const fullMo = Math.min(24, 36) - a.goLive + 1;
    const reducedMo = 36 - a.goLive + 1 - fullMo;
    const agentTotal = a.subRate * fullMo + y3Rate * reducedMo;

    doc.setFont('helvetica', 'bold');
    doc.text(a.name, colsSub[0], y);
    doc.setFont('helvetica', 'normal');
    doc.text(a.phase, colsSub[1], y);
    doc.text(getDate(a.goLive), colsSub[2], y);
    doc.text('$' + a.subRate.toLocaleString(), colsSub[3], y);
    doc.text('$' + y3Rate.toLocaleString(), colsSub[4], y);
    doc.setFont('helvetica', 'bold');
    doc.text('$' + agentTotal.toLocaleString(), colsSub[5], y);
    y += 7;
  });

  y += 2;
  doc.setDrawColor(200, 205, 215);
  doc.line(M, y, W - M, y);
  y += 10;

  // ── Annual Summary ───────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...txt);
  doc.text('Annual Summary', M, y);
  y += 9;

  let subY1 = 0, subY2 = 0, subY3 = 0;
  for (let m = 1; m <= 36; m++) {
    let mTotal = 0;
    AGENTS.forEach(a => {
      if (m >= a.goLive) mTotal += m >= 25 ? Math.round(0.8 * a.subRate) : a.subRate;
    });
    if (m <= 12) subY1 += mTotal;
    else if (m <= 24) subY2 += mTotal;
    else subY3 += mTotal;
  }

  doc.setFontSize(11);
  [['Year 1 (Sep 2026 – Aug 2027)', subY1], ['Year 2 (Sep 2027 – Aug 2028)', subY2], ['Year 3 (Sep 2028 – Aug 2029, 20% off)', subY3]].forEach(([l, v]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...gry);
    doc.text(l, M, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...txt);
    doc.text('$' + v.toLocaleString(), W - M, y, { align: 'right' });
    y += 7;
  });

  y += 6;

  // ── Key Terms ────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...txt);
  doc.text('Key Terms', M, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...gry);
  [
    'Foundation fee: $40,000 one-time platform setup, billed at contract signing.',
    'Renewal: 20% reduction across all agents effective Month 25 (Sep 2028) after 24-month initial term.',
    'Fully managed: Includes all infrastructure, monitoring, optimization, model upgrades, and operational support.',
    'Early termination: 18-month lock-in required. 60-day written notice after Month 18.',
    'Penalty: 50% of then-current monthly rate for each remaining month up to Month 24.'
  ].forEach(t => {
    const lines = doc.splitTextToSize('•  ' + t, W - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 4.5 + 2;
  });

  // ── Footer ───────────────────────────────────────────────
  doc.setFillColor(...hdrBg);
  doc.rect(0, H - 14, W, 14, 'F');
  doc.setFontSize(8);
  doc.setTextColor(130, 140, 165);
  doc.text('Insight Consultants  •  Confidential  •  ORL Project Drive Thru', M, H - 5);
  doc.text('Page 1 of 1', W - M, H - 5, { align: 'right' });

  doc.save('ORL_Subscription_Summary.pdf');
}


function generateOtpPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'letter');
  const W = 216, H = 279, M = 20;

  const hdrBg = [15, 15, 40];
  const txt = [40, 42, 54];
  const gry = [120, 130, 150];
  const goldRGB = [180, 140, 20];

  // ── Header ───────────────────────────────────────────────
  doc.setFillColor(...hdrBg);
  doc.rect(0, 0, W, 52, 'F');
  doc.setFillColor(...goldRGB);
  doc.rect(0, 52, W, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('Ownership Model Summary', M, 22);
  doc.setFontSize(11);
  doc.setTextColor(200, 180, 130);
  doc.text('ORL Project Drive Thru — 3-Year Estimated Cost of Ownership', M, 32);
  doc.setFontSize(10);
  doc.setTextColor(150, 140, 120);
  doc.text('Prepared by Insight Consultants  •  Confidential', M, 40);
  doc.text(new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), W - M, 40, { align: 'right' });

  let y = 64;

  // ── Totals ───────────────────────────────────────────────
  const totalBuild = AGENTS.reduce((s, a) => s + a.buildCost, 0);
  let otpMaint = 0, otpTokens = 0, otpInfra = 0;
  for (let m = 1; m <= 36; m++) {
    otpInfra += getInfra(m);
    otpMaint += getMaint(m);
    AGENTS.forEach(a => { if (m >= a.goLive) otpTokens += a.tokenCost; });
  }
  const otpTotal = totalBuild + otpMaint + otpTokens + otpInfra;

  doc.setFontSize(14);
  doc.setTextColor(...txt);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', M, y);
  y += 10;

  doc.setFontSize(11);
  const metricsOtp = [
    ['Build Cost (Billed by Insight)', '$' + totalBuild.toLocaleString(), false],
    ['Est. Maintenance — 36 Mo (Billed by Insight)', '$' + otpMaint.toLocaleString(), false],
    ['Est. Infrastructure — 36 Mo (Paid by ORL)', '$' + otpInfra.toLocaleString(), false],
    ['Est. Token Costs — 36 Mo (Paid by ORL)', '$' + otpTokens.toLocaleString(), false],
    ['Est. 3-Year Total Cost of Ownership', '$' + otpTotal.toLocaleString(), true]
  ];

  metricsOtp.forEach(([label, val, isTotal]) => {
    if (isTotal) {
      doc.setDrawColor(200, 205, 215);
      doc.line(M, y - 2, W - M, y - 2);
      y += 3;
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...gry);
    doc.text(label, M, y);
    doc.setFont('helvetica', isTotal ? 'bold' : 'normal');
    doc.setTextColor(isTotal ? goldRGB[0] : txt[0], isTotal ? goldRGB[1] : txt[1], isTotal ? goldRGB[2] : txt[2]);
    doc.text(val, W - M, y, { align: 'right' });
    y += isTotal ? 9 : 7;
  });

  y += 6;

  // ── Per-Agent Table ──────────────────────────────────────
  doc.setFontSize(14);
  doc.setTextColor(...txt);
  doc.setFont('helvetica', 'bold');
  doc.text('Per-Agent Breakdown', M, y);
  y += 10;

  doc.setFillColor(235, 238, 245);
  doc.rect(M, y - 5, W - 2 * M, 8, 'F');
  doc.setFontSize(8);
  doc.setTextColor(...gry);
  doc.setFont('helvetica', 'bold');
  const colsOtp = [M + 2, M + 25, M + 52, M + 78, M + 105, M + 128, M + 152];
  ['Agent', 'Phase', 'Delivery', 'Build Cost', 'Maint/Mo', 'Tokens/Mo', 'Payback'].forEach((h, i) => {
    doc.text(h, colsOtp[i], y);
  });
  y += 7;

  doc.setFontSize(10);
  doc.setTextColor(...txt);
  AGENTS.forEach(a => {
    const payback = Math.round(a.buildCost / a.subRate * 10) / 10;
    doc.setFont('helvetica', 'bold');
    doc.text(a.name, colsOtp[0], y);
    doc.setFont('helvetica', 'normal');
    doc.text(a.phase, colsOtp[1], y);
    doc.text(getDate(a.goLive), colsOtp[2], y);
    doc.text('$' + a.buildCost.toLocaleString(), colsOtp[3], y);
    doc.text('$600', colsOtp[4], y);
    doc.text('$' + a.tokenCost.toLocaleString(), colsOtp[5], y);
    doc.text(payback + ' mo', colsOtp[6], y);
    y += 7;
  });

  y += 2;
  doc.setDrawColor(200, 205, 215);
  doc.line(M, y, W - M, y);
  y += 10;

  // ── Key Terms ────────────────────────────────────────────
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...txt);
  doc.text('Key Terms', M, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...gry);
  [
    'Build costs billed at phase delivery milestones. No separate platform or foundation fee.',
    'Maintenance: First 2 months FREE. Starting M3, ~$600/mo per live agent.',
    'Infrastructure (ORL-direct): Azure compute, APIM, Twilio, ElevenLabs. Est. $320–$3,040/mo ramp.',
    'Tokens (ORL-direct): ~$985/mo at full deployment for Claude API inference.',
    'Code ownership: ORL owns the codebase after delivery. Insight provides maintenance as a service.',
    'All ongoing costs are estimates and may vary based on actual usage, volume, and complexity.'
  ].forEach(t => {
    const lines = doc.splitTextToSize('•  ' + t, W - 2 * M);
    doc.text(lines, M, y);
    y += lines.length * 4.5 + 2;
  });

  // ── Footer ───────────────────────────────────────────────
  doc.setFillColor(...hdrBg);
  doc.rect(0, H - 14, W, 14, 'F');
  doc.setFontSize(8);
  doc.setTextColor(130, 140, 165);
  doc.text('Insight Consultants  •  Confidential  •  ORL Project Drive Thru', M, H - 5);
  doc.text('Page 1 of 1', W - M, H - 5, { align: 'right' });

  doc.save('ORL_Ownership_Summary.pdf');
}
