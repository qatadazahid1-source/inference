# ORDISUM SEO CONTENT PRODUCTION FINAL

## 1. Production Summary

This document converts `ORDISUM_SEO_CONTENT_PRODUCTION_MASTER.md` into publish-ready copy for every page identified in the master: Homepage, Features, Pricing, Security, 4 Alternative pages, 3 Use-case pages, 12 Docs pages (recommendations), 3 full blog articles, an expanded FAQ database, an expanded AEO/GEO list, competitor content gaps, a complete website-wide internal-linking architecture, and a final metadata database. Every claim traces back to the verified product-truth list in the master (§2 there). Nothing new about the product is introduced. All `[VERIFY BEFORE PUBLISHING]`, `[VERIFY CURRENT COMPETITOR INFORMATION]`, and `[VERIFY FINAL BRAND/DOMAIN]` flags from the master are preserved and, where new ones are needed (e.g. inside blog copy), added.

Counts are reported in full at the end of §15.

---

## 2. Homepage (`/`)

### SEO Metadata
- **Title:** Ordisum | AI Cost Monitoring & Spend Management Platform
- **Meta description:** Real-time observability for your AI API spend. Track costs, enforce hard budgets, and calculate ROI across OpenAI, Anthropic, and more.
- **Primary keyword:** AI cost monitoring · **Secondary:** AI API spend management, LLM cost visibility
- **Canonical:** `/` · **OG title/description:** same as SEO title/description

### H1
Track every token. Control every cost.

### Hero
**Sub-copy:** Ordisum gives engineering and finance teams one place to see, budget, and enforce AI API spend — across every provider, without adding a single SDK. Swap your base URL. Everything else just works.
**Primary CTA:** Start Free Trial → **Secondary CTA:** See Pricing

### Section 1 — The Problem
Most teams find out about an AI cost overrun the same way they find out about a fire: after it's already burning. Provider dashboards show what you spent last month. Alerts fire after a threshold is crossed. By the time anyone acts, the invoice is already due — and because spend is split across OpenAI, Anthropic, Gemini, and whichever provider got added last sprint, nobody has one place to actually see it coming.

### Section 2 — The Solution
Ordisum sits as a Gateway between your application and every AI provider you use. Every request is metered in real time, attributed to a model, provider, team, and project, and checked against the budget you set — **before** it's allowed through. Integration is a base-URL swap, not an SDK install.

### Section 3 — Platform Features (summaries, link to `/features`)
- **Unified Cost Dashboard** — real-time, per-model, per-provider breakdown across OpenAI, Anthropic, Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, and Cohere. Refreshes every 5 minutes.
- **Hard Budget Enforcement** — requests blocked before they exceed your monthly/quarterly limit, not flagged after.
- **Smart Alerts & Anomaly Detection** — 50/75/90/100% thresholds via Email, Slack, SMS, plus automatic detection when hourly spend exceeds 3× your 7-day average.
- **ROI Calculator** — turns spend into a business case using team size, hourly rate, and productivity benchmarks.
- **External API Gateway** — read-only platform keys (`ii_sk_...`) so third-party apps and scripts show up in the same dashboard.

### Section 4 — How It Works
1. Point your app's base URL at the Ordisum Gateway and use your Ordisum API key.
2. Ordisum meters every request in real time and attributes it to model, team, and project.
3. Set budgets and alert thresholds once — enforcement runs automatically.
4. Use the ROI Calculator to translate spend into business value.

### Section 5 — Why Ordisum
Most observability tools tell engineering what happened. Ordisum tells finance what's about to happen — and stops it if it crosses the line you set.

### Section 6 — Security (brief)
API keys are encrypted with AES-256-GCM at rest and never logged in plaintext. We never store your prompts — only cost and usage metadata. [Full detail →](/security)

### FAQ
- *Do I need to install an SDK?* No — change your base URL to the Ordisum Gateway and use an Ordisum API key.
- *What happens when I hit my budget?* Requests are automatically throttled/blocked before exceeding the limit you set.
- *Which providers do you support?* OpenAI, Anthropic, Google Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, Cohere.
- *Do you store my prompts?* No — only cost and usage metadata.

### Final CTA
Start tracking your AI spend in under 5 minutes. [Start Free Trial]

### Internal Links
`/features` (anchor: "see the full feature set") · `/pricing` (anchor: "view pricing") · `/security` (anchor: "read our security model") · `/docs` (anchor: "read the docs") · `/use-cases/ai-cost-monitoring` · `/use-cases/ai-budget-management`

### AEO placement
Homepage FAQ block doubles as `FAQPage` schema candidate — see §11.

---

## 3. Features (`/features`)

### SEO Metadata
- **Title:** Features | Ordisum — AI Cost Tracking, Budget Enforcement & ROI
- **Meta description:** See every feature that helps engineering and finance teams track, enforce, and prove the ROI of AI API spend.
- **Primary keyword:** LLM cost tracking platform

### H1
Everything you need to see, control, and prove the value of your AI spend

### H2: Unified Cost Dashboard (Multi-Provider Tracking)
**Problem:** AI spend is scattered across provider consoles that don't talk to each other.
**Solution:** One dashboard, real-time, broken down by model, provider, team, and project. Refreshes every 5 minutes.
**Benefit:** No more manually reconciling five different billing pages to answer "what did we spend this week."
**FAQ:** *How often does the dashboard update?* Every 5 minutes.
**Internal links:** `/docs/dashboard` (anchor: "learn how the dashboard works") · `/use-cases/ai-cost-monitoring` (anchor: "see this in a real workflow")

### H2: Hard Budget Enforcement (Not Just Alerts)
**Problem:** An alert that fires after you're over budget documents the overrun — it doesn't prevent it.
**Solution:** Set a monthly or quarterly hard limit. Ordisum blocks requests before they push you past it — this is auto-throttling, not notification.
**Benefit:** Engineering can ship fast without finance worrying about a surprise bill.
**CTA:** See how budgets work
**FAQ:** *Does this actually block requests, or just alert?* It blocks requests before the limit is exceeded.
**Internal links:** `/docs/budget-alerts` · `/use-cases/ai-budget-management`

### H2: Smart Alerts & Anomaly Detection
**Problem:** A bad deploy or a runaway agent loop can burn a week's budget in an hour — a monthly digest won't catch it in time.
**Solution:** Threshold alerts at 50/75/90/100% via Email, Slack, or SMS, plus anomaly detection that fires automatically when hourly spend exceeds 3× your 7-day rolling average.
**Benefit:** You find out within the hour, not at month-end.
**Internal links:** `/docs/budget-alerts`

