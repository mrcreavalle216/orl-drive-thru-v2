// ─── Agent Data ─────────────────────────────────────────────
// Edit rates, costs, phases, and features here.
// Images live in /images/{name}.png — just drop in a new file to update.

const AGENTS = [
  {
    name: "Stella",
    icon: "🎙",
    subRate: 1900,
    buildCost: 64500,
    tokenCost: 250,
    goLive: 1,
    phase: "Phase 1",
    color: "#0f4c75",
    timeSaved: "8 hrs/day"
  },
  {
    name: "Iris",
    icon: "👁",
    subRate: 2763,
    buildCost: 49620,
    tokenCost: 125,
    goLive: 3,
    phase: "Phase 2",
    color: "#3282b8",
    timeSaved: "12 hrs/day"
  },
  {
    name: "Nora",
    icon: "✉",
    subRate: 3095,
    buildCost: 54000,
    tokenCost: 50,
    goLive: 3,
    phase: "Phase 2",
    color: "#1b7a3d",
    timeSaved: "6 hrs/day"
  },
  {
    name: "Sage",
    icon: "⚖",
    subRate: 5968,
    buildCost: 99500,
    tokenCost: 150,
    goLive: 5,
    phase: "Phase 3",
    color: "#6b8e23",
    timeSaved: "16 hrs/day"
  },
  {
    name: "Paige",
    icon: "📄",
    subRate: 2100,
    buildCost: 37500,
    tokenCost: 200,
    goLive: 5,
    phase: "Phase 3",
    color: "#d4a017",
    timeSaved: "6 hrs/day"
  },
  {
    name: "Knox",
    icon: "🛡",
    subRate: 4089,
    buildCost: 69000,
    tokenCost: 110,
    goLive: 7,
    phase: "Phase 4",
    color: "#b33a3a",
    timeSaved: "10 hrs/day"
  },
  {
    name: "Atlas",
    icon: "🗺",
    subRate: 1768,
    buildCost: 31880,
    tokenCost: 75,
    goLive: 7,
    phase: "Phase 4",
    color: "#8b4513",
    timeSaved: "6 hrs/day"
  },
  {
    name: "Maven",
    icon: "📊",
    subRate: 3317,
    buildCost: 57000,
    tokenCost: 25,
    goLive: 9,
    phase: "Phase 5",
    color: "#6a0dad",
    timeSaved: "4 hrs/day"
  }
];

// ─── Feature Descriptions ───────────────────────────────────

