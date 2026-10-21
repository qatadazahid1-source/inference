# ORDISUM — COMPLETE FEATURE INVENTORY
> Generated: 2026-10-06 | Source: Deep scan of production codebase | No code was modified.

---

## 1. FRONTEND ROUTES

### 1.1 Public / Marketing Pages
| Route | Component | Description |
|---|---|---|
| `/` | `LandingPage` | Hero, features, social proof, CTA |
| `/features` | `FeaturesPage` | Static features marketing page |
| `/pricing` | `PricingPage` | Public pricing tiers |
| `/security` | `SecurityPage` | Security trust page |
| `/contact-sales` | `ContactSales` | Enterprise contact form |
| `/blog` | `BlogList` | CMS-driven blog index |
| `/blog/:slug` | `BlogPost` | Individual blog post |
| `/docs` | Redirect → `/docs/overview` | Docs root redirect |
| `/docs/:slug` | `DocsPage` | Documentation article viewer |
| `/privacy-policy` | `PrivacyPolicy` | Legal — Privacy Policy |
| `/terms` | `TermsOfService` | Legal — Terms of Service |
| `/refund-policy` | `RefundPolicy` | Legal — Refund Policy |
| `/alternatives/helicone` | `HeliconePage` | Static alternative page |
| `/alternatives/langfuse` | `LangfusePage` | Static alternative page |
| `/alternatives/portkey` | `PortkeyPage` | Static alternative page |
| `/alternatives/litellm` | `LiteLLMPage` | Static alternative page |
| `/alternatives/:slug` | `MarketingPage` | CMS-driven alternative pages |
| `/use-cases/ai-cost-monitoring` | `CostMonitoringPage` | Static use case page |
| `/use-cases/ai-budget-management` | `BudgetManagementPage` | Static use case page |
| `/use-cases/ai-roi-measurement` | `RoiMeasurementPage` | Static use case page |
| `/use-cases/:slug` | `MarketingPage` | CMS-driven use case pages |
| `/:slug` | `StaticPage` | Dynamic CMS-driven static pages |
| `*` | `NotFound` | 404 page (noindex) |

### 1.2 Auth Pages
| Route | Component | Description |
|---|---|---|
| `/auth/signin` `/signin` `/login` | `SignIn` | Sign-in with Supabase Auth |
| `/auth/signup` `/signup` `/register` | `SignUp` | Sign-up with invitation token support |
| `/auth/callback` | `AuthCallback` | Supabase OAuth redirect handler |

### 1.3 Onboarding
| Route | Component | Description |
|---|---|---|
| `/onboarding` | `Onboarding` | Multi-step onboarding flow for new users |

### 1.4 Dashboard Pages (Protected — requires auth + active subscription/trial)
| Route | Component | Description |
|---|---|---|
| `/dashboard` | `Overview` | Spend, tokens, ROI, anomaly summary |
| `/dashboard/cost-analytics` | `CostAnalytics` | Cost by provider, model, time |
| `/dashboard/roi-calculator` | `ROICalculator` | AI ROI calculator |
| `/dashboard/budget-manager` | `BudgetManager` | Budget rules, usage, alerts, hard limits |
| `/dashboard/api-usage` | `APIUsage` | Detailed API usage logs |
| `/dashboard/reports` | `Reports` | Scheduled/on-demand reports, PDF/XLSX export |
| `/dashboard/integrations` | `Integrations` | AI provider API key management |
| `/dashboard/alerts` | `Alerts` | In-app alerts (budget/anomaly events) |
| `/dashboard/benchmarks` | `Benchmarks` | Model benchmark comparisons (entitlement-gated) |
| `/dashboard/playground` | `Playground` | AI model testing playground |

### 1.5 Settings Pages (Protected)
| Route | Component | Description |
|---|---|---|
| `/settings/profile` | `Profile` | Name, avatar, change email |
| `/settings/security` | `Security` | 2FA, sessions, login history |
| `/settings/notifications` | `Notifications` | Per-channel notification preferences |
| `/settings/organization` | `Organization` | Org name, logo, description |
| `/settings/team` | `Team` | Members, invite, remove, change role |
| `/settings/billing` | `Billing` | Subscription, plan management, payment method |
| `/settings/slack` | `SlackSettings` | Slack OAuth connect/disconnect, channel selection |

