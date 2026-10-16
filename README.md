# AgencyPilot — Multi-Platform Ads Analytics & Decision Engine SaaS

Production-grade, responsive SaaS web application designed for individual media buyers, agencies, and performance marketers advertising across Meta, Google Ads, LinkedIn, Twitter, and Indian ad platforms (JioAds, Disney+ Hotstar, InMobi).

---

## 🌟 Key Highlights & Engineering Philosophy

- **Zero Fake Data Policy**: All analytics, cards, charts, and recommendations reflect **actual synchronized metrics**. If no provider is connected, the UI displays clear, honest, actionable empty states rather than invented percentages or imaginary sales.
- **28+ SaaS Benchmarked UI/UX**: Designed following deep analysis of category-defining platforms (*Linear, Stripe, Vercel, Supabase, Triple Whale, Madgicx*). Obsidian slate dark aesthetic, 1px subtle borders, tabular monospace numerals, and micro-interactions.
- **One Strong Math Engine**: Strictly centralized formulas (`CTR`, `CPC`, `CPM`, `CVR`, `CPA`, `ROAS`, `ROI`) in `src/lib/analytics/calculator.ts` eliminating code duplication. Zero division-by-zero, zero `NaN`, and zero `Infinity`.
- **High-Priority "Needs Attention" Detector**: Automated rule-based diagnosis flagging ad spend without conversions, CPA exceeding targets by >50%, and ad fatigue with concrete supporting mathematical evidence.
- **Dedicated AI Analyst**: Workspace-isolated conversational agent accessible from the sidebar answering questions using ground-truth data citations.
- **Two-Step Account Deletion**: Strict safety workflow (Step 1: Billing & subscription impact warning; Step 2: Permanent data deletion confirmation).
- **Team Management**: Workspace invitation system with immediate role revocation and strict cross-tenant data isolation.

---

## 🚀 5 Primary SaaS Navigation Routes

1. **Dashboard (`/dashboard`)**:
   - Consolidated cross-platform KPI cards (Spend, Active Ads, Impressions, Clicks, Conversions, ROAS).
   - Global filters for Date Range (Today, 7D, 30D, 90D, Custom), Provider, Campaign, and Currency.
   - Time-series spend & click performance trend chart.
   - Multi-provider comparison table with drill-down navigation.

2. **Ads Analysis (`/ads-analysis`)**:
   - **Section 1: "Needs Attention"**: Flagged problem ads categorized by Critical, High, and Medium severity with detection context.
   - **Section 2: All Ads Table**: Unified multi-provider data table with search, sorting, and pagination.
   - **Deep Diagnostic Modal**: 18 diagnostic metric dimensions, landing page verification, anomaly details, and evidence-backed recommendations.

3. **Ad Provider Connections (`/providers`)**:
   - Intentionally minimal in Phase 1 as requested.
   - Backed by an extensible adapter architecture (`src/lib/providers/types.ts`) ready for future OAuth integrations.

4. **Workspace Settings (`/settings`)**:
   - **Profile**: Display name and avatar settings.
   - **Team Management**: Invite registered users, assign Owner/Member roles, and revoke access immediately.
   - **Billing & Plans**: Current tier display, renewal dates, and plan tier comparisons.
   - **Security**: Current password verification and secure bcrypt updates.
   - **Two-Step Account Deletion**: Formal safety flow with audit trail.

5. **AI Agent (`/ai-agent`)**:
   - Pinned at the bottom of the left sidebar.
   - Answers queries with citations to real active campaigns and problem ads.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 14 (App Router) + TypeScript |
| **Styling** | Tailwind CSS + CVA + Lucide Icons |
| **Database** | PostgreSQL + Prisma ORM |
| **Authentication** | NextAuth.js (Credentials, bcrypt, JWT) |
| **State & Notifications**| React Context Toast System |
| **AI Integration** | Google Gemini API (`@google/generative-ai`) with deterministic fallback |
| **Validation** | Zod Server-Side Schema Validation |
| **Testing** | Jest + TypeScript |

---

## 📦 Setup & Local Development

### 1. Prerequisites
- Node.js 18.x or 20.x
- PostgreSQL database (or Supabase / Neon connection string)

### 2. Clone & Install
```bash
git clone https://github.com/SidGudadhe/AgencyPilot-saas.git
cd AgencyPilot-saas
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update your database URL and NextAuth secret:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/agencypilot?schema=public"
NEXTAUTH_SECRET="your-32-char-random-secret"
NEXTAUTH_URL="http://localhost:3000"
GEMINI_API_KEY="your-gemini-api-key"
```

### 4. Database Setup & Migrations
```bash
npx prisma generate
npx prisma db push
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Running Automated Tests

```bash
npm test
```
The test suite validates:
- All financial and advertising formulas (`calculateCTR`, `calculateCPC`, `calculateROAS`, `calculateTrueROI`, zero division safety).
- Anomaly detector severity ratings and threshold triggers.
- Multi-tenant workspace data isolation and role boundaries.
- Two-step account deletion validation.

---

## 🔒 Security & Tenant Isolation

- **Workspace Scoped Queries**: Every single API query enforces `where: { workspaceId }`. A user can never read, modify, or delete another workspace's records by manipulating IDs.
- **Server Authorization**: Protected API routes check `requireWorkspaceAccess(req, role)` on the backend. Frontend UI buttons never act as the sole barrier.
- **Credential Storage**: Provider tokens and secrets are stored encrypted at rest. Passwords use bcrypt hashing with 12 salt rounds.

---

## 🗺️ Codebase & File Roadmap

For complete file descriptions and technical extensions, refer to [`ROADMAP.md`](./ROADMAP.md).