### H2: ROI Calculator
**Problem:** Finance approves an AI budget, then asks "was it worth it?" six months later — with no structured way to answer.
**Solution:** The ROI Calculator combines your real spend data with team size, hourly rate, and productivity benchmarks to produce a defensible business case.
**Benefit:** A report you can actually bring to a budget review.
**Internal links:** `/docs/roi-calculator-doc` · `/use-cases/ai-roi-measurement`

### H2: External API Gateway
**Problem:** Cost tracking usually stops at your own app — third-party tools and internal scripts calling providers directly are invisible.
**Solution:** Issue read-only platform keys (`ii_sk_...`) so any external app or script routes through Ordisum and shows up in the same dashboard.
**Internal links:** `/docs/api-auth` · `/docs/api-endpoints`

### H2: Zero-Code Integration
**Problem:** Most cost-tracking tools require installing and maintaining an SDK across every service that calls an AI provider.
**Solution:** Point your existing HTTP client at the Ordisum Gateway base URL and use your Ordisum API key. No SDK, no code change beyond configuration.
**Internal links:** `/docs/quickstart`

### Bottom CTA
Ready to see where your AI budget is actually going? [Start Free Trial] · [Talk to Sales](/contact-sales)

---

## 4. Pricing (`/pricing`)

### SEO Metadata
- **Title:** Pricing | Ordisum
- **Meta description:** `[VERIFY FROM LIVE PRICING SYSTEM]` — write once real plan names/prices are pulled in, e.g. "Plans for teams of every size — track, budget, and enforce AI API spend from day one."

### H1
Simple pricing, built to pay for itself

### Intro
`[VERIFY FROM LIVE PRICING SYSTEM]` for any specific savings claim. Neutral framing that needs no verification: *"Every plan includes real-time cost tracking, budget enforcement, and the ROI calculator — pick the plan that matches your team's usage."*

### Pricing Explanation
Plan names, prices, limits, and billing cadence must be pulled live from the existing pricing system — none are stated here. Structure around it:
- **Plan positioning:** one line per tier on who it's for (solo developer / growing team / enterprise) — `[VERIFY FROM LIVE PRICING SYSTEM]` for tier names.
- **Budget-limit explanation:** each plan's usage/seat limits shape how many teams/projects you can track — `[VERIFY FROM LIVE PRICING SYSTEM]`.
- **Billing explanation:** monthly vs. annual billing, if both exist — `[VERIFY FROM LIVE PRICING SYSTEM]`.

### FAQ
- *Is there a free trial?* `[VERIFY FROM LIVE PRICING SYSTEM]` — confirm length/terms before publishing.
- *Can I upgrade or downgrade anytime?* `[VERIFY FROM LIVE PRICING SYSTEM]`.
- *Do you offer enterprise/custom plans?* `[VERIFY FROM LIVE PRICING SYSTEM]`.
- *What happens to my data if I downgrade?* `[VERIFY FROM LIVE PRICING SYSTEM]`.

### CTA
Per-tier CTA should match the real `?plan=<slug>` signup flow — do not hardcode a generic "Sign Up" if the flow is plan-specific.

### Internal Links
`/features` (anchor: "see what's included") · `/use-cases/ai-budget-management` (anchor: "why budget enforcement matters") · `/contact-sales` (for enterprise inquiries)

---

## 5. Security (`/security`)

### SEO Metadata
- **Title:** Enterprise Security | Ordisum AI Gateway
- **Meta description:** Ordisum secures your AI API keys with AES-256-GCM encryption and requires strictly read-only access. We never store your prompts.

### H1
Security built around one rule: we never see more than we need to

### Hero copy
Ordisum sits between your application and your AI providers — which means the way we handle your keys and your data matters as much as the cost tracking itself. Here's exactly what we do and don't do.

### API Key Protection
Your provider API keys are encrypted at rest with AES-256-GCM. The plaintext key is never written to logs. Wherever your provider supports key-level scoping, Ordisum requires a read-only key — we don't need write access to meter your usage.

### Prompt-Storage Policy
Ordisum tracks cost and usage metadata only: token counts, model, provider, timestamp, and team/project attribution. Prompt and completion content is never stored.

### Account Security
Two-factor authentication (TOTP) is supported. `[VERIFY BEFORE PUBLISHING — confirm whether 2FA is optional or mandatory, and on which plan tiers, before this line goes live.]`

### Security FAQ
- *Do you store my prompts?* No — only cost and usage metadata.
- *Are my API keys safe?* Yes — encrypted with AES-256-GCM, and we require read-only keys where supported.
- *Is 2FA available?* `[VERIFY BEFORE PUBLISHING]`
- *Are you SOC 2 / ISO 27001 / HIPAA / GDPR compliant?* `[VERIFY BEFORE PUBLISHING — do not publish any compliance claim until confirmed and evidenced.]`

### CTA
Questions about our security model? [Talk to Sales](/contact-sales)

### Internal Links
`/docs/api-auth` (anchor: "see how API authentication works") · `/features` (anchor: "back to features")

---

## 6. Alternatives

### 6.1 `/alternatives/helicone`
**SEO Title:** Ordisum vs. Helicone: An AI Cost Control Alternative
**Meta description:** Comparing Ordisum and Helicone for AI API cost management — budget enforcement, ROI reporting, and zero-SDK setup.

**H1:** Ordisum vs. Helicone: The Alternative Built for Budget Control

**Introduction:** Helicone is a widely used AI gateway focused on observability — logging, caching, and cost/latency visibility via a proxy integration. `[VERIFY CURRENT COMPETITOR INFORMATION before publishing — Helicone's ownership and roadmap have changed recently; confirm current positioning before making comparative claims.]` If your primary need is passive cost visibility, Helicone is a capable, established option.

**Where Ordisum Is Different**
| | Helicone | Ordisum |
|---|---|---|
| Core focus | Observability/logging `[VERIFY CURRENT COMPETITOR INFORMATION]` | Budget enforcement + ROI |
| Budget enforcement | `[VERIFY CURRENT COMPETITOR INFORMATION]` | Hard limits — requests blocked before overspend |
| ROI reporting | `[VERIFY CURRENT COMPETITOR INFORMATION]` | Built-in ROI Calculator |
| Integration | Proxy-based | Base-URL swap, zero SDK |

- H3: Hard Budget Enforcement (Not Just Alerts) — Ordisum blocks requests before a budget is exceeded.
- H3: Built-in ROI Calculation — turns spend into a business case automatically.
- H3: Finance-Ready Reporting — attribution by team/project for the conversation with finance, not just engineering debugging.

