# AgencyPilot SaaS — Master Architecture & File Roadmap

This document serves as the permanent blueprint for **AgencyPilot SaaS**. Every module, file, shared helper, and API endpoint is mapped here so any future developer or team member can immediately understand, maintain, and extend the codebase.

---

## 1. Directory Tree & File Inventory

```
AgencyPilot-saas/
├── .env.example                       # Canonical environment template (no secrets)
├── .gitignore                         # Strict exclusion rules for tokens, build output, DB
├── package.json                       # Dependencies & build scripts
├── tsconfig.json                      # Next.js 14 strict TypeScript configuration
├── tailwind.config.ts                 # Custom Obsidian/Slate SaaS design tokens
├── postcss.config.js                  # PostCSS Tailwind + Autoprefixer
├── next.config.mjs                    # Next.js runtime configuration
├── ROADMAP.md                         # This architecture roadmap
├── prisma/
│   ├── schema.prisma                  # Complete PostgreSQL schema (22 models, 14 enums)
│   └── seed.ts                        # Safe bootstrap script (creates schemas, zero fake ads)
├── src/
│   ├── app/                           # Next.js 14 App Router
│   │   ├── layout.tsx                 # Root layout with Auth & Toast providers
│   │   ├── page.tsx                   # Public landing / smart redirect to dashboard or login
│   │   ├── login/
│   │   │   └── page.tsx               # Enterprise email/password login page
│   │   ├── register/
│   │   │   └── page.tsx               # Registration with automatic personal workspace creation
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx             # Protected App Shell (Sidebar, Header, Workspace Switcher)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx           # Page 1: Consolidated Dashboard (KPIs, Charts, Providers)
│   │   │   ├── ads-analysis/
│   │   │   │   └── page.tsx           # Page 2: Ads Analysis (All Ads Table, Detail Modal, Needs Attention)
│   │   │   ├── providers/
│   │   │   │   └── page.tsx           # Page 3: Ad Provider Connections (Intentionally minimal)
│   │   │   ├── settings/
│   │   │   │   └── page.tsx           # Page 4: Workspace Settings (Profile, Billing, Password, Team, Deletion)
│   │   │   └── ai-agent/
│   │   │       └── page.tsx           # Page 5: AI Agent chat interface with workspace data tool calling
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── [...nextauth]/     # NextAuth credentials authentication handler
│   │       │   └── register/          # User registration & workspace creation endpoint
│   │       ├── workspace/
│   │       │   ├── current/           # Active workspace metadata & memberships
│   │       │   ├── members/           # List, invite, and remove team members
│   │       │   └── invitations/       # Accept or decline workspace invitations
│   │       ├── dashboard/
│   │       │   └── metrics/           # Aggregated real metrics filtered by date & provider
│   │       ├── ads/
│   │       │   ├── route.ts           # Unified all ads query (search, sort, filter, pagination)
│   │       │   ├── [adId]/route.ts    # Deep ad performance details & 18 diagnostic data points
│   │       │   └── attention/         # "Needs Attention" rule-based flagged ads
│   │       ├── recommendations/
│   │       │   ├── route.ts           # List active recommendations
│   │       │   └── [recId]/status/    # Update lifecycle (New → Reviewing → Applied → Dismissed)
│   │       ├── settings/
│   │       │   ├── profile/           # Update user display name and profile fields
│   │       │   ├── password/          # Secure password change with current password verification
│   │       │   ├── billing/           # Subscription status and invoice retrieval
│   │       │   └── delete-account/    # Two-step account deletion confirmation engine
│   │       └── ai-agent/
│   │           └── chat/              # Workspace-isolated AI conversation stream & data tools
│   ├── components/                    # Reusable React components
│   │   ├── ui/                        # Reusable DRY design system primitives
│   │   │   ├── button.tsx             # Standard CVA Button with variants & loading state
│   │   │   ├── card.tsx               # Card, CardHeader, CardTitle, CardContent
│   │   │   ├── badge.tsx              # Semantic status badges (success, warning, critical, neutral)
│   │   │   ├── input.tsx              # Form input with validation states
│   │   │   ├── select.tsx             # Styled select dropdown
│   │   │   ├── table.tsx              # Clean tabular components (Stripe-grade styling)
│   │   │   ├── modal.tsx              # Accessible dialog/modal overlay
│   │   │   ├── tabs.tsx               # Tabbed navigation switcher
│   │   │   ├── toast.tsx              # Notification context & floating toast system
│   │   │   ├── empty-state.tsx        # High-clarity "No real data / Connect provider" component
│   │   │   ├── metric-card.tsx        # KPI card with real value, trend, and empty handling
│   │   │   ├── data-table.tsx         # Unified generic sortable, paginated, searchable table
│   │   │   └── date-range-picker.tsx  # Preset & custom date range filter selector
│   │   ├── layout/
│   │   │   ├── sidebar.tsx            # Desktop persistent navigation sidebar (250px)
│   │   │   ├── header.tsx             # Top navbar with workspace selector & profile dropdown
│   │   │   └── mobile-nav.tsx         # Responsive mobile drawer navigation
│   │   ├── dashboard/
│   │   │   ├── filter-bar.tsx         # Global date, provider, and campaign filter bar
│   │   │   ├── kpi-grid.tsx           # Metric cards grid (Spend, Active Ads, CTR, Conversions, ROAS)
│   │   │   ├── performance-chart.tsx  # Trend visualization for spend, clicks, and conversions
│   │   │   └── provider-table.tsx     # Provider comparison breakdown table
│   │   ├── ads/
│   │   │   ├── ads-table.tsx          # Multi-platform all-ads unified table
│   │   │   ├── ad-detail-modal.tsx    # Comprehensive individual ad modal (18 metric dimensions)
│   │   │   ├── needs-attention.tsx    # High-priority problem detection cards with severity badges
│   │   │   └── recommendation-card.tsx# Recommendation item with evidence, rationale, and status actions
│   │   ├── settings/
│   │   │   ├── profile-form.tsx       # User display name and avatar updater
│   │   │   ├── password-form.tsx      # Secure password change form
│   │   │   ├── team-management.tsx    # Member list, role badges, invitation modal, remove flow
│   │   │   ├── billing-section.tsx    # Subscription status, plan details, payment history
│   │   │   └── delete-account-modal.tsx# Strict 2-step confirmation modal (Step 1 Billing, Step 2 Data)
│   │   └── ai/
│   │       ├── ai-chat-interface.tsx  # Chat box with streaming messages, citations, quick prompts
│   │       └── ai-message-bubble.tsx  # Message renderer with evidence badges and data tables
│   ├── lib/                           # Core utilities and business logic
│   │   ├── prisma.ts                  # Global Prisma client singleton
│   │   ├── auth.ts                    # NextAuth options, JWT session handling, password hashing
│   │   ├── utils.ts                   # Class name merger (clsx + twMerge), currency formatters
│   │   ├── workspace-guard.ts         # Single reusable workspace auth guard for all API routes
│   │   ├── analytics/
│   │   │   ├── calculator.ts          # Unified single math engine (CTR, CPC, CPM, CVR, ROAS, ROI)
│   │   │   ├── anomaly-detector.ts    # Rule-based detector for spend spikes, ad fatigue, zero conv
│   │   │   └── recommendation-engine.ts# Recommendation generator with confidence & evidence
│   │   └── providers/
│   │       ├── types.ts               # Canonical advertising data model & provider adapter interface
│   │       ├── registry.ts            # Provider registry for future plug-and-play integrations
│   │       └── adapters/              # Meta, Google Ads, JioAds adapter stubs ready for future OAuth
│   └── types/
│       ├── next-auth.d.ts             # Typed NextAuth session with userId and activeWorkspaceId
│       └── analytics.ts               # Shared types for metrics, recommendations, and filters
```

