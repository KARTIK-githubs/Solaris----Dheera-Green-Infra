# SOLARIS — Together We Shine Brighter

An intelligent, regulation-aware solar adoption, community solar planning, affordability optimisation, and transparent credit allocation platform designed for India, starting with Delhi (BSES Rajdhani Power Limited, BSES Yamuna Power Limited, Tata Power DDL).

**Primary SDG Alignment:**

- **SDG 8** — Decent Work and Economic Growth
- **SDG 9** — Industry, Innovation, and Infrastructure
- Supporting **SDG 7** — Affordable and Clean Energy

---

## Architecture & Technology Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4 design tokens, Material Symbols & Lucide Icons, Canvas Confetti
- **State Management & Persistence:** Centralized `AppContext` with live reactive recalculations and localStorage persistence for CA numbers, budget preferences, consent agreements, and audit history
- **Solar Engineering Engine (`src/utils/solarCalculations.ts`):** Deterministic calculations for Delhi insolation (~1,420 kWh/kWp/year), DERC LT-1 domestic tariff brackets, and official PM Surya Ghar: Muft Bijli Yojana subsidies (capped at ₹78,000 for residential 3kW+)
- **Smart Affordability Optimiser (`src/utils/optimiserEngine.ts`):** Exact combinatorial linear solver optimizing binary participant selection, adhering strictly to budget ceilings, non-negative allocations, 100.0% zero-shortfall reconciliation, and EMI_i < ΔBill_i personal net benefit constraints
- **Audit & Governance:** Continuous logging of all regulatory approvals, member consent e-signatures, and solver executions in an immutable audit ledger
- **Build:** Vite 8, ESM, hash-based routing (no React Router), localStorage-only auth (SHA-256 via Web Crypto API)

---

## Supported Roles

| Role                        | Demo User   | Context                                                               |
| --------------------------- | ----------- | --------------------------------------------------------------------- |
| Household / Resident        | Rohit Rao   | Flat 301, Pocket 2 RWA, 5.0 kW Sanctioned load                        |
| MSME / Business Owner       | Alok Gupta  | Shree Fabric Mills, 25.0 kW Sanctioned load, accelerated depreciation |
| RWA / Community Coordinator | Anita Verma | General Secretary, Gulmohar Enclave RWA                               |

---

## Implemented Routes & Features

| Route                | Feature                                                                                           | Status       |
| -------------------- | ------------------------------------------------------------------------------------------------- | ------------ |
| `/`                  | Public Landing Page                                                                               | **Complete** |
| `/login`             | Email/password login                                                                              | **Complete** |
| `/signup`            | Account creation → onboarding                                                                     | **Complete** |
| `/onboarding`        | 5-step profile wizard (DISCOM, CA, bill, housing, terrace, solar goal)                            | **Complete** |
| `/dashboard`         | Main cockpit (KPIs, generation chart, consent banner, activity feed)                              | **Complete** |
| `/assessment`        | Solar feasibility calculator (sizing, subsidy, payback, 3-model matrix)                           | **Complete** |
| `/regulations`       | Regulatory checker (Residential/MSME tabs, VNM/CAPEX/GNM/P2P)                                     | **Complete** |
| `/community`         | Community workspace (roster, governance, timeline, terrace envelope)                              | **Complete** |
| `/optimiser`         | Smart affordability optimiser (linear solver, stress tests, scenario tabs)                        | **Complete** |
| `/credit-allocation` | Transparent allocation ledger (radial dial, node cards, lifecycle, reconciliation)                | **Complete** |
| `/monitoring`        | Synthetic O&M panel (inverter, generation, performance ratio, alerts)                             | **Complete** |
| `/reports`           | Exportable statements (feasibility, community, optimisation, allocation, regulatory, maintenance) | **Complete** |
| `/admin`             | Read-only audit logs & statutory rules                                                            | **Complete** |

---

## Critical End-to-End Demo Flow

1. **Landing** → Explore solar potential, review 4-step roadmap
2. **Signup** → Create account (email/password) → auto-redirect to onboarding
3. **Onboarding** → Select DISCOM (BRPL), verify CA #102948192, adjust monthly bill (₹6,850), pick housing/terrace, choose "Join Community Solar (VNM)"
4. **Assessment** → Calculates 4.2 kWp optimal, ₹1.32L net cost after ₹78k subsidy, 2.4-year payback
5. **Regulations** → Reviews DERC VNM 2024 clearance
6. **Community** → Inspects Gulmohar Enclave RWA cohort, capitalization progress
7. **Optimiser** → Tests 12 kWp, runs stress contingencies (Monsoon -20%, Rate spike +1.5%)
8. **Credit Allocation** → Verifies 100% reconciled radial allocation (Flat 301=40%, 204=35%, 102=25%)
9. **Consent** → Digital signature on VNM agreement, audit log entry
10. **Monitoring/Reports** → Downloads planning statement, checks synthetic telemetry