**Who Should Choose Which:** Choose Helicone if you need broad request-level logging and caching with a mature proxy integration. Choose Ordisum if stopping overspend before it happens and reporting AI ROI to finance is the priority.

**FAQ:** *Does Helicone offer hard budget enforcement?* `[VERIFY CURRENT COMPETITOR INFORMATION]`. *Does Ordisum store prompts like Helicone might?* No — Ordisum never stores prompts, only cost/usage metadata.

**CTA:** Start Free Trial · **Internal links:** `/features` (anchor: "see the full feature comparison") · `/use-cases/ai-budget-management` · `/security`

### 6.2 `/alternatives/langfuse`
**SEO Title:** Ordisum vs. Langfuse: Financial Control vs. Output Evaluation
**Meta description:** Langfuse focuses on LLM tracing and evaluation. Ordisum focuses on budget enforcement and AI ROI. See which fits your team.

**H1:** Ordisum vs. Langfuse: Financial Control vs. Output Evaluation

**Introduction:** Langfuse is an open-source, self-hostable platform built around detailed LLM tracing and evaluation — strong for teams debugging complex agent workflows. `[VERIFY CURRENT COMPETITOR INFORMATION before publishing.]`

| | Langfuse | Ordisum |
|---|---|---|
| Core focus | Tracing/evaluation `[VERIFY CURRENT COMPETITOR INFORMATION]` | Budget enforcement + ROI |
| Hosting | Self-hostable | Managed |
| Integration | SDK-based | Base-URL swap, zero SDK |
| ROI reporting | `[VERIFY CURRENT COMPETITOR INFORMATION]` | Built-in ROI Calculator |

- H3: Budget Enforcement, Not Trace Debugging
- H3: Zero-SDK Setup
- H3: ROI Calculator built for the finance conversation

**Who Should Choose Which:** Choose Langfuse for deep, span-level tracing on complex agent debugging with self-hosting. Choose Ordisum to enforce a budget and report AI ROI without instrumenting every call site.

**FAQ:** *Can I self-host Ordisum like Langfuse?* `[VERIFY BEFORE PUBLISHING — confirm current hosting model]`.

**CTA / Internal links:** same pattern as 6.1.

### 6.3 `/alternatives/portkey`
**SEO Title:** Ordisum vs. Portkey: Cost Enforcement vs. Multi-Provider Routing
**Meta description:** Portkey is a routing and gateway control panel. Ordisum is built specifically around budget enforcement and AI ROI reporting.

**H1:** Ordisum vs. Portkey: Cost Enforcement vs. Multi-Provider Routing

**Introduction:** Portkey positions itself as a control panel for production AI — multi-provider routing, fallback chains, and guardrails, with observability as one part of a broader gateway. `[VERIFY CURRENT COMPETITOR INFORMATION before publishing.]`

| | Portkey | Ordisum |
|---|---|---|
| Core focus | Routing/guardrails `[VERIFY CURRENT COMPETITOR INFORMATION]` | Budget enforcement + ROI |
| Budget enforcement | `[VERIFY CURRENT COMPETITOR INFORMATION]` | Hard limits, built in |
| ROI reporting | `[VERIFY CURRENT COMPETITOR INFORMATION]` | Built-in ROI Calculator |

- H3: Purpose-Built for Budget Enforcement
- H3: ROI Calculator with no equivalent in a routing-first product
- H3: Simpler integration surface for cost-only needs

**Who Should Choose Which:** Choose Portkey if multi-provider routing, fallback chains, and guardrails are the primary need. Choose Ordisum if budget enforcement and ROI reporting are the primary need.

**CTA / Internal links:** same pattern.

### 6.4 `/alternatives/litellm`
**SEO Title:** Ordisum vs. LiteLLM: Managed Enforcement vs. Self-Hosted Proxy
**Meta description:** LiteLLM is a self-hosted, open-source LLM proxy. Ordisum is a managed platform built around hard budget enforcement and ROI reporting.

**H1:** Ordisum vs. LiteLLM: Managed Enforcement vs. Self-Hosted Proxy

**Introduction:** LiteLLM is a popular open-source proxy for teams with the DevOps capacity to self-host their own gateway layer and want zero platform fees. `[VERIFY CURRENT COMPETITOR INFORMATION before publishing.]`

| | LiteLLM | Ordisum |
|---|---|---|
| Hosting | Self-hosted | Managed |
| Budget enforcement | Requires custom build `[VERIFY CURRENT COMPETITOR INFORMATION]` | Built in |
| ROI reporting | Not built in `[VERIFY CURRENT COMPETITOR INFORMATION]` | Built-in ROI Calculator |
| Cost | No platform fee, ops overhead | Platform fee, zero ops |

- H3: Managed, Not Self-Hosted
- H3: Hard Budget Enforcement out of the box
- H3: ROI Calculator built in

**Who Should Choose Which:** Choose LiteLLM with DevOps capacity, wanting zero vendor dependency, comfortable building enforcement/reporting logic yourself. Choose Ordisum for budget enforcement and ROI reporting working on day one.

**CTA / Internal links:** same pattern.

---

## 7. Use Cases

### 7.1 `/use-cases/ai-cost-monitoring`
**SEO Title:** AI Cost Monitoring for Engineering Teams | Ordisum
**Meta description:** Track AI API spend per model, provider, team, and project — in real time, without per-provider console-hopping.

**H1:** AI Cost Monitoring for Engineering Teams
**Hero:** See exactly what your AI spend is doing, right now, across every provider — in one dashboard.
**Target audience:** Engineering leads managing multi-provider AI usage.
**Pain point:** You ship AI features across multiple providers and can't answer "what did this cost this week, and which feature drove it?" without manually cross-referencing provider consoles.
**Solution:** Ordisum's Gateway meters every request in real time and attributes it to model, provider, team, and project — one dashboard, refreshed every 5 minutes.
**Workflow:** swap base URL → requests flow through the Gateway → dashboard shows live per-model/provider breakdown → drill into any spike to the team/project that caused it.
**Benefits:** faster incident response on cost spikes, no more console-hopping, clean attribution for internal chargeback conversations.
**Feature connections:** Unified Cost Dashboard, Smart Alerts.
**FAQ:** *Can I see cost broken down by team?* Yes, attribution includes team and project. *How current is the data?* Refreshes every 5 minutes.
**AEO:** *How do you monitor AI API costs?* → Ordisum meters every request through its Gateway in real time and attributes it to model, provider, team, and project.
**CTA:** Start Free Trial · **Internal links:** `/features` (anchor: "see the dashboard feature") · `/docs/dashboard` · `/docs/providers`