### 1.6 Admin Pages (Platform Admin Only — requires `is_platform_admin = true`)
| Route | Component | Description |
|---|---|---|
| `/admin` | Redirect → `/admin/pricing` | Admin root |
| `/admin/pricing` | `ModelPricingPage` | Model pricing CRUD |
| `/admin/portkey-fetch` | `PortkeyFetchDashboard` | Portkey pricing sync |
| `/admin/pricepertoken-sync` | `PricePerTokenSyncPage` | PricePerToken staged import |
| `/admin/organizations` | `OrganizationsPage` | All organizations list |
| `/admin/organizations/:id` | `OrganizationDetailPage` | Org detail: members, subscription, usage |
| `/admin/health` | `SystemHealthPage` | System health, audit log, failed requests |
| `/admin/analytics` | `AdminAnalyticsPage` | Platform-level usage analytics |
| `/admin/users` | `AdminUsersPage` | All users management |
| `/admin/budgets` | `AdminBudgetsPage` | Platform-wide budget overview |
| `/admin/integrations` | `AdminIntegrationsPage` | Provider integrations admin |
| `/admin/reports` | `AdminReportsPage` | Platform report management |
| `/admin/site-links` | `AdminSiteLinksPage` | CMS navigation links editor |
| `/admin/landing-pricing` | `AdminLandingPricingPage` | Marketing pricing content editor |
| `/admin/pricing-agent` | `PricingAgent` | AI Pricing Agent interface |
| `/admin/pages` | `AdminPagesPage` | Static page CMS |
| `/admin/blog` | `AdminBlogPage` | Blog CMS (CRUD) |
| `/admin/providers` | `AdminProvidersPage` | AI providers list editor |
| `/403` | `Forbidden403` | Forbidden page |

---

## 2. BACKEND API ROUTES

### 2.1 Public (`/api/public` — no auth)
| Method | Path | Description |
|---|---|---|
| GET | `/api/public/site-links` | Nav/footer links |
| GET | `/api/public/pricing-plans` | Public pricing plans |
| GET | `/api/public/pages/:slug` | Single CMS static page |
| GET | `/api/public/blog` | Blog post list |
| GET | `/api/public/blog/:slug` | Single blog post |
| GET | `/api/public/sitemap.xml` | Auto-generated XML sitemap |
| POST | `/api/public/contact` | Contact sales form submission |

### 2.2 Profile (`/api/profile`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/profile/` | Get user profile |
| PATCH | `/api/profile/` | Partial update profile |
| PUT | `/api/profile/` | Full update profile |
| POST | `/api/profile/avatar` | Upload avatar |
| POST | `/api/profile/change-email` | Request email change |
| DELETE | `/api/profile/` | Delete account |

### 2.3 Security (`/api/security`)
| Method | Path | Description |
|---|---|---|
| POST | `/api/security/track-login` | Record login event |
| GET | `/api/security/2fa` | Get 2FA status |
| POST | `/api/security/2fa/start` | Begin TOTP enrollment |
| POST | `/api/security/2fa/verify` | Verify TOTP and activate |
| POST | `/api/security/2fa/disable` | Disable 2FA |
| POST | `/api/security/2fa/backup-codes/regenerate` | Regenerate backup codes |
| GET | `/api/security/sessions` | List active sessions |
| POST | `/api/security/sessions/:id/revoke` | Revoke single session |
| POST | `/api/security/sessions/revoke-all` | Revoke all sessions |
| GET | `/api/security/login-history` | View login history |

### 2.4 Organization (`/api/organization`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/organization/` | Get organization details |
| PATCH | `/api/organization/` | Update organization details |
| POST | `/api/organization/logo` | Upload org logo |
| GET | `/api/organization/access` | Check subscription/trial access |
| GET | `/api/organization/entitlements` | Get full plan entitlements |

### 2.5 Analytics (`/api/analytics`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/analytics/logs` | Usage logs with filters (entitlement-gated) |
| GET | `/api/analytics/` | Aggregated analytics stats |