---

## Quick Start

### 1. Prerequisites
- **Node.js**: v20+ (tested on Node v24)
- **MongoDB** *(optional for local testing; required for database persistence)*: Running locally on port 27017 or remote via `MONGODB_URI`

### 2. Environment Setup
Copy the example environment file and configure variables as needed:
```bash
cp .env.example .env
```
Key environment variables:
- `PORT`: Backend server port (default: `5000`)
- `MONGODB_URI`: MongoDB connection string (default: `mongodb://127.0.0.1:27017/solaris_dheera`)
- `GROQ_API_KEY`: Groq API key for live AI assistant (optional; if omitted or invalid, the backend automatically uses the deterministic offline rule engine)
- `APP_URL`: Frontend host URL (default: `http://localhost:3000`)

### 3. Running Backend & Frontend

#### Option A: Run Both Concurrently (Recommended)
```bash
npm run dev:all
```

#### Option B: Run in Separate Terminals
**Terminal 1 (Backend API Server on port 5000):**
```bash
npm run server
```

**Terminal 2 (Vite Frontend on port 3000):**
```bash
npm run dev
```

### 4. Verification & Testing
```bash
# Type-check / lint TypeScript
npm run lint

# Run deterministic solar calculation & optimiser tests (12/12)
npm test

# Run backend API verification tests
npm run test:backend

# Production build
npm run build

# Preview production build
npm run preview
```

---

## Deployment (Vercel)

```bash
npm i -g vercel
vercel login
vercel
```

- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install --legacy-peer-deps`
- Hash-based routing works natively; `vercel.json` handles SPA rewrites

---

## Project Structure

```
src/
├── App.tsx                    # Root, routing, providers
├── main.tsx                   # Entry point
├── index.css                  # Tailwind v4 @theme, animations, focus rings
├── index.html                 # Viewport, fonts, Material Symbols
├── context/
│   └── AppContext.tsx         # Global state & actions
├── components/common/
│   ├── Header.tsx             # Top bar, user menu, mobile menu
│   ├── Sidebar.tsx            # Collapsible overlay drawer
│   ├── BottomNav.tsx          # Mobile bottom nav
│   ├── AuthShell.tsx          # Auth page layout
│   ├── ConsentModal.tsx       # Digital consent signing
│   ├── InviteModal.tsx        # Community invitations
│   └── ReportExportModal.tsx  # PDF/CSV export
├── pages/                     # 13 page components
├── utils/
│   ├── authStorage.ts         # LocalStorage auth (SHA-256)
│   ├── solarCalculations.ts   # Feasibility math
│   └── optimiserEngine.ts     # LP solver for allocation
├── data/
│   └── mockData.ts            # Demo users, community, rules, tickets
└── types/
    └── index.ts               # TypeScript interfaces
```

---

## Key Implementation Details

### Authentication

- LocalStorage-only (no backend)
- SHA-256 via Web Crypto API (fallback FNV-1a)
- Keys: `solaris_auth_accounts`, `solaris_auth_session`, `solaris_user`, `solaris_role`, `solaris_community`, `solaris_logs`
- Onboarding required **only after signup** (flag `needsOnboarding`)

### Optimiser (Deterministic Linear Program)

- Runs client-side in <10ms via `useEffect` in AppContext
- Maximizes participants with net positive savings
- Constraints: budget ceiling, EMI cap (₹4,500/mo), DERC transformer limits, sanctioned load
- Stress tests: Monsoon -20%, Rate spike +1.5%, Unit dropout, Subsidy delay
- Outputs: share %, kWp, kWh, EMI, net benefit, resilience rating

### Accessibility (WCAG 2.1 AA)

- Contrast ≥ 4.5:1 (muted text #5f6865)
- Focus rings on all interactive elements
- ARIA roles on tabs, accordions, menus
- Reduced motion support (`prefers-reduced-motion`)
- Touch targets ≥ 44×44px
- Viewport zoom enabled
- No emoji as structural icons (Material Symbols only)

---

## Statutory Disclaimer

Solaris provides regulatory planning guidance and algorithmic simulation models under Delhi Electricity Regulatory Commission (DERC) regulations. Official metering approvals, sanctioned load expansions, and final electricity tariff credit settlements are administered strictly by authorized DISCOMs (BSES Rajdhani, BSES Yamuna, Tata Power DDL). Documents generated by Solaris are internal planning statements and do not represent official utility electricity bills.

---

## Hackathon Metadata

- **Event:** Prompt-ae-thon
- **Built with:** opencode
- **Design System:** ui-ux-pro-max skill (Glassmorphism + Community/Forum Landing)
- **Repository:** [GitHub](https://github.com/aryandas2911/Solaris)