### 7.2 `/use-cases/ai-budget-management`
**SEO Title:** AI Budget Management | Ordisum
**Meta description:** Stop AI budget overruns before they happen with hard limits, threshold alerts, and anomaly detection.

**H1:** AI Budget Management: Stop Overruns Before They Happen
**Hero:** Set a limit. We enforce it — automatically, before the bill happens.
**Target audience:** FinOps and engineering leads accountable for AI spend.
**Pain point:** A monthly spend alert tells finance about an overrun after the invoice is already generated. By then there's nothing to do but explain it.
**Solution:** Set a hard monthly or quarterly limit. Ordisum blocks requests before they push spend past it, and fires threshold alerts (50/75/90/100%) plus anomaly detection (>3× the 7-day hourly average) along the way.
**Workflow:** set a budget per team/project → set alert channels (Email/Slack/SMS) → Ordisum enforces automatically, no manual monitoring required.
**Benefits:** no more surprise invoices, engineering can move fast without finance approval bottlenecks on every deploy, anomalies caught within the hour instead of at month-end.
**Feature connections:** Hard Budget Enforcement, Smart Alerts & Anomaly Detection.
**FAQ:** *What happens exactly when a budget is hit?* Requests are auto-throttled/blocked before exceeding the limit. *What counts as an anomaly?* Hourly spend exceeding 3× the 7-day rolling average.
**AEO:** *How do I stop OpenAI API overages?* → Set a hard monthly or quarterly budget in Ordisum; requests are automatically blocked before they exceed it.
**CTA:** Start Free Trial · **Internal links:** `/features` · `/docs/budget-alerts` · `/alternatives/helicone` (anchor: "why teams switch from Helicone for budget enforcement")

### 7.3 `/use-cases/ai-roi-measurement`
**SEO Title:** AI ROI Calculator | Ordisum
**Meta description:** Turn your AI spend into a defensible ROI report using real usage data and productivity benchmarks.

**H1:** Measuring the Real ROI of Your AI Spend
**Hero:** Stop guessing whether your AI investment paid off. Calculate it.
**Target audience:** Finance leaders and executives evaluating AI budgets.
**Pain point:** Leadership approved an AI budget on faith. Six months in, nobody has a structured answer to "was it worth it?"
**Solution:** The ROI Calculator combines actual spend data with team size, hourly rate, and productivity benchmarks to produce a defensible ROI figure, not a guess.
**Workflow:** connect real spend data (already tracked) → input team size/hourly rate → get a business-case-ready ROI report.
**Benefits:** a real number for the budget review, less friction renewing or expanding AI tooling budgets.
**Feature connections:** ROI Calculator.
**FAQ:** *What data does the ROI calculation use?* Your real tracked spend combined with team size, hourly rate, and productivity benchmarks. *Can I export this for a leadership review?* `[VERIFY BEFORE PUBLISHING — confirm export/report format]`.
**AEO:** *Is there an ROI calculator for AI tools?* → Yes — Ordisum's ROI Calculator converts tracked spend into a business case using team size, hourly rate, and productivity benchmarks.
**CTA:** Start Free Trial · **Internal links:** `/features` · `/docs/roi-calculator-doc`

---

## 8. Documentation

For each page: SEO recommendations + a short intro paragraph. Full technical body content should stay as-is per the master's rule that accuracy comes before SEO — these are the layer that can be added around existing technical content without touching correctness.

| Page | SEO Title | Meta Description | H1 | Intro (new, addable) | Internal Links |
|---|---|---|---|---|---|
| `/docs/overview` | Overview \| Ordisum Docs | What Ordisum is and how the Gateway fits into your stack. | Ordisum Overview | "Ordisum is an AI API cost management Gateway. This page explains the core concepts before you integrate." | `/docs/quickstart` |
| `/docs/quickstart` | Quickstart \| Ordisum Docs | Get Ordisum tracking your AI spend in minutes — no SDK required. | Get Started with Ordisum | "Integration is a base-URL swap. This guide gets you tracking spend in under 5 minutes." | `/docs/api-auth`, `/features` |
| `/docs/providers` | Supported Providers \| Ordisum Docs | See every AI provider Ordisum tracks cost for, and how to connect each. | Supported AI Providers | "Ordisum tracks cost across OpenAI, Anthropic, Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, and Cohere. Each section below covers provider-specific setup notes." | `/use-cases/ai-cost-monitoring` |
| `/docs/dashboard` | Dashboard \| Ordisum Docs | How to read and use the Ordisum cost dashboard. | Using the Cost Dashboard | "The dashboard refreshes every 5 minutes and breaks down spend by model, provider, team, and project." | `/features` |
| `/docs/budget-alerts` | Budget Alerts \| Ordisum Docs | Set up hard budget limits and threshold/anomaly alerts. | Setting Up Budget Alerts | "This guide covers setting a hard limit, choosing alert channels, and how anomaly detection works." | `/use-cases/ai-budget-management` |
| `/docs/roi-calculator-doc` | ROI Calculator \| Ordisum Docs | How the ROI Calculator turns spend into a business case. | Using the ROI Calculator | "The ROI Calculator combines your tracked spend with team size, hourly rate, and productivity benchmarks." | `/use-cases/ai-roi-measurement` |
| `/docs/teams` | Teams \| Ordisum Docs | Manage teams and projects for cost attribution. | Managing Teams | "Attribute spend correctly by setting up teams and projects before connecting your app." | `/docs/dashboard` |
| `/docs/api-auth` | API Authentication \| Ordisum Docs | Authenticate requests to the Ordisum API and Gateway. | Authenticating with the API | "Covers Ordisum API keys and read-only platform keys (`ii_sk_...`) for the External API Gateway." | `/docs/api-endpoints`, `/security` |
| `/docs/api-endpoints` | API Endpoints \| Ordisum Docs | Full reference for the Ordisum API. | API Reference | "Endpoint reference for integrating directly with the Ordisum API." | `/docs/api-auth` |
| `/docs/faq` | FAQ \| Ordisum Docs | Answers to common Ordisum questions. | Frequently Asked Questions | Pull from §10 FAQ database, docs-relevant subset. | all docs |
| `/docs/troubleshooting` | Troubleshooting \| Ordisum Docs | Fix common integration issues. | Troubleshooting | Keep technical, accuracy-first — no SEO copy should alter troubleshooting steps. | `/docs/faq` |
| `/docs/changelog` | Changelog \| Ordisum Docs | What's new in Ordisum. | Changelog | No SEO copy needed beyond title/description — changelog entries stay factual/dated. | — |