---

## 2. Core Architectural Principles (DRY & Extensible)

### Rule 1: One Strong Math Engine (`src/lib/analytics/calculator.ts`)
Instead of duplicating metric formulas across Dashboard, Ads Analysis, Detail View, and AI Agent, a single strongly typed engine handles all calculations:
- `calculateCTR(clicks, impressions)`
- `calculateCPC(spend, clicks)`
- `calculateCPM(spend, impressions)`
- `calculateCVR(conversions, clicks)`
- `calculateROAS(revenue, spend)`
- `calculateROI(profit, investment)` — Strictly requires cost inputs; never mislabels revenue as profit.
- Safe division: Zero denominators cleanly return `0` or `null` rather than `NaN` or `Infinity`.

### Rule 2: Unified Workspace Auth Guard (`src/lib/workspace-guard.ts`)
A single function `requireWorkspaceAccess(req, requiredRole?)` that:
1. Validates the session JWT.
2. Resolves the active workspace ID (from header, cookie, or query parameter).
3. Verifies that the user has an active `WorkspaceMembership`.
4. Checks required role (`OWNER` vs `MEMBER`).
5. Returns `{ user, workspace, membership }` or throws a typed `401/403` response.
This completely prevents cross-tenant data leakage in under 5 lines of code per route.

### Rule 3: Zero Fake Data Policy
Every component inspects the database records:
- If 0 provider integrations are connected, the UI displays clear, honest, actionable empty states with a direct invitation to connect.
- No fabricated percentages or fictional marketing figures are ever shown.

### Rule 4: Future-Ready Provider Adapter Architecture (`src/lib/providers/`)
The `AdProviderAdapter` interface defines:
- `authenticate(credentials)`
- `fetchAccounts()`
- `fetchCampaigns(accountId)`
- `fetchAds(campaignId)`
- `fetchMetrics(adId, dateRange)`
When real API keys (Meta Graph API, Google Ads API, JioAds) are provided in the future, developers only need to drop a new file in `src/lib/providers/adapters/` without altering the frontend or database schemas.