### 2.6 API Keys (`/api/api-keys`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/api-keys/` | List provider API keys |
| GET | `/api/api-keys/providers` | Available AI providers |
| POST | `/api/api-keys/` | Add provider key (limit: `integrations`) |
| PUT | `/api/api-keys/:id` | Update provider key |
| DELETE | `/api/api-keys/:id` | Delete provider key |

### 2.7 Platform Keys (`/api/platform-keys`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/platform-keys/` | List platform API keys (`ii_sk_...`) |
| POST | `/api/platform-keys/` | Create platform key (limit: `platform_keys`) |
| DELETE | `/api/platform-keys/:id` | Revoke platform key |

### 2.8 Budgets (`/api/budgets`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/budgets/` | List budget rules |
| GET | `/api/budgets/summary` | Spend vs. budget summary |
| GET | `/api/budgets/alerts` | Budget alert events |
| PUT | `/api/budgets/:id/hard-limit` | Set hard limit |
| PUT | `/api/budgets/alerts/:id/read` | Mark alert as read |

### 2.9 Alert Rules (`/api/alert-rules`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/alert-rules/` | List alert rules |
| POST | `/api/alert-rules/` | Create alert rule (limit: `alert_rules`) |
| PUT | `/api/alert-rules/:id` | Update alert rule |
| DELETE | `/api/alert-rules/:id` | Delete alert rule |
| POST | `/api/alert-rules/check` | Manually trigger alert evaluation |

### 2.10 In-App Alerts (`/api/alerts`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/alerts/` | Get in-app alerts |
| PUT | `/api/alerts/:id/read` | Mark alert as read |
| DELETE | `/api/alerts/:id` | Dismiss alert |

### 2.11 Anomalies (`/api/anomalies`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/anomalies/` | List anomalies (feature: `anomaly_detection`) |
| GET | `/api/anomalies/:id` | Get anomaly detail |
| PUT | `/api/anomalies/:id` | Acknowledge/dismiss anomaly |
| POST | `/api/anomalies/run` | Manually trigger detection |

### 2.12 Reports (`/api/reports`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/reports/` | List reports (feature: `reports`) |
| GET | `/api/reports/:id/snapshot` | Get report data snapshot |
| GET | `/api/reports/:id/download/pdf` | Download PDF (feature: `pdf_export`) |
| GET | `/api/reports/:id/download/xlsx` | Download XLSX (feature: `csv_export`) |
| POST | `/api/reports/` | Create report (feature: `reports`) |
| DELETE | `/api/reports/:id` | Delete report |

### 2.13 Slack (`/api/slack`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/slack/` | Get Slack status (feature: `slack_alerts`) |
| GET | `/api/slack/oauth/init` | Start OAuth flow |
| GET | `/api/slack/oauth/callback` | OAuth callback (state-verified, public) |
| GET | `/api/slack/channels` | List Slack channels |
| POST | `/api/slack/channel` | Save selected channel |
| DELETE | `/api/slack/` | Disconnect Slack |
| POST | `/api/slack/test` | Send test message |

### 2.14 Webhooks (`/api/webhooks`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/webhooks/` | List endpoints (feature: `webhooks`) |
| POST | `/api/webhooks/` | Create endpoint |
| PUT | `/api/webhooks/:id` | Update endpoint |
| DELETE | `/api/webhooks/:id` | Delete endpoint |
| GET | `/api/webhooks/:id/subscriptions` | List event subscriptions |
| POST | `/api/webhooks/:id/subscriptions` | Add event subscription |
| DELETE | `/api/webhooks/:id/subscriptions/:subId` | Remove subscription |
| GET | `/api/webhooks/:id/deliveries` | Delivery log |

### 2.15 Billing (`/api/billing`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/billing/payment-method-url` | Get Lemon Squeezy payment update URL |
| POST | `/api/billing/cancel-subscription` | Cancel subscription |
| POST | `/api/billing/resume-subscription` | Resume cancelled subscription |