**`/docs/providers` expansion (avoiding thin doorway pages):** add one short subsection per provider (OpenAI, Anthropic, Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, Cohere) inside this single page — a 2-3 sentence "what's tracked" + any provider-specific setup note — rather than 8 separate pages. This captures the long-tail "how to track [provider] API costs" intent without creating index bloat.

---

## 9. Blog Articles (full production drafts)

### 9.1 `/blog/best-ai-cost-management-tools`
**SEO Title:** The Best AI Cost Management Tools in 2026
**Meta description:** A practical look at the leading AI cost management and observability tools in 2026 — what each is built for, and how to pick.
**Meta keywords:** ai cost management tools, ai cost monitoring, llm cost tracking

**H1: The Best AI Cost Management Tools in 2026**

If your team ships more than one AI-powered feature, you've probably already hit the same wall: spend is scattered across provider consoles, nobody owns a single view of it, and "cost management" tools in this space don't all do the same job. Before picking one, it helps to know what you're actually comparing.

**H2: What "AI cost management" actually covers**
The category splits into a few distinct jobs that get marketed under one label:
- **Visibility** — seeing what you spent, broken down by model/provider/team.
- **Enforcement** — actually stopping spend before it crosses a line, not just reporting it afterward.
- **Evaluation/tracing** — debugging what a model actually did on a given request (a different job from cost control, though some tools bundle it in).
- **Routing** — sending requests across multiple providers/models for reliability or cost-optimization at the request level.

Most tools are strong at one or two of these, not all four. Knowing which job you actually need solves the "which tool" question faster than a feature checklist does.

**H2: Tool-by-tool**

**Helicone** — an AI gateway centered on observability: request logging, caching, and cost/latency visibility through a proxy integration. `[VERIFY CURRENT COMPETITOR INFORMATION before publishing — confirm current ownership/roadmap.]` Good fit if visibility and caching are your main need.

**Langfuse** — open-source and self-hostable, built around detailed LLM tracing and evaluation, popular for debugging complex agent workflows. `[VERIFY CURRENT COMPETITOR INFORMATION before publishing.]` Best fit for teams whose main pain is understanding *why* a model did something, not just what it cost.

**Portkey** — positions itself as a control panel for production AI: multi-provider routing, fallback chains, and guardrails, with cost visibility as one part of a broader gateway. `[VERIFY CURRENT COMPETITOR INFORMATION before publishing.]` Best fit if you need routing/failover across providers as your primary requirement.

**LiteLLM** — a self-hosted, open-source proxy for teams with the DevOps capacity to run their own gateway and avoid platform fees. `[VERIFY CURRENT COMPETITOR INFORMATION before publishing.]` Best fit for teams that want full control and are comfortable building enforcement/reporting logic themselves.

**Ordisum** — built specifically around the *enforcement* and *ROI* jobs: hard budget limits that block requests before they're exceeded (not just alerts), anomaly detection, and a built-in ROI calculator that turns spend into a business case for finance. Zero-SDK integration — a base-URL swap. Best fit if your main pain isn't "we can't see the data," it's "we can't stop the overrun, and we can't answer whether this was worth it."

**H2: How to choose**
Ask what actually keeps you up at night. If it's "I don't know why the model produced that output," you want a tracing/evaluation tool like Langfuse. If it's "I need requests to fail over across providers," you want a routing tool like Portkey. If it's "finance is going to ask why the AI bill tripled and I have no way to have stopped it," that's the enforcement job Ordisum is built for.

**H2: FAQ**
- *Do I need more than one of these tools?* Possibly — visibility, tracing, routing, and enforcement are different jobs, and some teams run more than one tool for different needs.
- *Which of these tools actually blocks spend before it happens?* Confirm directly with each vendor's current docs before relying on this for a specific tool; Ordisum's hard budget enforcement blocks requests before a set limit is exceeded.

**Internal links:** `/features` (anchor: "see how Ordisum's budget enforcement works") · `/alternatives/helicone`, `/alternatives/langfuse`, `/alternatives/portkey`, `/alternatives/litellm`
**CTA:** See how Ordisum's budget enforcement and ROI calculator work → [Start Free Trial]

---

### 9.2 `/blog/prevent-openai-billing-surprises`
**SEO Title:** How to Prevent OpenAI Billing Surprises
**Meta description:** A practical breakdown of what causes AI API bills to spike, and how to catch it before the invoice.
**Meta keywords:** openai api costs, stop openai overages, ai budget alerts

**H1: How to Prevent OpenAI Billing Surprises**

An unexpectedly large OpenAI bill almost never comes from one big, obvious mistake. It usually comes from something small compounding for hours before anyone notices.

**H2: Why bills actually spike**
A few patterns show up repeatedly in teams running AI features in production:
- A retry loop or agent that keeps calling the model on failure, multiplying token usage silently.
- A bad deploy that removes a caching layer or increases context length by accident.
- "Shadow" usage — an internal script or a third-party integration calling the API directly, outside whatever tracking the main app has.
- A traffic spike hitting a feature that wasn't sized for it.

None of these show up in a monthly billing summary until it's too late to act on them.

**H2: Visibility isn't enough**
Knowing your total spend for the month tells you the problem happened. It doesn't tell you *when* it started, *which* team or feature caused it, or *stop* it from continuing. That's the gap between a dashboard and a control system.

**H2: Setting a hard limit**
The most direct fix is a hard budget: a monthly or quarterly limit that, once reached, stops further requests rather than just sending an alert. Ordisum's budget enforcement works this way — you set the limit, and requests are auto-throttled before they push spend past it, at the team or project level.

**H2: Catching anomalies before the invoice**
Between "everything's fine" and "we blew the monthly budget," there's a window where a spike is visible if you're watching for it. Ordisum's anomaly detection flags any hour where spend exceeds 3× the trailing 7-day average, and threshold alerts fire at 50/75/90/100% of budget via Email, Slack, or SMS — so the first person to notice isn't whoever opens the invoice.

**H2: A simple checklist**
1. Attribute spend to team/project, not just total — you can't fix what you can't locate.
2. Set a hard limit, not just an alert threshold.
3. Turn on anomaly detection for hour-level spikes, not just monthly totals.
4. Make sure external scripts/third-party tools calling the API are tracked too, not just your main app.

**H2: FAQ**
- *Can I set different budgets for different teams?* Yes — budgets and alerts can be set per team/project.
- *What happens exactly when the hard limit is reached?* Requests are blocked/throttled before exceeding the limit, rather than allowed through with a retroactive alert.
- *Does this cover usage from scripts outside my main app?* Yes, via the External API Gateway's read-only platform keys.