const FEATURES = {
  Stella: {
    desc: "Voice & Intake",
    team: "CES Team",
    features: [
      "Inbound call routing, qualification & warm transfer",
      "Automated loan application intake via voice + IVR",
      "Automated soft pull trigger & pre-qual result delivery",
      "Appointment scheduling & callback management",
      "FAQ handling — loan status, rate quotes, doc requirements",
      "Bilingual support (English/Spanish) via ElevenLabs"
    ],
    deps: "None — standalone at launch",
    hitl: "Escalation to live LCA for complex scenarios"
  },
  Iris: {
    desc: "Phase 0 & Payoff Processing",
    team: "LP Team",
    features: [
      "Payoff quote retrieval & lienholder contact",
      "Good-through date tracking & payoff expiration monitoring",
      "Phase 0 task automation & checklist management",
      "Account verification & balance confirmation",
      "Payoff renewal processing",
      "Pre-funding condition assembly"
    ],
    deps: "Stella (intake data); Upstream to Sage",
    hitl: "Manual review of payoff discrepancies"
  },
  Nora: {
    desc: "Borrower Communication",
    team: "LCA Teams",
    features: [
      "Automated borrower status updates (application → closing)",
      "Missing document follow-up & re-engagement outreach",
      "Conditional approval notifications with action items",
      "E-sign delivery tracking & completion reminders",
      "Multi-channel outreach — email, SMS, in-app",
      "Appointment confirmation & rescheduling automation"
    ],
    deps: "Stella (contact info); Iris (doc status); Sage (approvals)",
    hitl: "Graph mail send (HITL gate per architecture)"
  },
  Sage: {
    desc: "Underwriting & Decision Engine",
    team: "Credit Team",
    features: [
      "Automated credit analysis — tradeline parsing, derogatory flags",
      "DTI & LTV calculation with real-time ratio monitoring",
      "Risk scoring & pricing tier assignment",
      "Guideline matching — product eligibility across lender programs",
      "Compliance pre-screening (ECOA, UDAAP, fair lending)",
      "Conditional approval generation with stipulation list"
    ],
    deps: "Iris (verified data); Knox (identity confirmed)",
    hitl: "Final underwriting sign-off; pricing exceptions"
  },
  Paige: {
    desc: "Document Generation & DocuSign",
    team: "Sales Doc Specialist",
    features: [
      "Loan document package generation (disclosures, notes, riders)",
      "Closing package assembly & compliance validation",
      "Initial disclosure (LE/CD) preparation & delivery tracking",
      "DocuSign package preparation & routing",
      "Document versioning, audit trail & change tracking",
      "Regulatory timing compliance (TRID, 3-day rule)"
    ],
    deps: "Sage (approved terms); Atlas (title cleared)",
    hitl: "DocuSign send (HITL gate per architecture)"
  },
  Knox: {
    desc: "Identity & Compliance",
    team: "Funders Team",
    features: [
      "Identity verification & proofing (KYC/KBA challenge)",
      "Fraud signal detection — synthetic identity, velocity checks",
      "OFAC, SDN & watchlist screening with match resolution",
      "Stipulation verification & document compliance review",
      "Funding condition verification & clearance tracking",
      "Red flag alerts with severity scoring & escalation routing"
    ],
    deps: "Stella (applicant PII); Upstream to Sage",
    hitl: "SAR filing; manual OFAC match adjudication"
  },
  Atlas: {
    desc: "Deal Lifecycle & Titles",
    team: "Titles Team",
    features: [
      "Title search coordination & order tracking",
      "Lien position verification & clearance monitoring",
      "Deal milestone tracking across pipeline stages",
      "Closing coordination — scheduling, checklist, conditions",
      "LOS status updates & cross-system sync",
      "Exception & curative item tracking to clear-to-close"
    ],
    deps: "Knox (identity); Paige (docs); Upstream to Maven",
    hitl: "LOS write (HITL gate); FedEx ship (HITL gate)"
  },
  Maven: {
    desc: "Reporting & Analytics",
    team: "Management",
    features: [
      "Pipeline performance dashboards — volume, velocity, conversion",
      "Per-agent & per-LCA productivity metrics",
      "Conversion funnel analysis with stage-level drop-off",
      "SLA compliance monitoring & breach alerts",
      "Trend detection — rate lock expiry, funding delays, seasonal",
      "Automated daily/weekly summary reports to management"
    ],
    deps: "All agents (aggregates entire platform)",
    hitl: "None — read-only analytics, no write operations"
  }
};

// ─── Ownership Payment Schedule ─────────────────────────────
// Per-agent buildCost stays the same ($463K total) — this controls WHEN it's billed.
// $32,250 deferred from Phase 1 and $35,750 deferred from Phase 2 to July 2027 (M11).
const PAYMENT_SCHEDULE = [
  { phase: 1, month: 1,  label: "Phase 1 — Stella",         amount: 32250  },
  { phase: 2, month: 3,  label: "Phase 2 — Iris, Nora",     amount: 67870  },
  { phase: 3, month: 5,  label: "Phase 3 — Sage, Paige",    amount: 137000 },
  { phase: 4, month: 7,  label: "Phase 4 — Knox, Atlas",    amount: 100880 },
  { phase: 5, month: 9,  label: "Phase 5 — Maven",          amount: 57000  },
  { phase: 0, month: 11, label: "Deferred — Jul 2027",      amount: 68000  }
];
// Verify: 32250 + 67870 + 137000 + 100880 + 57000 + 68000 = 463000

// ─── Constants ──────────────────────────────────────────────

const TOTAL_MONTHS = 36;
const FOUNDATION_FEE = 40000;
const PASSWORD = "ORL2026";