### 2.16 Benchmarks / Proxy / Gateway
| Method | Path | Description |
|---|---|---|
| GET | `/api/benchmarks/` | Model benchmarks (feature: `benchmarks`) |
| POST | `/api/proxy/chat` | Dashboard AI proxy (session auth) |
| POST | `/api/proxy/generate` | Legacy alias for `/api/proxy/chat` |
| POST | `/v1/chat/completions` | OpenAI-compatible gateway (Platform Key auth) |
| GET | `/api/health` | Health check |

### 2.17 Admin Routes (`/api/admin` — Platform Admin Only)

**Users**
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/users/` | All users |
| GET | `/api/admin/users/:id` | User detail |
| PUT | `/api/admin/users/:id/role` | Change org role |
| PUT | `/api/admin/users/:id/platform-admin` | Grant/revoke platform admin |
| PUT | `/api/admin/users/:id/status` | Activate/deactivate |

**Organizations**
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/organizations/` | All organizations |
| GET | `/api/admin/organizations/:id` | Org detail |
| PUT | `/api/admin/organizations/:id/status` | Change org status |
| POST | `/api/admin/organizations/:id/give-plan` | Assign plan to org |

**Model Pricing**
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/pricing/` | All model pricing records |
| POST | `/api/admin/pricing/` | Create pricing record |
| PUT | `/api/admin/pricing/:id` | Update record |
| DELETE | `/api/admin/pricing/:id` | Delete record |
| GET | `/api/admin/pricing/audit-log` | Pricing audit log |
| POST | `/api/admin/pricing/portkey-fetch` | Portkey sync |
| POST | `/api/admin/pricing/apply-portkey-sync` | Apply Portkey sync |
| POST | `/api/admin/pricing/run-openrouter-sync` | OpenRouter sync |
| POST | `/api/admin/pricing/apply-openrouter-sync` | Apply OpenRouter sync |
| POST | `/api/admin/pricing/sync-groq` | Groq sync |
| POST | `/api/admin/pricing/sync-custom-urls` | Custom URL sync |

**PricePerToken Staged Import**
| Method | Path | Description |
|---|---|---|
| POST | `/api/admin/pricepertoken/fetch` | Fetch and stage from PricePerToken.info |
| GET | `/api/admin/pricepertoken/diff/:importId` | Diff staged vs current |
| POST | `/api/admin/pricepertoken/apply/:importId` | Apply staged import |
| POST | `/api/admin/pricepertoken/cancel/:importId` | Cancel staged import |
| GET | `/api/admin/pricepertoken/imports` | List all import sessions |

**Plans**
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/plans/` | List plans |
| POST | `/api/admin/plans/` | Create plan |
| PUT | `/api/admin/plans/:id` | Update plan |
| DELETE | `/api/admin/plans/:id` | Delete plan |

**System Health**
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/system/health` | System health metrics |
| GET | `/api/admin/system/audit-log` | Platform audit log |
| GET | `/api/admin/system/failed-requests` | Failed AI gateway requests |

**Analytics (Admin)**
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/analytics/usage-trend` | Platform usage over time |
| GET | `/api/admin/analytics/top-orgs` | Top orgs by spend |
| GET | `/api/admin/analytics/provider-breakdown` | Provider usage breakdown |

**Budget (Admin)**
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/budgets/` | All org budgets |
| GET | `/api/admin/budgets/summary` | Platform-wide summary |
| GET | `/api/admin/budgets/alerts` | Platform-wide alerts |
| PUT | `/api/admin/budgets/:id/hard-limit` | Set hard limit |
| PUT | `/api/admin/budgets/alerts/:id/read` | Mark alert read |

**Integrations (Admin)**
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/integrations/` | All integrations |
| PUT | `/api/admin/integrations/:id/status` | Toggle status |

**Reports (Admin)**
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/reports/` | All reports |
| POST | `/api/admin/reports/generate` | Manual generation |
| DELETE | `/api/admin/reports/:id` | Delete report |
| DELETE | `/api/admin/reports/bulk` | Bulk delete |

**Providers (Admin)**
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/providers/` | List providers |
| POST | `/api/admin/providers/` | Create provider |
| PUT | `/api/admin/providers/:id` | Update provider |
| DELETE | `/api/admin/providers/:id` | Delete provider |