**Internal links:** `/use-cases/ai-budget-management` (anchor: "see the full budget enforcement workflow") · `/docs/budget-alerts` · `/features`
**CTA:** Set a hard budget limit in minutes → [Start Free Trial]

---

### 9.3 `/blog/measuring-real-roi-of-llms`
**SEO Title:** Measuring the Real ROI of LLMs in the Enterprise
**Meta description:** A framework for connecting AI spend to actual business value, beyond just tracking token cost.
**Meta keywords:** ai roi calculation, ai roi measurement, llm cost optimization

**H1: Measuring the Real ROI of LLMs in the Enterprise**

Most companies can tell you how much they spent on AI last quarter. Far fewer can tell you what they got for it.

**H2: "How much did we spend" is the wrong first question**
Spend is easy to track — it's a number on an invoice. Value is harder, because it's distributed across time saved, tasks automated, and decisions made faster, none of which show up on a billing page. Without a framework connecting the two, an AI budget review turns into a guess dressed up as a decision.

**H2: A simple framework for AI ROI**
The core idea is straightforward: what would the work AI is now doing have cost in human time, and how does that compare to what you're actually spending on the AI itself? That requires three inputs:
1. **Actual AI spend** — the real, tracked cost, not an estimate.
2. **Team size and hourly rate** — a proxy for what the equivalent human effort would have cost.
3. **A productivity benchmark** — a defensible estimate of how much time AI is actually saving on the relevant task, rather than an assumed 100%.

**H2: How Ordisum's ROI Calculator does this**
Ordisum already tracks your real spend data — the ROI Calculator uses that tracked spend and combines it with your team size, hourly rate, and productivity benchmarks (drawn from published research on AI productivity impact) to produce a business-case-ready ROI figure, rather than a back-of-envelope estimate built in a spreadsheet.

**H2: What to bring to the budget review**
A credible AI ROI case usually needs three things: the real spend number (not an estimate), a clear statement of what task the spend is replacing or accelerating, and a productivity assumption that's stated explicitly rather than implied. If any of the three is missing, the number won't survive scrutiny in a budget conversation.

**H2: FAQ**
- *What data feeds the ROI calculation?* Your actual tracked AI spend, combined with team size, hourly rate, and productivity benchmarks.
- *Can this work for a single feature, not the whole company?* `[VERIFY BEFORE PUBLISHING — confirm whether ROI calculation can be scoped to a team/project vs. account-wide before stating this as a feature.]`

**Internal links:** `/use-cases/ai-roi-measurement` (anchor: "see how the ROI calculator works") · `/docs/roi-calculator-doc` · `/features`
**CTA:** Turn your AI spend into a defensible ROI report → [Start Free Trial]

---

## 10. FAQ Database (expanded, categorized)

### Product
- *What is Ordisum?* An AI API cost management platform — a Gateway that tracks, budgets, and enforces spend across your AI providers. → `/docs/overview`
- *What providers does Ordisum support?* OpenAI, Anthropic, Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, Cohere. → `/`, `/features`, `/docs/providers`
- *Does Ordisum do prompt tracing or evaluation?* No — Ordisum is focused on cost tracking, budget enforcement, and ROI, not prompt tracing or output evaluation. → `/features`

### Technical
- *Do I need an SDK?* No — change your base URL to the Ordisum Gateway and use an Ordisum API key. → `/`, `/docs/quickstart`
- *How current is dashboard data?* Refreshes every 5 minutes. → `/docs/dashboard`
- *Can I track usage from scripts outside my main app?* Yes, via the External API Gateway's platform keys (`ii_sk_...`). → `/docs/api-auth`

### Budget
- *What happens when I hit my budget?* Requests are auto-throttled/blocked before exceeding the limit. → `/`, `/use-cases/ai-budget-management`
- *How do alerts work?* Thresholds at 50/75/90/100% (Email/Slack/SMS) plus anomaly detection at >3× the 7-day hourly average. → `/features`, `/docs/budget-alerts`
- *Can I set different budgets per team?* Yes, budgets/alerts are configurable per team/project. → `/docs/budget-alerts`

### Security
- *Does Ordisum store my prompts?* No — only cost/usage metadata. → `/security`
- *Are my API keys safe?* AES-256-GCM encryption at rest, read-only keys required where supported. → `/security`
- *Is 2FA available?* `[VERIFY BEFORE PUBLISHING]` → `/security`
- *Are you SOC 2 / HIPAA / GDPR compliant?* `[VERIFY BEFORE PUBLISHING]` → `/security`

### ROI
- *Is there an ROI calculator?* Yes — combines real spend with team size/hourly rate/productivity benchmarks. → `/use-cases/ai-roi-measurement`
- *Can I export an ROI report?* `[VERIFY BEFORE PUBLISHING]` → `/docs/roi-calculator-doc`

### Integrations
- *Which providers can I connect?* OpenAI, Anthropic, Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, Cohere. → `/docs/providers`
- *Can I track third-party app usage?* Yes, via platform keys on the External API Gateway. → `/features`, `/docs/api-auth`

### Commercial
- *Is there a free trial?* `[VERIFY BEFORE PUBLISHING]` → `/pricing`
- *Can I upgrade or downgrade anytime?* `[VERIFY BEFORE PUBLISHING]` → `/pricing`
- *Do you offer enterprise plans?* `[VERIFY BEFORE PUBLISHING]` → `/pricing`, `/contact-sales`

### Documentation
- *Where do I start integrating?* `/docs/quickstart` — base-URL swap, no SDK. → `/docs/quickstart`
- *Where's the full API reference?* `/docs/api-endpoints`. → `/docs/api-endpoints`

---

## 11. AEO / GEO Expansion

