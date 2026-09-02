# ORDISUM SEO CONTENT IMPLEMENTATION HANDOFF

Audience: an implementation AI (e.g. Antigravity) with codebase write access. This document does not modify the codebase — it is the specification for that next phase. Codebase truth always wins over the production documents where they conflict; every conflict found is called out explicitly below.

**Source documents referenced (do not re-derive their content, only their placement/wiring):**
- `ORDISUM_SEO_CONTENT_PRODUCTION_FINAL.md` — approved copy for every page
- `ORDISUM_SEO_CONTENT_PRODUCTION_MASTER.md` — blueprint/keyword map
- `Ordisum SEO Content Inventory` + `Ordisum SEO & Content Intelligence Strategy` (as pasted into chat) — research/product-truth base

**Status legend used throughout:** `READY` / `VERIFY` / `CONTENT_PENDING_VERIFICATION` / `NOT_APPLICABLE` / `MISSING`

---

## 0. Codebase Reconciliation Findings (read first — these override the production docs)

1. **`/features`, `/pricing`, `/security` are CMS pages**, not hardcoded components. All three render `<MarketingPage slug="…">`, which fetches `GET /api/public/pages/:slug` → the `static_pages` table (schema: `slug, title, content, meta_title, meta_description, meta_keywords, canonical_url, og_image, robots, content_blocks (jsonb), updated_at`). **No rows exist yet for these three slugs** — the routes will 404/empty-state until CMS records are created. This is not a new-route task, it's a CMS-content task.
2. **`/alternatives/:slug` and `/use-cases/:slug` are one shared dynamic route each**, both backed by the same `static_pages` table via `template="alternative"` / `template="usecase"` props. **Slug prefix convention confirmed in the sitemap generator (`backend/src/routes/public.js`) is mandatory**: a page at public URL `/alternatives/helicone` must be stored as `static_pages.slug = 'alternatives-helicone'`, and `/use-cases/ai-budget-management` must be stored as `slug = 'use-cases-ai-budget-management'`. Getting this prefix wrong means the page renders at the wrong URL or not at all. **No rows exist yet for any of the 4 alternatives or 3 use-cases.**
3. **`content_blocks` (JSONB) has a defined schema** in `MarketingPage.tsx` — `hero, intro, problem, solution, benefits, sections, comparisonTable, prosCons, workflow, faqs, relatedLinks, finalCta`, each block optional. This is the exact shape to populate from the production doc copy — see §6-§11 mapping below.
4. **`/blog` and `/blog/:slug`** are backed by `blog_posts` table, fields: `slug, title, excerpt, body (markdown), author, category, tags, featured_image, meta_title, meta_description, meta_keywords, canonical_url, og_image, robots, status, published_at`. **Two blog posts already exist and are published**: `reduce-llm-api-costs` ("How to Reduce LLM API Costs Without Sacrificing Quality") and `ai-cost-observability-guide` ("AI Cost Observability: What to Measure and Why It Matters"). The 3 new articles from the production doc (`best-ai-cost-management-tools`, `prevent-openai-billing-surprises`, `measuring-real-roi-of-llms`) do not collide on slug or exact topic, but **check for reader-facing redundancy before publishing** — "prevent-openai-billing-surprises" overlaps thematically with the existing "reduce-llm-api-costs" (both are cost-reduction/prevention angles) enough that they should cross-link to each other rather than compete; this is additive content, not a conflict, but treat it as one connected cluster, not two isolated topics.
5. **`/docs/:slug` content is hardcoded in `src/docs/content/*.ts`**, NOT CMS-driven. **Slug correction: the ROI calculator doc's actual route slug is `roi-calculator`** (file is named `roi-calculator-doc.ts` but the exported `slug:` field is `roi-calculator`) — the production doc's `/docs/roi-calculator-doc` references must be corrected to `/docs/roi-calculator` everywhere they appear (internal links, sitemap entries, metadata table).
6. **Footer and Navbar are both DB-driven**, from a `site_links` table (`section, label, url, sort_order, is_active`), served via `GET /api/public/site-links`, edited at `/admin/site-links`. New pages need explicit `site_links` rows added — they will NOT automatically appear in navigation just because the CMS page/route exists.
7. **Pricing is fully dynamic** — `PricingSection` component independently fetches `GET /api/public/pricing-plans`; the `/pricing` page's `content_blocks` only controls the surrounding copy (intro, FAQ, etc.), never the plan names/prices themselves.
8. **SEO utility confirmed**: `useSeo()` hook + `<Seo>` component (`src/components/seo/Seo.tsx`), and `src/lib/schema.ts` exports `buildOrganization`, `buildWebSite`, `buildWebPage`, `buildBreadcrumbList`, `buildGraph`. **`buildFAQPage` and `buildArticle`/`BlogPosting` schema builders do not exist yet** — these must be added to `schema.ts` (extending the existing pattern), not created as a separate schema system.
9. **2FA is real and implemented** (TOTP via `otplib`, backed by a `two_factor_auth` table, opt-in via `/api/security/2fa/start` → `/verify`). Status: **READY** — the production doc's `[VERIFY BEFORE PUBLISHING]` flag on this specific claim can be cleared; correct copy is "Two-factor authentication (TOTP) is available" (optional, not stated as mandatory anywhere in the code found).
10. **Trial length**: `trial_ends_at` exists on organizations/subscriptions but no fixed duration constant was found in this inspection. Status: **VERIFY** — remains unresolved, do not publish a specific day count until confirmed from signup/billing logic or a config value.
11. **Domain/brand — already flagged by a prior session directly in the code comments.** Both `public/robots.txt` and `public/sitemap.xml` contain explicit `ACTION REQUIRED before go-live` comments stating the current host (`ordisum.com` in frontend `SITE_URL`, `app.ordisum.com` as the backend sitemap generator's fallback — note these two fallbacks are themselves inconsistent with each other) is "very likely the *application* host, NOT the public marketing/canonical domain," and suggests `https://www.inferenceintelligence.com` as the likely real domain. Status: **`BLOCKED — PRODUCTION DOMAIN VERIFICATION REQUIRED`**. This blocks: `VITE_SITE_URL`, every `<loc>` in `public/sitemap.xml`, the `Sitemap:` line in `robots.txt`, the backend sitemap generator's fallback constant, and the final choice of "Ordisum" vs. "Inference Intelligence" as the public brand. Nothing below should be published with a hardcoded domain — use `VITE_SITE_URL` / `SITE_URL` / `process.env.VITE_SITE_URL` wherever the codebase already does.

---

## 1. Master Page Inventory

| Route | Status | Component | Content source | Action needed |
|---|---|---|---|---|
| `/` | Exists, live | `LandingPage.tsx` | Component-level (not CMS) | Update copy per `PRODUCTION_FINAL.md §2` if not already matching |
| `/features` | Route exists, **no content** | `MarketingPage slug="features"` | `static_pages` row, slug=`features` | **Create CMS record** |
| `/pricing` | Route exists, **no content** | `MarketingPage slug="pricing"` | `static_pages` row, slug=`pricing` (surrounding copy only) | **Create CMS record**, keep `PricingSection` untouched |
| `/security` | Route exists, **no content** | `MarketingPage slug="security"` | `static_pages` row, slug=`security` | **Create CMS record** |
| `/alternatives/helicone` | Route exists, **no content** | `MarketingPage template="alternative"` | `static_pages` row, slug=`alternatives-helicone` | **Create CMS record** |
| `/alternatives/langfuse` | Route exists, **no content** | same | slug=`alternatives-langfuse` | **Create CMS record** |
| `/alternatives/portkey` | Route exists, **no content** | same | slug=`alternatives-portkey` | **Create CMS record** |
| `/alternatives/litellm` | Route exists, **no content** | same | slug=`alternatives-litellm` | **Create CMS record** |
| `/use-cases/ai-cost-monitoring` | Route exists, **no content** | `MarketingPage template="usecase"` | slug=`use-cases-ai-cost-monitoring` | **Create CMS record** |
| `/use-cases/ai-budget-management` | Route exists, **no content** | same | slug=`use-cases-ai-budget-management` | **Create CMS record** |
| `/use-cases/ai-roi-measurement` | Route exists, **no content** | same | slug=`use-cases-ai-roi-measurement` | **Create CMS record** |
| `/docs/overview` … `/docs/troubleshooting`, `/docs/changelog` (12 total) | Exist, live | `DocsPage.tsx` | `src/docs/content/*.ts` (hardcoded) | Metadata pass only, see §13 |
| `/blog` | Exists, live | `BlogList.tsx` | `blog_posts` table (2 rows exist) | No action |
| `/blog/reduce-llm-api-costs` | Exists, published | `BlogPost.tsx` | `blog_posts` | No action |
| `/blog/ai-cost-observability-guide` | Exists, published | `BlogPost.tsx` | `blog_posts` | No action |
| `/blog/best-ai-cost-management-tools` | **Does not exist** | `BlogPost.tsx` | `blog_posts` | **Create row** |
| `/blog/prevent-openai-billing-surprises` | **Does not exist** | `BlogPost.tsx` | `blog_posts` | **Create row** |
| `/blog/measuring-real-roi-of-llms` | **Does not exist** | `BlogPost.tsx` | `blog_posts` | **Create row** |

---

## 2. Content Source Mapping (per page)

| Page | Content source | Notes |
|---|---|---|
| `/` | `PRODUCTION_FINAL.md §2` | Component-level copy — edit `LandingPage.tsx` directly, this is not CMS |
| `/features` | `PRODUCTION_FINAL.md §3` | Map to `content_blocks.sections` (one item per feature) + `content_blocks.faqs` |
| `/pricing` | `PRODUCTION_FINAL.md §4` | Only intro/FAQ copy goes to `content_blocks` — prices/plans stay dynamic |
| `/security` | `PRODUCTION_FINAL.md §5` | `[VERIFY BEFORE PUBLISHING]` lines must NOT go live until resolved (see §5 below) |
| `/alternatives/*` | `PRODUCTION_FINAL.md §6` | `[VERIFY CURRENT COMPETITOR INFORMATION]` lines must NOT go live until resolved |
| `/use-cases/*` | `PRODUCTION_FINAL.md §7` | Direct map, all `READY` except ROI export/scoping FAQ line |
| `/docs/*` | `PRODUCTION_FINAL.md §8` | Titles/descriptions only — never alter existing technical body text |
| Blog articles | `PRODUCTION_FINAL.md §9` | Full articles are `READY` to publish as written, `[VERIFY CURRENT COMPETITOR INFORMATION]` lines in article 1 excepted |

**Conflict-resolution rule (per task instructions):** if any copy above states something the codebase contradicts, codebase wins — remove or correct the statement, or mark `CONTENT_PENDING_VERIFICATION` and do not publish that specific line.

**Known correction to apply while implementing** (not a new conflict, just a slug fix carried from §0.5): every internal link and metadata reference to `/docs/roi-calculator-doc` in the production docs must be written as `/docs/roi-calculator`.

---

## 3. Homepage (`/`) Implementation

- **Component:** `src/pages/LandingPage.tsx` (existing, do not restructure the visual/design system)
- **Content source:** `PRODUCTION_FINAL.md §2`, verbatim
- **SEO:** confirm `<Seo>` is already wired on this component with `useSeo()`; update `title`/`description` props to match §2's metadata
- **Schema:** `buildOrganization` + `buildWebSite` + `buildWebPage` via `buildGraph` — already the established pattern, reuse it
- **FAQ block:** if implemented as visible accordion content, it is a `FAQPage` schema candidate once `buildFAQPage` exists (see §9.8/§23)
- Preserve existing visual system — this is a copy/metadata update, not a redesign

---

## 4. Features (`/features`) Implementation

- **CMS record:** `static_pages` insert, `slug='features'`
- **`content_blocks.hero`**: headline = H1 from `PRODUCTION_FINAL.md §3`
- **`content_blocks.sections`**: one `ContentSection` per feature (Unified Cost Dashboard, Hard Budget Enforcement, Smart Alerts & Anomaly Detection, ROI Calculator, External API Gateway, Zero-Code Integration) — `heading` = feature H2, `items` = problem/solution/benefit as `SectionItem[]`
- **`content_blocks.faqs`**: none defined for this page in the production doc beyond per-feature mini-FAQs — pull relevant rows from the master FAQ database (§10 of `PRODUCTION_FINAL.md`, Product + Technical categories)
- **Internal links** (`content_blocks.relatedLinks` or inline anchors per existing pattern): `/docs/dashboard`, `/docs/budget-alerts`, `/docs/roi-calculator` (corrected slug), `/docs/api-auth`, `/docs/api-endpoints`, `/use-cases/ai-budget-management`, `/use-cases/ai-roi-measurement`, `/pricing`
- **Status: READY** — no unverified claims in this page's copy

---

## 5. Security (`/security`) Implementation

- **CMS record:** `static_pages` insert, `slug='security'`
- **Verified content (READY) to publish:**
  - AES-256-GCM encryption at rest for provider API keys
  - Plaintext keys never logged
  - Read-only provider keys required where supported
  - Prompts never stored — cost/usage metadata only
  - Two-factor authentication (TOTP) available — **status upgraded to READY per §0.9**, publish as "available," not "mandatory"
- **Do NOT publish (remove entirely from live copy, do not soften into a hedge):**
  - Any SOC 2 / ISO 27001 / HIPAA / PCI / GDPR compliance claim
  - Any specific TLS version / HSTS claim
  - Any data residency claim
  - Any audit-logging claim
  - These four items stay `CONTENT_PENDING_VERIFICATION` — if a future codebase inspection confirms one, it can be added then, not before
- **Internal links:** `/docs/api-auth`, `/features`

---

## 6. Pricing (`/pricing`) Implementation

- **CMS record:** `static_pages` insert, `slug='pricing'` — **surrounding copy only**
- **Do NOT touch:** `PricingSection` component, `/api/public/pricing-plans` endpoint, or any plan/price/limit value — these remain fully dynamic per §0.7
- **Publish now (READY):** H1, intro framing (neutral version, not the "pays for itself" claim per `PRODUCTION_FINAL.md §4` unless a real example is supplied), per-tier positioning copy **once tier names are confirmed from the live plans API** (do not hardcode tier names into `content_blocks` from memory — fetch/confirm first)
- **Do NOT publish yet:** trial length FAQ answer, upgrade/downgrade FAQ answer, enterprise-plan FAQ answer — all `CONTENT_PENDING_VERIFICATION` per §0.10 and the unresolved billing-policy items
- **Internal links:** `/features`, `/use-cases/ai-budget-management`, `/contact-sales`

---

## 7. Alternative Pages Implementation (all 4)

Common wiring for `/alternatives/helicone`, `/alternatives/langfuse`, `/alternatives/portkey`, `/alternatives/litellm`:

- **CMS record:** `static_pages` insert per page, slug = `alternatives-<name>` (mandatory prefix, §0.2)
- **Template mapping to `content_blocks`:** `hero` (H1 + intro), `comparisonTable` (the markdown comparison table in each page → `ComparisonTableBlock.rows`), `sections` (the H3 differentiator bullets), `prosCons` optional if a pros/cons format is preferred over the current H3 list, `faqs`, `finalCta`
- **Publish now (READY):** the "Where Ordisum Is Different" H3 bullets, "Who Should Choose Which" section, CTA, internal links
- **Do NOT publish yet:** every table cell and sentence marked `[VERIFY CURRENT COMPETITOR INFORMATION]` in `PRODUCTION_FINAL.md §6` — these are `CONTENT_PENDING_VERIFICATION`. Recommended interim treatment: **omit the competitor-status cells entirely rather than leaving a visible placeholder string** on a public page; only Ordisum's own column plus the verified "Where Ordisum Is Different" section should go live until competitor claims are checked.
- **Incoming links required:** `/features`, `/use-cases/ai-budget-management`, Blog post `best-ai-cost-management-tools` — confirm all three link here (§13 below has the full matrix)
- **Schema:** `buildWebPage` + `buildBreadcrumbList` (Home → Alternatives → competitor name) via existing pattern; `FAQPage` once `buildFAQPage` exists

---

## 8. Use-Case Pages Implementation (all 3)

Common wiring for `/use-cases/ai-cost-monitoring`, `/use-cases/ai-budget-management`, `/use-cases/ai-roi-measurement`:

- **CMS record:** `static_pages` insert per page, slug = `use-cases-<name>` (mandatory prefix, §0.2)
- **`content_blocks` mapping:** `hero`, `problem` (PointsBlock), `solution` (PointsBlock), `workflow` (WorkflowBlock — numbered steps already match this shape directly), `benefits` (BenefitsBlock), `faqs`, `finalCta`
- **Status: READY** for `ai-cost-monitoring` and `ai-budget-management` — all copy verified against product truth.
- **`ai-roi-measurement`: one line is `CONTENT_PENDING_VERIFICATION`** — the FAQ answer about exporting/scoping ROI reports to a specific team/project. Publish the page with that FAQ question omitted until confirmed, rather than guessing an answer.
- **Internal links:** per page, see `PRODUCTION_FINAL.md §7` — all point to real, existing routes (`/features`, `/docs/dashboard`, `/docs/providers`, `/docs/budget-alerts`, `/docs/roi-calculator` [corrected slug], `/alternatives/helicone`)

---

## 9. Blog Implementation

### 9.1 Existing posts — no action
`reduce-llm-api-costs`, `ai-cost-observability-guide` — already published, already correctly link to `/use-cases/ai-cost-monitoring` and `/alternatives/helicone`. Leave as-is.

### 9.2 New posts to create (3 rows in `blog_posts`)

| Slug | Title | Content source | Status |
|---|---|---|---|
| `best-ai-cost-management-tools` | The Best AI Cost Management Tools in 2026 | `PRODUCTION_FINAL.md §9.1` | Body **READY**, except the four `[VERIFY CURRENT COMPETITOR INFORMATION]` lines in the tool-by-tool section — publish those sections with the competitor-status claim removed (keep the neutral "best fit if…" framing, drop the unverified ownership/roadmap sentence) until confirmed |
| `prevent-openai-billing-surprises` | How to Prevent OpenAI Billing Surprises | `PRODUCTION_FINAL.md §9.2` | **READY**, no unverified claims |
| `measuring-real-roi-of-llms` | Measuring the Real ROI of LLMs in the Enterprise | `PRODUCTION_FINAL.md §9.3` | **READY**, except one FAQ line pending the same ROI-scoping verification as §8 above — omit until confirmed |

- **Fields to populate per row:** `slug, title, excerpt (write a 1-2 sentence excerpt from the intro), body (markdown, as drafted), author='Ordisum Team' (matches existing 2 posts' convention), category, tags, meta_title, meta_description, meta_keywords, canonical_url (build from confirmed SITE_URL, not hardcoded), robots='index,follow', status='published', published_at=now()`
- **Category suggestion** (matching existing convention of `Cost Optimization` / `Observability`): `best-ai-cost-management-tools` → `Comparisons`; `prevent-openai-billing-surprises` → `Cost Optimization`; `measuring-real-roi-of-llms` → `ROI`
- **Cross-linking requirement (from §0.4):** add one contextual link from `prevent-openai-billing-surprises` to the existing `reduce-llm-api-costs` post (and vice versa is optional but recommended) since they're topically adjacent — prevents them reading as duplicate/competing content.
- **Do not invent:** authors beyond the existing "Ordisum Team" convention, statistics, case studies, or citations beyond what's in the approved copy.

---

## 10. Documentation Implementation

| Route | Real slug | Content source (title/meta only) | Status |
|---|---|---|---|
| `/docs/overview` | `overview` | `PRODUCTION_FINAL.md §8` | READY |
| `/docs/quickstart` | `quickstart` | same | READY |
| `/docs/providers` | `providers` | same, + provider-by-provider expansion (§0.5 note, no new pages) | READY |
| `/docs/dashboard` | `dashboard` | same | READY |
| `/docs/budget-alerts` | `budget-alerts` | same | READY |
| `/docs/roi-calculator` | `roi-calculator` **(corrected — not `roi-calculator-doc`)** | same | READY |
| `/docs/teams` | `teams` | same | READY |
| `/docs/api-auth` | `api-auth` | same | READY |
| `/docs/api-endpoints` | `api-endpoints` | same | READY |
| `/docs/faq` | `faq` | same | READY |
| `/docs/troubleshooting` | `troubleshooting` | same | READY — do not alter troubleshooting steps for SEO |
| `/docs/changelog` | `changelog` | same | READY — factual/dated only |

**Zero Fake Documentation Rule enforcement:** none of the metadata/title/intro additions above introduce new endpoints, parameters, code examples, or workflows beyond what `src/docs/content/*.ts` already documents. No new documentation content is being invented in this handoff — only SEO wrapper metadata. If a future content pass wants to expand technical body content (e.g. the per-provider subsections), that content must be pulled from the actual provider integration code/config, not written from assumption — flag as `CONTENT_PENDING_VERIFICATION` and route to a human/engineer for the technical facts first.

---

## 11. FAQ Implementation

Use `PRODUCTION_FINAL.md §10` as the approved database. Placement rule: **do not place every FAQ on every page** — only the subset relevant to that page's `content_blocks.faqs`.

| Page | FAQ subset (by category from §10) | Visible? | FAQPage schema? |
|---|---|---|---|
| `/` | Product + Technical (4 items already drafted in §2) | Yes | Yes, once `buildFAQPage` exists |
| `/features` | Product + Technical | Yes | Yes |
| `/security` | Security (2 READY items only — drop the 2FA/cert lines per §5) | Yes | Yes |
| `/pricing` | Commercial (all `CONTENT_PENDING_VERIFICATION` — do not publish this block yet) | No, until resolved | No |
| `/alternatives/*` | 1-2 comparison-relevant items per competitor, excluding unverified lines | Yes | Yes |
| `/use-cases/ai-cost-monitoring` | 2 items from §7.1 | Yes | Yes |
| `/use-cases/ai-budget-management` | 2 items from §7.2 | Yes | Yes |
| `/use-cases/ai-roi-measurement` | 1 item from §7.3 (drop the export/scoping question) | Yes | Yes |
| `/docs/faq` | Documentation category (full) | Yes | Yes |

**Schema rule enforced:** `FAQPage` JSON-LD must exactly mirror the visible FAQ block on that page — never include a question in schema that isn't rendered, and never render a question that isn't in schema once both exist.

---

## 12. AEO / GEO Implementation

Map `PRODUCTION_FINAL.md §11` (8 questions) directly:

| Question | Target page | Status |
|---|---|---|
| How do you monitor AI API costs? | `/use-cases/ai-cost-monitoring` | READY |
| How do I stop OpenAI API overages? | `/use-cases/ai-budget-management` | READY |
| Is there an ROI calculator for AI tools? | `/use-cases/ai-roi-measurement` | READY |
| How do I track AI costs across multiple providers? | `/` | READY |
| Do I need to install an SDK to track AI costs? | `/docs/quickstart` | READY |
| What's the difference between an AI gateway and an AI observability tool? | Blog: `best-ai-cost-management-tools` | READY |
| How do I attribute AI spend to a specific team or feature? | `/use-cases/ai-cost-monitoring` | READY |
| Can AI budget alerts actually prevent overspend, or just notify? | `/use-cases/ai-budget-management` | READY |

No superlatives ("best," "#1," "fastest") appear in any of these answers — confirmed clean.

---

## 13. Internal Linking Architecture (implementation matrix)

Full 33-relationship matrix is in `PRODUCTION_FINAL.md §13` — implement exactly as listed there. Key structural checks for Antigravity to verify post-implementation:

- Every `/alternatives/*` page has inbound links from `/features`, `/use-cases/ai-budget-management`, and the `best-ai-cost-management-tools` blog post — no alternative page should be reachable only via direct URL or the (not-yet-built) alternatives index.
- Every `/use-cases/*` page has inbound links from `/`, `/features`, and at least one blog post.
- `/pricing` receives inbound links from `/`, `/features`, and `/use-cases/ai-budget-management` — do not let it drop below 3 contextual inbound links given its commercial importance.
- All 3 new blog posts link out to at least one `/use-cases/*` or `/features` page (BOFU funnel requirement) — confirmed present in the approved copy.
- The 2 existing blog posts already link to `/use-cases/ai-cost-monitoring` and `/alternatives/helicone` — leave those links intact when adding the cross-link mentioned in §9.2.

---

## 14. Footer / Navigation Link Architecture

| Current label | Current destination | Intended destination | Action required |
|---|---|---|---|
| *(inspect current `site_links` rows before implementing — table exists but was not queried live in this pass)* | — | — | **Add rows for:** Features → `/features`, Pricing → `/pricing`, Security → `/security`, Blog → `/blog`, Docs → `/docs/overview` (if not already present) |
| — | — | Alternatives (dropdown or footer group, optional) → `/alternatives/helicone` etc. | Recommended, not mandatory — the 4 alternative pages are otherwise only reachable via contextual body links per §13 |
| — | — | Use Cases (dropdown or footer group, optional) → `/use-cases/ai-cost-monitoring` etc. | Same recommendation |

**Before implementing:** query `GET /api/public/site-links` (or the `site_links` table directly) to see current rows — this handoff was written without live DB access, so treat the table above as "what must exist," not "what to blindly insert," to avoid duplicate rows. No `#` placeholder links, no dead links — every row must resolve to a route confirmed to exist in §1.

---

## 15. Orphan-Page Prevention Audit

| New page | Confirmed incoming link source |
|---|---|
| `/features` | `/`, all 4 `/alternatives/*`, all 3 `/use-cases/*`, docs pages, blog posts |
| `/security` | `/`, all 4 `/alternatives/*`, `/docs/api-auth` |
| `/alternatives/*` (each) | `/features` link, `/use-cases/ai-budget-management`, `best-ai-cost-management-tools` blog |
| `/use-cases/*` (each) | `/`, `/features`, relevant docs page, relevant blog post |
| New blog posts (3) | `/blog` index (automatic via listing), plus the cross-link noted in §9.2 |

No orphans identified once §13's matrix and the footer additions in §14 are implemented. Do not add link relationships beyond what's listed purely to inflate a count.

---

## 16. SEO Metadata Implementation

Use `PRODUCTION_FINAL.md §14` (14-row table) as the exact values. Implementation notes:
- Populate via the existing `useSeo()` / `<Seo>` mechanism on every page — **do not build a second metadata system.**
- `canonical` for every CMS/dynamic page = `${SITE_URL}${path}` built from the existing `SITE_URL` config constant, not hardcoded — this is blocked pending §0.11's domain resolution, but the code pattern (reference the constant) can be implemented now.
- Robots: `index,follow` for every page in §1 except none currently need `noindex` — this is the full public marketing/content surface, consistent with the existing `robots.txt` disallow list (dashboard/settings/admin/onboarding/403/auth only).
- OG title/description: reuse SEO title/description per existing pattern unless a page-specific OG image is supplied (none specified in the production docs — use existing default OG image).

---

## 17. Canonical / Domain Rule

**`BLOCKED — PRODUCTION DOMAIN VERIFICATION REQUIRED`** (per §0.11). Do not implement any hardcoded domain anywhere. Every canonical/OG/sitemap URL must reference `VITE_SITE_URL` (frontend) / `SITE_URL` or `process.env.VITE_SITE_URL` (backend) exactly as the existing code already does in `robots.txt`'s and `sitemap.xml`'s own comments. Once a human confirms the real production domain, set the env var — no code change should be needed beyond that, since the pattern already exists.

---

## 18. Sitemap

- **Confirmed dual system:** static baseline `public/sitemap.xml` (fixed routes) + dynamic `GET /api/public/sitemap.xml` (fixed routes + published `static_pages` + published `blog_posts`, both already de-duplicated and drafts/noindex-excluded in the existing backend code).
- **Action required:** once the 7 new `static_pages` rows (§1) and 3 new `blog_posts` rows (§9.2) are created with `status='published'` / non-`noindex` robots, they will automatically appear in the **dynamic** sitemap (`/api/public/sitemap.xml`) — no code change needed there.
- **The static `public/sitemap.xml` baseline should be verified** to confirm which sitemap is actually the one referenced in the live `Sitemap:` line of `robots.txt` and configured as canonical for search engines — if the dynamic one is authoritative, confirm the static file is not also being served/indexed as a duplicate at the same path.
- No duplicate sitemap routes found in this inspection.

---

## 19. Robots / Indexability

| Page category | Directive |
|---|---|
| `/`, `/features`, `/pricing`, `/security`, `/alternatives/*`, `/use-cases/*`, `/blog`, `/blog/*`, `/docs/*`, `/contact-sales` | `index, follow` |
| `/dashboard/*`, `/settings/*`, `/admin/*`, `/onboarding`, `/403`, `/auth/*`, `/signin`, `/login`, `/signup`, `/register` | `noindex, nofollow` (already enforced in `robots.txt` `Disallow` list — confirm the app-level `PrivateNoIndex` mechanism referenced in `Seo.tsx`'s comments is applied to all of these routes, not just blocked in robots.txt) |

No changes needed to the existing disallow list — it already correctly excludes every private area found in `App.tsx`'s route table.

---

## 20. Schema / Structured Data

| Page type | Schema to use | Status |
|---|---|---|
| Homepage | `buildOrganization` + `buildWebSite` + `buildWebPage` via `buildGraph` | Existing pattern, reuse |
| `/features`, `/pricing`, `/security`, `/alternatives/*`, `/use-cases/*` | `buildWebPage` + `buildBreadcrumbList` | Existing pattern, reuse |
| Any page with a visible FAQ block | `FAQPage` | **`buildFAQPage` must be added to `src/lib/schema.ts`** — extend the existing builder pattern, do not create a parallel schema file |
| Blog posts | `Article` / `BlogPosting` | **`buildArticle` (or `buildBlogPosting`) must be added to `schema.ts`** — same extension approach |
| `SoftwareApplication` | Only if the homepage/features page already uses it — **not confirmed present in this inspection; if absent, do not add it** unless a human confirms the product-level facts (category, pricing schema requirements) needed for a valid `SoftwareApplication` node |

No fake reviews, ratings, customer counts, or awards in any schema — none are present in the approved copy, so none should appear in structured data either.

---

## 21. CMS / Database Rules

| Content type | Table | New records needed | Existing records to update |
|---|---|---|---|
| Features/Pricing/Security pages | `static_pages` | 3 (`features`, `pricing`, `security`) | none |
| Alternative pages | `static_pages` | 4 (`alternatives-helicone/langfuse/portkey/litellm`) | none |
| Use-case pages | `static_pages` | 3 (`use-cases-ai-cost-monitoring/ai-budget-management/ai-roi-measurement`) | none |
| Blog articles | `blog_posts` | 3 | 2 existing rows get a minor body edit only for the cross-link mentioned in §9.2 |
| Docs | `src/docs/content/*.ts` (code, not DB) | 0 new | 12 files get title/meta additions only, no body rewrite |
| Footer/Nav | `site_links` | rows per §14 (exact count depends on live query first) | none known, verify before inserting |
| Schema builders | `src/lib/schema.ts` (code, not DB) | 0 DB records | Add `buildFAQPage`, `buildArticle` functions |

**No migrations are required** — every table above (`static_pages`, `blog_posts`, `site_links`) already exists with the needed columns per §0. This is a CMS data-entry task plus two small code additions to `schema.ts`, not a schema-migration task.

---

## 22. Product-Truth Rules (carried forward, unchanged, mandatory)

Never claim or imply: prompt tracing, prompt management, prompt evaluation, RAG evaluation, BLEU/ROUGE or LLM-as-judge scoring, fine-tuning workflows, agent trace debugging, unsupported compliance certifications, unsupported performance benchmarks, fake customer counts, fake case studies. Verified positioning only: AI API cost tracking, cost visibility, budget enforcement, alerts, anomaly detection, ROI measurement, AI API gateway, zero-SDK integration.

---

## 23. Implementation Order

**P0 (blocks launch):**
1. Resolve production domain (§0.11, §17) — needed before any canonical/OG/sitemap value is finalized, though page content can be built in parallel
2. Create `static_pages` records: `/features`, `/security` (both fully READY)
3. Create `static_pages` records: all 4 `/alternatives/*` (with unverified competitor cells omitted per §7)
4. Create `static_pages` records: all 3 `/use-cases/*` (with the one pending ROI FAQ line omitted)
5. Create `static_pages` record: `/pricing` surrounding copy (tier names confirmed live first)
6. Add `buildFAQPage` and `buildArticle` to `schema.ts`
7. Add missing `site_links` rows (query first, then insert only what's missing)
8. Apply the `/docs/roi-calculator` slug correction everywhere it appears in any newly-entered copy

**P1 (soon after launch):**
9. Create 3 new `blog_posts` rows, with the cross-link edit to the 2 existing posts
10. Apply docs metadata pass (§10) across all 12 doc pages
11. Wire FAQ placement + `FAQPage` schema per §11 once `buildFAQPage` exists
12. Wire AEO answers into their target pages' visible copy (§12)

**P2 (growth):**
13. Resolve remaining `CONTENT_PENDING_VERIFICATION` items (security certs, competitor claims, pricing FAQ, ROI export/scoping) and publish once confirmed
14. Expand `/docs/providers` with per-provider subsections, sourced from real provider integration code
15. Consider adding Alternatives/Use-cases groupings to nav/footer per §14's optional recommendation

---

## 24. Validation Checklist

**Routes:** every route in §1 loads without 404; no duplicate routes; `/docs/roi-calculator` (not `-doc`) resolves correctly; no broken nav after `site_links` additions.

**Content:** correct production content appears on each page; no `[VERIFY…]`/`CONTENT_PENDING_VERIFICATION` line is visible on a live public page; no fake docs content introduced; the 2 existing blog posts still render correctly after the cross-link edit.

**SEO:** all 14+3 titles/descriptions unique; canonical present on every page once domain is resolved; robots directives match §19; exactly one H1 per page; heading hierarchy logical; OG metadata present; schema validates (test with a structured-data validator) including the two new `buildFAQPage`/`buildArticle` functions.

**Internal linking:** no broken links (spot-check every link in §13's matrix); no orphan pages per §15; footer/nav links resolve (§14); FAQ schema matches visible FAQ content exactly, per page.

**Sitemap:** dynamic sitemap includes all 7 new `static_pages` + 3 new `blog_posts` once published; no private/admin/auth routes present; canonical URLs match sitemap `<loc>` values once domain is set.

**Technical:** no console errors; `npx tsc --noEmit` and `npm run build` both pass; no new dependencies introduced; no regression to dashboard/admin/auth/billing; mobile layout unaffected (this task touches only CMS content + two schema-builder functions, not layout components).

---

## 25. Final Implementation Report Requirement

After implementation, create `ORDISUM_SEO_IMPLEMENTATION_REPORT.md` containing:
- **Completed:** every `static_pages`/`blog_posts` row created, `site_links` rows added, `schema.ts` functions added, metadata applied
- **Not Completed:** anything from §23 not finished
- **Verification Required:** the full carried-forward list — domain/brand, trial length, pricing FAQ answers, security certs/TLS/residency/audit-logging, all `[VERIFY CURRENT COMPETITOR INFORMATION]` lines, ROI export/scoping FAQ
- **Documentation Safety:** confirm no docs content was invented beyond §10's metadata-only scope
- **SEO Audit:** run and report on duplicate titles/descriptions, missing canonicals, missing/multiple H1s, broken links, orphan pages, sitemap issues, schema validation errors

---

## 26. Summary for Antigravity

This is a **content + two small code additions** task, not a routing/architecture task — every route already exists. The work is: (1) insert CMS rows into `static_pages` and `blog_posts` using the exact slug conventions in §0, (2) add `buildFAQPage`/`buildArticle` to the existing `schema.ts` pattern, (3) add missing `site_links` rows, (4) leave every `CONTENT_PENDING_VERIFICATION` / `BLOCKED` item out of public copy until a human resolves it. Do not touch `PricingSection`, the dynamic sitemap generator, `robots.txt`'s disallow list, or any private/auth/admin route — none of those need changes for this phase.

# ANTIGRAVITY — ORDISUM SEO CONTENT IMPLEMENTATION EXECUTION GUARDRAILS

You are now responsible for implementing the SEO/content specification described in:

`ORDISUM_SEO_CONTENT_IMPLEMENTATION_HANDOFF.md`

Treat that handoff as the primary implementation specification.

Also use these source documents exactly as referenced by the handoff:

* `ORDISUM_SEO_CONTENT_PRODUCTION_FINAL.md`
* `ORDISUM_SEO_CONTENT_PRODUCTION_MASTER.md`
* `Ordisum SEO & Content Intelligence Strategy`
* `Ordisum SEO Content Inventory`

Do NOT independently redesign the SEO strategy or invent replacement content.

---

# 1. FIRST: READ AND RECONCILE EVERYTHING

Before modifying anything:

1. Read the complete `ORDISUM_SEO_CONTENT_IMPLEMENTATION_HANDOFF.md`.
2. Read the complete `ORDISUM_SEO_CONTENT_PRODUCTION_FINAL.md`.
3. Read the relevant sections of `ORDISUM_SEO_CONTENT_PRODUCTION_MASTER.md`.
4. Inspect the actual codebase.
5. Inspect the actual database/API structures used by:

   * `static_pages`
   * `blog_posts`
   * `site_links`
   * pricing plans
6. Inspect the existing routing system.
7. Inspect the existing SEO system.
8. Inspect the existing docs system.
9. Inspect the existing sitemap/robots implementation.

Codebase truth always wins over assumptions.

If the production documents and the codebase disagree:

* DO NOT silently choose an assumption.
* Prefer verified codebase/product truth.
* Remove unsupported claims from public content.
* Record the conflict in the final implementation report.

---

# 2. ABSOLUTE CONTENT SAFETY RULE

This is mandatory.

## NEVER INVENT CONTENT.

Do NOT create fake:

* features
* APIs
* endpoints
* integrations
* security certifications
* compliance claims
* customer counts
* reviews
* ratings
* case studies
* benchmarks
* statistics
* pricing policies
* trial durations
* enterprise features
* technical workflows
* provider capabilities
* product capabilities
* competitor claims
* customer logos
* awards
* performance claims

If approved content exists in `ORDISUM_SEO_CONTENT_PRODUCTION_FINAL.md`, use it.

If approved content does NOT exist, do not manufacture it.

If a statement requires verification and the handoff marks it:

* `VERIFY`
* `CONTENT_PENDING_VERIFICATION`
* `[VERIFY BEFORE PUBLISHING]`
* `[VERIFY CURRENT COMPETITOR INFORMATION]`
* `BLOCKED`

then do NOT publish that unsupported statement.

Omit it from public content and record it as pending verification.

---

# 3. USE THE APPROVED CLAUDE CONTENT

The purpose of this task is implementation, not rewriting the approved content.

Where the production-final document provides approved copy:

* preserve its meaning
* preserve its intended structure
* use the approved headings
* use the approved FAQs
* use the approved CTAs
* use the approved metadata
* use the approved internal-link targets

Do not replace approved content with generic AI-generated SEO copy.

You may make only the minimum technical formatting changes necessary to fit the existing CMS/content-block schema.

Example:

If the approved document provides:

H1
→ Intro
→ Problem
→ Solution
→ Benefits
→ FAQ
→ CTA

map those sections into the existing `content_blocks` structure.

Do NOT rewrite them simply because you think another wording is better.

---

# 4. HOMEPAGE MUST BECOME PART OF THE INTERNAL-LINKING HUB

Inspect `LandingPage.tsx`.

Implement the approved homepage content from the production-final document.

Do NOT redesign the existing visual system.

Ensure the homepage provides contextual internal links to the appropriate important pages, including where supported by the approved content:

* `/features`
* `/pricing`
* `/security`
* `/use-cases/ai-cost-monitoring`
* `/use-cases/ai-budget-management`
* `/use-cases/ai-roi-measurement`
* relevant docs
* relevant blog content
* relevant alternatives where contextually appropriate

Do not add links merely to inflate link counts.

Every homepage link must be contextually relevant.

---

# 5. FEATURES PAGE

Create/populate:

`static_pages.slug = "features"`

Use the approved Features content.

Map it into the existing `content_blocks` schema.

The page should contain appropriate contextual links to:

* `/docs/dashboard`
* `/docs/budget-alerts`
* `/docs/roi-calculator`
* `/docs/api-auth`
* `/docs/api-endpoints`
* `/use-cases/ai-budget-management`
* `/use-cases/ai-roi-measurement`
* `/pricing`

Verify every destination actually exists.

---

# 6. PRICING PAGE

Create/populate:

`static_pages.slug = "pricing"`

IMPORTANT:

Do NOT modify the dynamic pricing system.

Do NOT hardcode:

* plan names
* prices
* limits
* quotas
* billing values

The existing:

`PricingSection`

and:

`GET /api/public/pricing-plans`

remain authoritative.

Before writing tier-specific surrounding copy:

1. Inspect the live pricing API/data.
2. Confirm the actual plan names.
3. Only use confirmed plan names.

Do NOT publish unsupported:

* trial length
* enterprise policies
* upgrade/downgrade rules
* billing policies

unless verified from the codebase.

Add contextual links where appropriate to:

* `/features`
* `/use-cases/ai-budget-management`
* `/contact-sales`

---

# 7. SECURITY PAGE

Create:

`static_pages.slug = "security"`

Publish only verified product-security claims.

The handoff explicitly identifies these as safe:

* AES-256-GCM encryption at rest for provider API keys
* plaintext keys are never logged
* read-only provider keys where supported
* prompts are not stored; cost/usage metadata only
* TOTP-based two-factor authentication is available

Do NOT publish unsupported claims about:

* SOC 2
* ISO 27001
* HIPAA
* PCI
* GDPR compliance
* TLS versions
* HSTS
* data residency
* audit logging

unless actual code/product evidence confirms them.

---

# 8. ALTERNATIVES PAGES

Implement:

`/alternatives/helicone`
`/alternatives/langfuse`
`/alternatives/portkey`
`/alternatives/litellm`

Use these exact CMS slugs:

* `alternatives-helicone`
* `alternatives-langfuse`
* `alternatives-portkey`
* `alternatives-litellm`

Do NOT accidentally use:

* `helicone`
* `langfuse`
* `portkey`
* `litellm`

as the CMS slug.

Use the existing alternative template/content-block structure.

IMPORTANT:

Any competitor statement marked for verification must be removed from public content until verified.

Never invent competitor:

* pricing
* features
* ownership
* roadmap
* architecture
* limitations
* capabilities

Create contextual links between the alternatives pages and relevant:

* `/features`
* `/use-cases/ai-budget-management`
* relevant blog posts

---

# 9. USE-CASE PAGES

Implement:

`/use-cases/ai-cost-monitoring`
`/use-cases/ai-budget-management`
`/use-cases/ai-roi-measurement`

Use exact CMS slugs:

* `use-cases-ai-cost-monitoring`
* `use-cases-ai-budget-management`
* `use-cases-ai-roi-measurement`

Use the existing:

* hero
* problem
* solution
* workflow
* benefits
* FAQs
* CTA

content-block structure.

For ROI measurement:

DO NOT publish the unverified FAQ claim concerning specific team/project ROI report export/scoping.

Omit it until technically verified.

---

# 10. BLOG IMPLEMENTATION

Create these three posts:

### 1.

`best-ai-cost-management-tools`

### 2.

`prevent-openai-billing-surprises`

### 3.

`measuring-real-roi-of-llms`

Use the approved production-final article content.

Do not invent statistics, citations, authors, case studies, or competitor facts.

Use the existing author convention:

`Ordisum Team`

unless the actual database/codebase establishes another approved convention.

The new articles should contain contextual links to relevant:

* features
* use cases
* docs
* alternatives

where the approved content specifies them.

Also create the required topical relationship between:

`prevent-openai-billing-surprises`

and:

`reduce-llm-api-costs`

Do not keyword-stuff.

---

# 11. DOCUMENTATION — ZERO FAKE DATA

This is one of the highest-priority requirements.

The documentation system is hardcoded in:

`src/docs/content/*.ts`

Do NOT rewrite existing technical documentation merely for SEO.

Do NOT invent:

* API endpoints
* parameters
* authentication methods
* code examples
* provider behavior
* request formats
* workflows
* configuration options
* SDK capabilities
* integrations

unless they are confirmed from the actual codebase.

For this phase:

* metadata/title/description improvements are allowed
* approved SEO wrappers are allowed
* technical body content must remain factual

Correct the ROI calculator URL everywhere:

WRONG:

`/docs/roi-calculator-doc`

CORRECT:

`/docs/roi-calculator`

Search the entire codebase/content/database entries for the incorrect slug and correct newly introduced references.

---

# 12. FOOTER AND NAVIGATION — END-TO-END REQUIREMENT

Inspect the current:

`site_links`

data first.

Do NOT blindly insert duplicate records.

Add only missing required links.

At minimum verify these destinations:

* Features → `/features`
* Pricing → `/pricing`
* Security → `/security`
* Blog → `/blog`
* Docs → `/docs/overview`

Where appropriate and supported by the existing navigation architecture, add discoverability for:

* Alternatives
* Use Cases

You may use the existing alternative/use-case pages as dropdown/group destinations if the current navigation system supports it.

CRITICAL:

Every footer/navigation link must:

1. exist in the DB
2. point to a real route
3. resolve successfully
4. render the intended page
5. not produce a 404
6. not point to `#`
7. not point to a placeholder
8. not point to an outdated slug

Test these links after implementation.

---

# 13. CREATE A COMPLETE INTERNAL-LINK LOOP

Do not treat internal linking as merely “adding some links.”

Build a coherent site architecture.

The important public pages should form a connected network.

At minimum verify this conceptual flow:

Homepage
→ Features
→ Use Cases
→ Docs
→ Blog
→ Alternatives
→ Features / Use Cases
→ Pricing
→ Homepage / relevant conversion destination

This does NOT mean every page must link to every other page.

Instead:

* important pages must have contextual inbound links
* important pages must have relevant outbound links
* no important page should be isolated
* no new page should depend only on a direct URL
* links should follow user intent and topical relevance

Use the 33-relationship matrix in:

`ORDISUM_SEO_CONTENT_PRODUCTION_FINAL.md §13`

as the authoritative internal-link map.

Do not invent additional links solely for SEO.

---

# 14. ORPHAN-PAGE AUDIT

After implementation, programmatically inspect all public SEO/content routes.

Verify:

* `/features`
* `/pricing`
* `/security`
* all `/alternatives/*`
* all `/use-cases/*`
* all public blog posts
* all public docs

Each important page must have at least one meaningful internal inbound link.

Flag any orphan.

If the handoff requires a page to have specific inbound sources, verify those specific relationships.

Do not simply assume the links exist because CMS content was inserted.

---

# 15. ALTERNATIVES / USE-CASES DISCOVERABILITY

The handoff says an Alternatives/Use-Cases index is optional.

Do NOT create a completely new architecture if the codebase does not need it.

However:

Inspect whether existing routes/components already support:

`/alternatives`

and/or:

`/use-cases`

If a suitable existing index route/component exists, populate/use it.

If no index architecture exists:

* do not create an unnecessary complex routing system
* ensure all individual pages remain discoverable through contextual internal links and navigation
* report that no index page existed

If creating an index is low-risk and consistent with the existing architecture, you may implement a lightweight index page, but only after confirming it does not conflict with the existing routing/design system.

---

# 16. AEO / GEO

Implement the approved AEO questions from the production-final document on their specified target pages.

Do not create generic filler answers.

Each answer should:

* directly answer the question
* remain factually consistent with the product
* avoid unsupported superlatives
* avoid fake statistics
* link to the most relevant deeper page when appropriate

Use the exact target mapping from the handoff.

---

# 17. FAQ + FAQ SCHEMA

Extend the existing schema system.

Add:

`buildFAQPage`

to:

`src/lib/schema.ts`

Do NOT create a second schema system.

Critical requirement:

Visible FAQ content and FAQ JSON-LD must be identical in substance.

Never put a FAQ question in JSON-LD if it is not visible on the page.

Never render a FAQ question without including it in the corresponding FAQ schema when FAQ schema is implemented for that page.

Pending/unverified FAQs must be omitted from both visible content and schema.

---

# 18. BLOG ARTICLE SCHEMA

Extend:

`src/lib/schema.ts`

with:

`buildArticle`

or:

`buildBlogPosting`

following the existing schema-builder architecture.

Do not create a parallel schema implementation.

Only output properties supported by actual blog data.

Do not invent:

* author identities
* publication claims
* image information
* publisher data
* dates

Use actual database values.

---

# 19. SEO METADATA

Use the existing:

`useSeo()`

and:

`<Seo>`

system.

Do NOT create another metadata framework.

Implement approved metadata from:

`ORDISUM_SEO_CONTENT_PRODUCTION_FINAL.md §14`

where applicable.

Verify:

* unique title
* unique meta description
* correct canonical
* correct robots
* OG metadata
* exactly one H1
* logical heading hierarchy

Do not hardcode an unresolved production domain.

Use the existing environment/config mechanism.

---

# 20. DOMAIN / CANONICAL SAFETY

The handoff identifies the production domain as unresolved.

Therefore:

DO NOT hardcode:

`ordisum.com`

or:

`app.ordisum.com`

or:

`www.inferenceintelligence.com`

unless the actual project configuration explicitly establishes the correct production domain.

Use the existing:

`VITE_SITE_URL`

frontend configuration and the established backend `SITE_URL`/environment mechanism.

If the production domain cannot be confirmed:

* continue implementing page structure/content
* do not invent the domain
* leave the domain unresolved
* clearly report it as BLOCKED / VERIFY in the final report

---

# 21. SITEMAP

After adding CMS/blog records:

verify the dynamic sitemap:

`/api/public/sitemap.xml`

contains:

* all required published static pages
* all required published blog posts
* no private routes
* no drafts
* no `noindex` pages
* no duplicate URLs

Also inspect:

`public/sitemap.xml`

and:

`public/robots.txt`

Determine which sitemap is authoritative.

Do not create duplicate sitemap architecture unnecessarily.

Do not hardcode an unresolved production domain.

---

# 22. ROBOTS / INDEXABILITY

Public content pages should remain indexable.

Private/auth/admin/dashboard pages must remain protected from indexing according to the existing architecture.

Do NOT weaken the existing private-route protection.

Do not remove existing `robots.txt` exclusions without evidence.

Verify application-level SEO protection as well as robots directives where applicable.

---

# 23. NO DESIGN/ARCHITECTURE REGRESSION

This task is primarily:

* content
* CMS data
* SEO metadata
* internal linking
* schema
* navigation
* validation

Do NOT unnecessarily redesign:

* dashboard
* authentication
* billing
* admin
* existing design system
* unrelated components

Do NOT install new dependencies unless genuinely required.

Do NOT perform database migrations when existing tables already support the required records.

---

# 24. DATABASE SAFETY

Before inserting CMS/blog/navigation records:

inspect the current data.

Do not blindly insert duplicates.

For:

`static_pages`

check existing slug first.

For:

`blog_posts`

check existing slug first.

For:

`site_links`

check existing URL/label/section combinations first.

Use the project's existing database/API conventions.

Do not alter unrelated records.

Do not delete existing content unless the handoff explicitly requires it.

---

# 25. FINAL VALIDATION — DO NOT SKIP

After implementation, perform a real validation pass.

Check every required route.

At minimum:

* `/`
* `/features`
* `/pricing`
* `/security`
* `/alternatives/helicone`
* `/alternatives/langfuse`
* `/alternatives/portkey`
* `/alternatives/litellm`
* `/use-cases/ai-cost-monitoring`
* `/use-cases/ai-budget-management`
* `/use-cases/ai-roi-measurement`
* `/blog`
* all existing blog posts
* all 3 new blog posts
* all 12 docs routes

Verify:

### Routing

* no 404
* no wrong slug
* no duplicate route
* no broken navigation

### Content

* approved production content appears
* no fake content
* no `[VERIFY...]` placeholders
* no pending verification claims accidentally published

### SEO

* title
* description
* canonical
* robots
* OG
* H1
* heading hierarchy

### Schema

* valid JSON-LD
* FAQ schema matches visible FAQ
* Article schema uses actual article data
* no fake reviews/ratings

### Internal Links

* no broken internal links
* required inbound links exist
* required outbound links exist
* no orphan pages
* no obsolete `/docs/roi-calculator-doc` references

### Footer

Click/test every important footer link.

### Sitemap

Verify new published pages appear.

### Build

Run:

`npx tsc --noEmit`

and:

`npm run build`

Fix legitimate implementation errors caused by this task.

Do not hide errors by weakening TypeScript settings.

---

# 26. IMPORTANT: DO NOT “FIX” UNRELATED EXISTING BUGS

If you discover unrelated existing issues:

* do not silently modify them
* do not expand the scope unnecessarily
* record them in the final report

Only fix an unrelated issue if it directly prevents this SEO/content implementation from functioning.

---

# 27. FINAL SEO GRAPH CHECK

Before declaring completion, answer these questions from the actual implementation:

1. Can the homepage reach Features?
2. Can the homepage reach Pricing?
3. Can the homepage reach relevant Use Cases?
4. Can Features reach relevant Docs?
5. Can Features reach Use Cases?
6. Can Features reach Pricing?
7. Can each Alternative page be reached through internal links?
8. Can each Use Case page be reached through internal links?
9. Can blog posts reach relevant BOFU pages?
10. Can relevant pages reach the blog?
11. Can users discover Docs?
12. Can users discover Security?
13. Does every new page have an inbound link?
14. Are any important public pages orphaned?
15. Are any internal links pointing to the old ROI calculator slug?
16. Does the footer contain dead/placeholder links?
17. Does the sitemap contain all published public content?

If any answer is NO, investigate and fix it if it is within this task's scope.

---

# 28. EXTERNAL BACKLINKS — REPORT, DO NOT FAKE

This implementation can create and optimize internal links.

It cannot magically create authoritative external backlinks.

Therefore:

DO NOT create fake backlinks.

DO NOT submit spam links.

DO NOT invent backlink placements.

Instead, in the final report provide a separate section:

`External Backlink Opportunities`

Include realistic opportunities based on the website's content, such as:

* relevant developer communities
* legitimate directories
* product discovery sites
* GitHub/project references
* technical resource pages
* partner/integration pages
* relevant comparison/resource pages
* guest-content opportunities

Clearly distinguish:

`Implemented Internal Links`

from:

`Recommended External Backlink Opportunities`

---

# 29. FINAL IMPLEMENTATION REPORT

Create:

`ORDISUM_SEO_IMPLEMENTATION_REPORT.md`

The report must contain:

## Completed

* pages created
* CMS records
* blog posts
* navigation/footer links
* schema functions
* metadata
* internal links
* AEO content
* FAQ implementation
* validation results

## Not Completed

Anything that could not safely be implemented.

## Verification Required

Include all unresolved items:

* production domain/brand
* trial length
* pricing FAQ policies
* security certifications
* TLS/HSTS
* data residency
* audit logging
* competitor claims
* ROI export/scoping claim
* any other unresolved product fact

## Documentation Safety

Explicitly state:

* no fake technical documentation was introduced
* existing technical documentation was not rewritten with invented facts
* metadata-only SEO changes were made where applicable

## Internal-Link Audit

Report:

* inbound links per important page
* orphan pages
* broken links
* incorrect ROI slug references

## Footer/Nav Audit

Report:

* every required link
* whether it exists
* whether it resolves
* whether duplicates were avoided

## SEO Audit

Report:

* duplicate titles
* duplicate descriptions
* missing metadata
* missing canonicals
* H1 issues
* heading hierarchy issues
* broken links
* schema errors
* sitemap issues
* robots/indexability issues

## Build Validation

Report:

* `npx tsc --noEmit`
* `npm run build`

with PASS/FAIL status.

## External Backlink Opportunities

Separate recommendations from implemented internal linking.

---

# 30. FINAL OPERATING PRINCIPLE

The hierarchy is:

1. Actual codebase/product truth
2. Approved `ORDISUM_SEO_CONTENT_PRODUCTION_FINAL.md`
3. `ORDISUM_SEO_CONTENT_IMPLEMENTATION_HANDOFF.md`
4. Production master/strategy documents
5. Your own assumptions

Never reverse this order.

When information is missing:

DO NOT GUESS.

When information is unverified:

DO NOT PUBLISH IT.

When a route already exists:

DO NOT rebuild it unnecessarily.

When a CMS structure already exists:

USE IT.

When a dynamic pricing system exists:

DO NOT hardcode it.

When technical documentation is not supported by code:

DO NOT invent it.

When a page exists but has no content:

populate the existing architecture rather than creating a duplicate route.

The goal is a **production-safe, factually accurate, internally connected, SEO-ready implementation using the approved Claude content — without fake data or unnecessary architecture changes.**