**CMS — Blog, Pages, Site Links**
| Method | Path | Description |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/admin/blog/` | Blog post CRUD |
| GET/POST/PUT/DELETE | `/api/admin/pages/` | Static page CRUD |
| GET/POST/PUT/DELETE | `/api/admin/site-links/` | Site nav link CRUD |

**Pricing Agent**
| Method | Path | Description |
|---|---|---|
| POST | `/api/admin/pricing-agent/chat` | AI pricing assistant chat |
| POST | `/api/admin/pricing-agent/execute` | Execute AI pricing action |

---

## 3. SUPABASE EDGE FUNCTIONS

| Slug | JWT | Description |
|---|---|---|
| `invite-user` | Required | Invite team member. Validates invoker is owner/admin, checks `team_members` plan limit, generates token, sends Resend email (10s timeout, plain-text fallback). |
| `create-checkout-session` | Required | Creates Lemon Squeezy checkout session. Returns checkout URL. |
| `lemonsqueezy-webhook` | None (HMAC-verified) | Handles Lemon Squeezy billing events. HMAC-SHA256 verified. Updates `subscriptions` table. |
| `aggregate-usage` | None (cron) | Aggregates `api_usage_logs` into `usage_aggregates` by org/provider/model/day. |
| `generate-report` | Required | Generates report data snapshot on demand. |

---

## 4. BACKGROUND CRON JOBS (node-cron on Render)

| Schedule | Function | Description |
|---|---|---|
| `*/10 * * * *` | `processDueReports` | Finds reports past `next_run_at`. Atomic DB lock prevents duplicates. Generates PDF/XLSX. Sends email (Resend, 10s timeout). |
| `0 * * * *` | `runAnomalyDetectionForAll` | Z-score + rolling 7-day baseline anomaly detection for all orgs. Creates anomaly records. Dispatches alerts per `notification_preferences`. |
| `*/5 * * * *` | `retryPendingDeliveries` | Retries webhook deliveries past `next_retry_at`. Recovers missed in-memory timers after restarts. |

---

## 5. DATABASE MIGRATIONS

| File | Key Tables / Changes |
|---|---|
| `00001_initial_schema.sql` | `users`, `organizations`, `organization_members`, `subscriptions`, `invitations`, `api_keys`, `api_usage_logs`, `model_pricing`, `integrations`, `notification_preferences` |
| `00003_actual_live_schema_snapshot.sql` | Full live schema snapshot with all RLS policies |
| `00006_switch_to_lemonsqueezy.sql` | LemonSqueezy billing fields on subscriptions |
| `00007_extend_plans_for_landing_page.sql` | Plan display fields: badge, tagline, feature_list |
| `00008_add_system_limits_to_plans.sql` | `plans.system_limits` JSONB column |
| `00009_restructure_system_limits.sql` | Refactored system_limits: features, limits, usage, rate_limits, model_access |
| `00010_contact_sales_leads.sql` | `contact_sales_leads` table |
| `00011_cron_aggregate_usage.sql` | `usage_aggregates` table + Supabase cron setup |
| `00012_extend_static_pages_seo.sql` | SEO columns on `static_pages` |
| `00013_add_content_blocks_to_static_pages.sql` | `content_blocks` JSONB on `static_pages` |
| `00014_create_blog_posts.sql` | `blog_posts` table with SEO fields |
| `00015_seed_blog_posts.sql` | Blog seed data |
| `00016_pricing_source_provenance_and_staging.sql` | `model_pricing_imports` staging table, audit log |
| `00017_slack_webhooks_anomaly_recurring_reports.sql` | `slack_integrations`, `webhook_endpoints`, `webhook_subscriptions`, `webhook_deliveries`, `anomaly_detections`, `scheduled_reports` |
| `00018_slack_oauth_bot_tokens.sql` | Renames `webhook_url_enc` → `bot_token_enc`; adds `team_id`, `team_name`, `bot_user_id` |
| `20260611000000_onboarding_schema.sql` | `onboarding_responses`, `onboarding_completed_at` |
| `20260613000000_roi_data_models.sql` | ROI calculator data models |

---

## 6. PLAN ENTITLEMENTS SYSTEM

### Feature Flags (boolean)
| Key | Capability Gated |
|---|---|
| `api_gateway` | External `/v1/chat/completions` access |
| `analytics` | Basic analytics logs |
| `advanced_analytics` | Advanced analytics breakdowns |
| `alerts` | Alert rules and notifications |
| `budget_manager` | Budget rule creation |
| `ai_playground` | Dashboard AI Playground |
| `benchmarks` | Model benchmarks page |
| `roi_calculator` | ROI Calculator |
| `reports` | Report creation and access |
| `csv_export` | XLSX download |
| `pdf_export` | PDF download |
| `premium_models` | Premium-tier AI models |
| `webhooks` | Outbound webhook endpoints |
| `slack_alerts` | Slack OAuth integration |
| `cost_spike_detection` | Cost spike alert rules |
| `anomaly_detection` | Z-score anomaly detection |
| `hard_budget_enforcement` | Hard budget stop on AI calls |

### Numeric Limits
| Key | Controls |
|---|---|
| `integrations` | Max AI provider API keys |
| `platform_keys` | Max platform API keys |
| `alert_rules` | Max alert rules |
| `budget_rules` | Max budget rules |
| `team_members` | Max active team members |
| `monthly_spend_usd` | Monthly AI spend cap (hard stop) |

### Model Access Tiers
`basic` → `standard` → `premium` → `all`

---

## 7. NOTIFICATION PREFERENCES

UI at `/settings/notifications`. Stored in `notification_preferences` table per user.

| Event | In-App | Email | Slack | SMS |
|---|---|---|---|---|
| Budget Alerts | ✓ | ✓ | ✓ | ✓ |
| Cost Anomaly | ✓ | ✓ | ✓ | ✓ |
| Weekly Digest | — | ✓ | — | — |
| Monthly Report | — | ✓ | — | — |
| Security Advisories | — | ✓ | — | ✓ |
| Billing Alerts | — | ✓ | — | — |

---

## 8. INTEGRATIONS OVERVIEW

### AI Provider Keys
- Stored encrypted (AES-256-GCM) in `integrations` table
- Providers: OpenAI, Anthropic, Google, Mistral, Cohere, and any custom URL
- Per-integration enable/disable toggle
- Key never returned to frontend

### Slack OAuth
- Full OAuth 2.0 Bot Token (`xoxb-...`) flow
- Token encrypted at rest (`bot_token_enc`)
- Channel selection via `conversations.list`
- Alerts via `chat.postMessage`
- One integration per organization

### Outbound Webhooks
- Customer-defined HTTP endpoints
- HMAC-SHA256 signed (`X-Ordisum-Signature: sha256=...`)
- Per-endpoint event subscriptions
- 5 attempts with exponential back-off: 30s → 5m → 30m → 2h → 8h
- Full delivery log per endpoint

### Billing — Lemon Squeezy
- Merchant of Record — no card data handled by Ordisum
- Webhook events HMAC-verified
- Cancel / resume / update payment method via API

### Email — Resend
- Sender: `Ordisum <notifications@ordisum.com>`
- Used for: invitations, budget alerts, anomaly alerts, scheduled reports
- All calls have 10s `AbortController` timeout
- Plain-text fallback on all emails

---

## 9. BACKEND SERVICES & UTILITIES

| File | Description |
|---|---|
| `services/anomalyDetector.js` | Z-score + rolling 7-day baseline anomaly detection |
| `services/scheduledReports.js` | Recurring report engine with atomic DB lock |
| `services/pdfGenerator.js` | Real PDF generation via `pdfkit` |
| `services/xlsxGenerator.js` | Real XLSX generation via `exceljs` |
| `services/aiGateway.js` | AI call dispatcher: routing, cost logging, retries |
| `utils/sendAlertEmail.js` | Resend alert email sender |
| `utils/sendSlackAlert.js` | Slack `chat.postMessage` dispatcher |
| `utils/webhookDispatcher.js` | Outbound webhook delivery with HMAC + retry |
| `utils/alertHelper.js` | Multi-channel alert dispatcher |
| `utils/encryption.js` | AES-256-GCM encrypt/decrypt |
| `utils/llmFallback.js` | Multi-provider LLM fallback chain |
| `utils/llmScraper.js` | LLM-driven pricing scraper |
| `utils/costCalculator.js` | Token → USD cost calculation |

---

## 10. MIDDLEWARE

| Middleware | Description |
|---|---|
| `requireAuth` | Supabase JWT validation + `is_active` check |
| `requirePlatformKey` | Platform Key (`ii_sk_...`) hash-based auth |
| `attachEntitlements` | Loads plan limits into `req.entitlements` |
| `requireFeature(key)` | Blocks if feature flag is false |
| `requireLimit(key, fn)` | Blocks if count limit exceeded |
| `checkModelAndSpendEntitlement` | Model tier + monthly spend cap check |
| `requirePermission` | Org role permission gate |
| `requirePlatformAdmin` | Platform admin gate |
| `proxyLimiter` | Rate limiter for AI proxy routes |
| `v1Limiter` | Rate limiter for `/v1` gateway |
| `securityLimiter` | Rate limiter for security endpoints |

---

## 11. SECURITY CONTROLS

- **Helmet.js** — CSP, HSTS (1yr, preload), X-Frame-Options DENY
- **CORS** — locked to `FRONTEND_URL`, no wildcard
- **JWT** — verified on every protected route; `is_active` checked
- **Platform Keys** — SHA-256 hash comparison, never stored plaintext
- **AES-256-GCM** — all stored secrets (provider keys, Slack tokens)
- **HMAC-SHA256** — outbound webhooks + Lemon Squeezy inbound
- **2FA (TOTP)** — enrollment, verify, disable, backup codes
- **Session management** — list, revoke one, revoke all
- **Login history** — tracked per user
- **RLS** — Row Level Security on all Supabase tables
- **Global error handler** — returns only `correlationId` + generic message to client
- **Account deactivation** — checked on every authenticated request
- **Org isolation** — every query is scoped to `organization_id`

---

## 12. PRODUCTION ENVIRONMENT VARIABLES

### Backend (Render)
```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
FRONTEND_URL=https://ordisum.com
SITE_URL=https://ordisum.com
CREDENTIAL_ENCRYPTION_KEY        # 64-char hex (AES-256-GCM)
RESEND_API_KEY
RESEND_FROM_EMAIL=Ordisum <notifications@ordisum.com>
LEMONSQUEEZY_API_KEY
LEMONSQUEEZY_WEBHOOK_SECRET
LEMONSQUEEZY_STORE_ID
SLACK_CLIENT_ID
SLACK_CLIENT_SECRET
LLM_API_KEY
LLM_BASE_URL
OPENAI_API_KEY
ANTHROPIC_API_KEY
```

### Frontend (Render — Vite build time)
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_API_URL=https://api.ordisum.com
```

### Supabase Edge Functions
```
SUPABASE_URL              (auto-injected)
SUPABASE_SERVICE_ROLE_KEY (auto-injected)
RESEND_API_KEY
RESEND_FROM_EMAIL=Ordisum <notifications@ordisum.com>
SITE_URL=https://ordisum.com
LEMONSQUEEZY_API_KEY
LEMONSQUEEZY_WEBHOOK_SECRET
```

---

## 13. PRODUCTION INFRASTRUCTURE

| Component | Provider | URL / ID |
|---|---|---|
| Frontend | Render | https://ordisum.com |
| Backend API | Render | https://api.ordisum.com |
| Database + Auth | Supabase | Project: `ugkkvwpnjhajlneuhrvs` (ap-southeast-2) |
| Edge Functions | Supabase | `ugkkvwpnjhajlneuhrvs.supabase.co/functions/v1/` |
| DNS / CDN | Cloudflare | In front of Render |
| Billing | Lemon Squeezy | Merchant of Record |
| Email | Resend | `notifications@ordisum.com` |
| Slack | Slack API | OAuth Bot Token flow |

### Render Routing (`public/_redirects`)
```
/api/*  https://api.ordisum.com/api/:splat  200
/*      /index.html                         200
```