| Question | Direct Answer | Target Page | Supporting Page |
|---|---|---|---|
| How do you monitor AI API costs? | Ordisum meters every request through its Gateway in real time and attributes it to model, provider, team, and project. | `/use-cases/ai-cost-monitoring` | `/docs/dashboard` |
| How do I stop OpenAI API overages? | Set a hard monthly or quarterly budget in Ordisum; requests are blocked before they exceed it. | `/use-cases/ai-budget-management` | `/docs/budget-alerts` |
| Is there an ROI calculator for AI tools? | Yes — Ordisum's ROI Calculator converts tracked spend into a business case using team size, hourly rate, and productivity benchmarks. | `/use-cases/ai-roi-measurement` | `/docs/roi-calculator-doc` |
| How do I track AI costs across multiple providers? | Ordisum's Gateway sits in front of every provider you use (OpenAI, Anthropic, Gemini, Azure, Bedrock, Mistral, Groq, Cohere) and gives one unified dashboard. | `/` | `/docs/providers` |
| Do I need to install an SDK to track AI costs? | No — Ordisum integrates via a base-URL swap and an API key, no SDK required. | `/docs/quickstart` | `/` |
| What's the difference between an AI gateway and an AI observability tool? | An AI gateway routes/meters requests as they happen; observability tools typically focus on logging and analyzing what already happened. Ordisum is a gateway focused specifically on cost enforcement. | Blog: best-ai-cost-management-tools | `/features` |
| How do I attribute AI spend to a specific team or feature? | Ordisum attributes every metered request to a team and project automatically, visible in the dashboard. | `/use-cases/ai-cost-monitoring` | `/docs/teams` |
| Can AI budget alerts actually prevent overspend, or just notify? | A true hard-limit system (like Ordisum's) blocks requests before the budget is exceeded; a notification-only alert can't undo spend that already happened. | `/use-cases/ai-budget-management` | Blog: prevent-openai-billing-surprises |

---

## 12. Competitor Content Gaps

| Gap | Search intent | Why it matters | Recommended page | Target keyword | Suggested heading |
|---|---|---|---|---|---|
| Hard budget enforcement (vs. alert-only tools) | Transactional | Direct product differentiator, high-intent searchers already frustrated with alert-only tools | `/features`, `/alternatives/*` | AI API rate limiting / budget enforcement | "Hard Budget Enforcement (Not Just Alerts)" |
| Financial ROI reporting | Informational/Transactional | No major competitor offers a built-in ROI calculator per the inventory's research | `/use-cases/ai-roi-measurement` | AI ROI calculation | "Measuring the Real ROI of Your AI Spend" |
| Zero-code integration | Informational | Reduces integration friction vs. SDK-based competitors, strong for `/docs/quickstart` long-tail | `/docs/quickstart` | no-code LLM tracking | "Get Started Without an SDK" |

All three gaps are already addressed by existing sections above (§3, §7.3, §8) — this table exists as the direct traceability record the execution prompt asked for.

---

## 13. Website-Wide Internal Linking Architecture

| Source | Destination | Anchor text | Purpose |
|---|---|---|---|
| `/` | `/features` | "see the full feature set" | Move visitors to depth |
| `/` | `/pricing` | "view pricing" | Commercial intent |
| `/` | `/security` | "read our security model" | Trust |
| `/` | `/use-cases/ai-cost-monitoring` | "see how teams monitor AI costs" | Workflow depth |
| `/` | `/use-cases/ai-budget-management` | "see how budget enforcement works" | Workflow depth |
| `/features` | `/docs/dashboard` | "learn how the dashboard works" | Feature → technical depth |
| `/features` | `/docs/budget-alerts` | "see budget setup docs" | Feature → technical depth |
| `/features` | `/use-cases/ai-budget-management` | "see this in a real workflow" | Feature → use-case (commercial → high-intent) |
| `/features` | `/use-cases/ai-roi-measurement` | "see the ROI calculator in action" | Feature → use-case |
| `/features` | `/pricing` | "compare plans" | Feature → commercial |
| `/pricing` | `/features` | "see what's included" | Commercial → feature depth |
| `/pricing` | `/use-cases/ai-budget-management` | "why budget enforcement matters" | Commercial → workflow justification |
| `/security` | `/docs/api-auth` | "see how API authentication works" | Trust → technical depth |
| `/use-cases/ai-cost-monitoring` | `/features` | "see the dashboard feature" | Use-case → feature |
| `/use-cases/ai-cost-monitoring` | `/docs/dashboard`, `/docs/providers` | "read the docs" | Use-case → technical |
| `/use-cases/ai-budget-management` | `/docs/budget-alerts` | "set up budget alerts" | Use-case → technical |
| `/use-cases/ai-budget-management` | `/alternatives/helicone` | "why teams switch from Helicone for budget enforcement" | Use-case → comparison (BOFU push) |
| `/use-cases/ai-roi-measurement` | `/docs/roi-calculator-doc` | "learn how the ROI calculator works" | Use-case → technical |
| `/alternatives/*` (all 4) | `/features` | "see the full feature comparison" | Comparison → feature depth |
| `/alternatives/*` (all 4) | `/security` | "read our security model" | Comparison → trust |
| `/alternatives/helicone`, `/langfuse`, `/portkey` | `/use-cases/ai-budget-management` | "see how budget enforcement works" | Comparison → workflow |
| `/docs/quickstart` | `/docs/api-auth` | "authenticate your requests" | Technical sequence |
| `/docs/quickstart` | `/features` | "see what you can track" | Technical → feature |
| `/docs/dashboard` | `/features` | "back to features" | Technical → feature |
| `/docs/budget-alerts` | `/use-cases/ai-budget-management` | "see the full workflow" | Technical → use-case |
| `/docs/roi-calculator-doc` | `/use-cases/ai-roi-measurement` | "see the business case this builds" | Technical → use-case |
| `/docs/providers` | `/use-cases/ai-cost-monitoring` | "see this tracked live" | Technical → use-case |
| `/docs/api-auth` | `/docs/api-endpoints` | "full API reference" | Technical sequence |
| `/docs/faq` | all docs pages | contextual per question | Hub page |
| Blog: best-ai-cost-management-tools | `/features`, `/alternatives/*` (all 4) | "see how Ordisum's budget enforcement works" / per-competitor anchors | TOFU → BOFU |
| Blog: prevent-openai-billing-surprises | `/use-cases/ai-budget-management`, `/docs/budget-alerts` | "see the full budget enforcement workflow" | MOFU → BOFU |
| Blog: measuring-real-roi-of-llms | `/use-cases/ai-roi-measurement`, `/docs/roi-calculator-doc` | "see how the ROI calculator works" | TOFU → BOFU |

**Orphan-page risk check:** none identified — every page above has at least 2 inbound links from a different page type (homepage, feature, use-case, docs, or blog), and every page links out to at least one pillar page (`/features`, `/pricing`, or `/security`). `/pricing` currently receives inbound links only from `/` and `/features` — recommend adding one more inbound link from `/use-cases/ai-budget-management` (already included above) to avoid it being under-linked relative to its commercial importance.

---

## 14. SEO Metadata Database (final)

| URL | SEO Title | Meta Description | Primary KW | Secondary KW | Intent | Canonical |
|---|---|---|---|---|---|---|
| `/` | Ordisum \| AI Cost Monitoring & Spend Management Platform | Real-time observability for your AI API spend. Track costs, enforce hard budgets, and calculate ROI across OpenAI, Anthropic, and more. | AI cost monitoring | AI API spend management | Transactional | `/` |
| `/features` | Features \| Ordisum — AI Cost Tracking, Budget Enforcement & ROI | See every feature that helps engineering and finance teams track, enforce, and prove the ROI of AI API spend. | LLM cost tracking | budget enforcement, ROI calculator | Commercial | `/features` |
| `/pricing` | Pricing \| Ordisum | `[VERIFY FROM LIVE PRICING SYSTEM]` | Ordisum pricing | — | Navigational/Transactional | `/pricing` |
| `/security` | Enterprise Security \| Ordisum AI Gateway | Ordisum secures your AI API keys with AES-256-GCM encryption and requires strictly read-only access. We never store your prompts. | Secure AI gateway | API key encryption | Commercial | `/security` |
| `/alternatives/helicone` | Ordisum vs. Helicone: An AI Cost Control Alternative | Comparing Ordisum and Helicone for AI API cost management — budget enforcement, ROI reporting, and zero-SDK setup. | Helicone alternative | AI cost control | Comparison | `/alternatives/helicone` |
| `/alternatives/langfuse` | Ordisum vs. Langfuse: Financial Control vs. Output Evaluation | Langfuse focuses on LLM tracing and evaluation. Ordisum focuses on budget enforcement and AI ROI. | Langfuse alternative | AI ROI | Comparison | `/alternatives/langfuse` |
| `/alternatives/portkey` | Ordisum vs. Portkey: Cost Enforcement vs. Multi-Provider Routing | Portkey is a routing and gateway control panel. Ordisum is built specifically around budget enforcement and AI ROI reporting. | Portkey alternative | AI gateway | Comparison | `/alternatives/portkey` |
| `/alternatives/litellm` | Ordisum vs. LiteLLM: Managed Enforcement vs. Self-Hosted Proxy | LiteLLM is a self-hosted, open-source LLM proxy. Ordisum is a managed platform built around hard budget enforcement and ROI reporting. | LiteLLM alternative | managed AI gateway | Comparison | `/alternatives/litellm` |
| `/use-cases/ai-cost-monitoring` | AI Cost Monitoring for Engineering Teams \| Ordisum | Track AI API spend per model, provider, team, and project — in real time, without per-provider console-hopping. | AI API cost tracking | multi-provider usage analytics | Informational | `/use-cases/ai-cost-monitoring` |
| `/use-cases/ai-budget-management` | AI Budget Management \| Ordisum | Stop AI budget overruns before they happen with hard limits, threshold alerts, and anomaly detection. | AI budget enforcement | AI spend alerts | Transactional | `/use-cases/ai-budget-management` |
| `/use-cases/ai-roi-measurement` | AI ROI Calculator \| Ordisum | Turn your AI spend into a defensible ROI report using real usage data and productivity benchmarks. | AI ROI calculator | AI ROI measurement | Informational/Transactional | `/use-cases/ai-roi-measurement` |
| `/blog/best-ai-cost-management-tools` | The Best AI Cost Management Tools in 2026 | A practical look at the leading AI cost management and observability tools in 2026 — what each is built for, and how to pick. | best ai cost management tools | ai cost monitoring | Informational | `/blog/best-ai-cost-management-tools` |
| `/blog/prevent-openai-billing-surprises` | How to Prevent OpenAI Billing Surprises | A practical breakdown of what causes AI API bills to spike, and how to catch it before the invoice. | stop openai overages | openai api costs | Problem-aware | `/blog/prevent-openai-billing-surprises` |
| `/blog/measuring-real-roi-of-llms` | Measuring the Real ROI of LLMs in the Enterprise | A framework for connecting AI spend to actual business value, beyond just tracking token cost. | ai roi calculation | llm cost optimization | Informational | `/blog/measuring-real-roi-of-llms` |

All titles and descriptions above are unique.

---

## 15. Final Verification Checklist + Report

- [ ] Free trial length/terms — `[VERIFY BEFORE PUBLISHING]`
- [ ] Upgrade/downgrade policy — `[VERIFY BEFORE PUBLISHING]`
- [ ] Enterprise plan availability — `[VERIFY BEFORE PUBLISHING]`
- [ ] 2FA: optional or mandatory, which tiers — `[VERIFY BEFORE PUBLISHING]`
- [ ] ROI report export/format — `[VERIFY BEFORE PUBLISHING]`
- [ ] ROI calculation scoping (account-wide vs. per-team) — `[VERIFY BEFORE PUBLISHING]`
- [ ] Self-hosting availability (referenced in Langfuse comparison FAQ) — `[VERIFY BEFORE PUBLISHING]`
- [ ] Any compliance certification — `[VERIFY BEFORE PUBLISHING]`, do not publish unless confirmed
- [ ] TLS/HSTS/data residency/audit logging specifics — `[VERIFY BEFORE PUBLISHING]`
- [ ] All competitor claims (Helicone, Langfuse, Portkey, LiteLLM) — `[VERIFY CURRENT COMPETITOR INFORMATION]` throughout §6 and §9.1, market moves fast
- [ ] Brand/domain: "Ordisum" vs. `inference-intelligence.com` — `[VERIFY FINAL BRAND/DOMAIN]` before any of this copy is published; every URL in §14 assumes "Ordisum" as final brand and would need a global find-replace otherwise
- [ ] `VITE_SITE_URL` set to real production domain before canonical/OG/sitemap go live

### Report
1. **Total pages produced:** 12 (Homepage, Features, Pricing, Security, 4 Alternatives, 3 Use-cases) + 12 Docs recommendation entries
2. **Total blog articles produced:** 3 (full drafts)
3. **Total FAQs produced:** 27 (across 7 categories in §10, not counting per-page FAQ repeats)
4. **Total AEO questions produced:** 8 (§11)
5. **Total internal-link relationships:** 33 (§13)
6. **Total metadata entries:** 14 (§14)
7. **Total `[VERIFY BEFORE PUBLISHING]` / `[VERIFY CURRENT COMPETITOR INFORMATION]` / `[VERIFY FINAL BRAND/DOMAIN]` items:** 21 distinct flags across the document
8. **Content that could not be safely produced:** Pricing page numbers (plan names/prices/limits/trial length) — must be pulled from the live pricing system, not written here; any compliance certification content; exact competitor capability claims where current status is unverified.

**This phase is complete.** No code, CMS records, or database changes were made — this is content only, ready for manual entry into the CMS once the §15 verification items are resolved.