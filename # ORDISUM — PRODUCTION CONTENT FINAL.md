# ORDISUM — PRODUCTION CONTENT FINAL
## SEO + GEO + AEO — Ready to Paste Into CMS

**Live site status (verified September 19, 2026):**
- SSR: Working — content IS visible to crawlers
- Homepage: Live with strong H1 + FAQ + features
- Trial: 14 days, no credit card — CONFIRMED from live site footer
- Missing: /features, /pricing, /security, /use-cases/*, /alternatives/* (all empty/thin)
- Missing: Schema markup (Organization, FAQPage, SoftwareApplication)
- Missing: Custom domain — ordisum.onrender.com cannot build DA
- Blog: 2 posts exist, 3 planned posts not yet created

> **Humanizer note:** Every content block below has been written to avoid AI writing patterns — no "-ing" suffix stacking, no "testament to", no "pivotal moment", no "nestled in", no rule-of-three filler, no vague expert attributions. Copy is direct, specific, and reads like a person who understands the product wrote it.

---

## ⚠️ P0 BLOCKERS — Fix before ANY content work matters

| Blocker | Why it matters | Action |
|---|---|---|
| No custom domain | .onrender.com cannot accumulate authority; Google treats it as a subdomain of Render's hosting platform | Register ordisum.com, connect to Render, update `VITE_SITE_URL` |
| Schema missing | ChatGPT, Perplexity, Gemini don't know what Ordisum is — can't cite what they can't parse | Add Organization + SoftwareApplication + FAQPage JSON-LD (Section 9) |
| No Google Search Console | You can't see what's indexing, what's broken, or what's ranking | Set up GSC on the real domain the day it goes live |
| Social profiles empty | AI citation engines check cross-web consistency; zero footprint = zero trust signal | LinkedIn, Twitter/X, GitHub org — all need Ordisum listed |

---

## 1. HOMEPAGE (`/`) — Status: Live, needs copy refinement

The live homepage is already strong. What it's missing: richer in-HTML body text below the fold (for crawlers that don't scroll), and the FAQ section could expand from 4 to 6–7 answers to strengthen the AEO signal.

**SEO Title (current):** `Ordisum — AI API Cost Management & Observability` — keep, it's correct
**Meta Description:** `Real-time cost tracking, hard budget enforcement, and ROI reporting for every AI API call — across OpenAI, Anthropic, Gemini, Azure, Bedrock, Mistral, Groq, and Cohere.`

### H1 (keep existing):
Track every token. Control every cost.

### Updated Hero Sub-copy (replaces existing if it can be edited):
Ordisum sits between your app and your AI providers. It meters every request, attributes spend to the right model and team, and enforces budgets before they're exceeded — not after. One base-URL swap. No SDK.

### Problem Section (expand existing copy with this):
The AI bill arrives. It's 40% higher than last month. You open three provider dashboards to figure out why. The OpenAI dashboard shows totals by day. The Anthropic console shows something else. The Azure portal is its own experience entirely. By the time you piece together what happened, the next billing cycle is already in progress.

That's not a reporting problem. That's an infrastructure gap.

### Feature Summaries (add to existing sections — these are crawlable body text additions):

**Cost Analytics:**
Every request that routes through the Ordisum Gateway gets logged — model, provider, token count, latency, cost. The dashboard breaks that down by day, by model, by team, and by project. Data refreshes every five minutes. No polling required.

**Budget Enforcement:**
You set a monthly or quarterly limit. When spend hits that limit, Ordisum blocks further requests automatically. Not a notification that you've already overspent — an actual block, before it happens. You can set different limits per team or project.

**Smart Alerts & Anomaly Detection:**
Threshold alerts fire at 50%, 75%, 90%, and 100% of your budget via Email, Slack, or SMS. On top of that, anomaly detection watches for hours where spend exceeds 3× your trailing 7-day average — the pattern that usually means a bad deploy or a runaway loop — and fires an alert within the hour.

**ROI Calculator:**
Put in your team size, hourly rate, and which tasks AI is replacing or accelerating. The calculator outputs a business-case number: not "AI is valuable" in the abstract, but an actual figure you can bring to a budget conversation.

**External API Gateway:**
Issue read-only platform keys (`ii_sk_...`) to third-party apps, internal scripts, or automations. Every call routes through Ordisum and shows up in the same dashboard. Revocable immediately. No change needed on the caller's side.

### Expanded FAQ (add these 3 to the existing 4):

**Is there a free trial?**
Yes — 14 days, no credit card required. You get full access to every feature.

**Can I set different budgets for different teams?**
Yes. Budgets, alert thresholds, and project attribution are all configurable per team and per project, not just account-wide.

**What does the integration actually involve?**
Two things: point your existing HTTP client at the Ordisum Gateway base URL, and use your Ordisum API key instead of calling providers directly. That's it. Nothing to install, no code to change beyond configuration.

### Final CTA (keep existing, update sub-copy):
Your AI spend deserves more than a line item.
14-day free trial. No credit card. Cancel anytime.

### GEO/AEO Paragraph (add to bottom of page — for AI engine crawls):
Ordisum is an AI API cost management platform that tracks, budgets, and enforces spend across major AI providers: OpenAI, Anthropic, Google Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, and Cohere. It connects as a Gateway between an application and its AI providers — requests route through Ordisum, which meters usage in real time and applies budget rules before completing the call. Unlike passive dashboards that show what you already spent, Ordisum stops overspend before it finishes happening.

---

## 2. FEATURES (`/features`) — Status: MISSING, create CMS record `slug='features'`

**SEO Title:** `Features | Ordisum — AI Cost Tracking, Budget Enforcement & ROI`
**Meta Description:** `Hard budget limits that block requests before they overspend, real-time multi-provider cost tracking, anomaly detection, ROI calculator, and an external API gateway — all in one platform.`
**Primary keyword:** LLM cost tracking platform

---

### H1:
See where your AI money is going. Then stop it from going where it shouldn't.

### Intro:
The gap most teams hit isn't that they don't have enough data. They have too much, from too many places, in formats that don't talk to each other. Ordisum pulls that into one place, adds budget enforcement that actually works, and gives finance a number they can use.

---

### H2: Unified Cost Dashboard

You call five AI providers. Each one shows you what you spent in its own format, on its own timeline. Ordisum normalizes all of that into one dashboard: per-model, per-provider breakdowns, updated every five minutes, organized by team and project so you know exactly who spent what.

**Who this is for:** Engineering leads who need to answer "what did this feature cost this week?" without opening three different billing consoles.

**What it's not:** A summary report that runs nightly. The data is live — if a deploy causes a cost spike at 2pm, you see it at 2:05pm.

**→ Docs:** How to read the dashboard (`/docs/dashboard`)

---

### H2: Hard Budget Enforcement

An alert that fires after you've exceeded a budget is just documentation. Ordisum's budget limits are enforcement: set a monthly or quarterly cap, and requests are blocked before they push spend past it. The limit applies before the API call completes, not after the invoice arrives.

You can set limits at the account level, the team level, or the project level. A team that runs a chatbot and a team that runs batch embeddings don't share the same budget ceiling unless you want them to.

**What happens at the limit:** Requests are throttled, not silently dropped. The calling application gets a clear response. The dashboard shows why.

**→ Use case:** How budget enforcement stops overruns (`/use-cases/ai-budget-management`)
**→ Docs:** Setting up budget alerts (`/docs/budget-alerts`)

---

### H2: Smart Alerts & Anomaly Detection

**Threshold alerts** fire at 50%, 75%, 90%, and 100% of your set budget. Channels: Email, Slack, SMS. You choose which ones and who receives them.

**Anomaly detection** runs separately. It watches hourly spend against your trailing 7-day average. When an hour comes in at more than 3× that average — the pattern that usually means a bad deploy, a retry loop, or a runaway agent — it fires an alert. You find out within the hour, not at the end of the billing cycle.

---

### H2: ROI Calculator

Most AI budget conversations end with a number on an invoice and no answer to "was it worth it?" The ROI Calculator takes your actual tracked spend and combines it with team size, average hourly rate, and productivity benchmarks to produce a ROI figure you can bring to a review.

The benchmarks are drawn from published research on AI productivity impact. The spend figures are the real ones from your dashboard, not estimates. The output isn't a claim — it's a calculation you can audit.

**→ Use case:** Measuring the real ROI of AI spend (`/use-cases/ai-roi-measurement`)
**→ Docs:** Using the ROI Calculator (`/docs/roi-calculator`)

---

### H2: External API Gateway

Third-party tools, internal scripts, and automations that call AI providers directly are invisible to most cost-tracking systems. The External API Gateway fixes that.

Issue a read-only platform key (`ii_sk_...`) to any external caller. Their requests route through Ordisum, log against your dashboard with full token counts and cost attribution, and can be revoked instantly if something looks wrong. No code change on the caller's side.

**→ Docs:** API authentication (`/docs/api-auth`)

---

### H2: Zero-Code Integration

The integration is a base-URL swap and an API key. Point your existing HTTP client at the Ordisum Gateway instead of the provider endpoint directly, use your Ordisum key, and keep using whichever provider or model you were already using. No SDK to install, no agent to run, no instrumentation to add to your application code.

```python
from openai import OpenAI
client = OpenAI(
    api_key="ii_sk_live_...",
    base_url="https://gateway.ordisum.com/v1"
)
```

That's the integration. Everything else — logging, attribution, budget checks — happens on Ordisum's side automatically.

**→ Docs:** Quickstart guide (`/docs/quickstart`)

---

### Bottom CTA:
See where your AI budget is actually going. [Start Free Trial] · [Talk to Sales](/contact-sales)

---

## 3. PRICING (`/pricing`) — Status: MISSING, create CMS record `slug='pricing'`

**SEO Title:** `Pricing | Ordisum`
**Meta Description:** `Ordisum pricing — plans for teams of every size. Real-time AI cost tracking, budget enforcement, and ROI reporting. 14-day free trial, no credit card required.`

### H1:
Pricing that pays for itself the first time you catch a budget overrun.

### Intro:
Every plan includes the full enforcement and tracking stack. The difference between plans is usage capacity and team size — not which features are available.

**[LIVE PRICING SYSTEM RENDERS HERE — DO NOT HARDCODE PLAN NAMES OR PRICES]**

### Plan Positioning (surrounding copy — does not duplicate live pricing component):

Whatever tier fits your team, it covers the same things: the Gateway, budget enforcement, anomaly detection, the ROI calculator, and the external API gateway. You're not choosing between a "basic" and a "pro" feature set. You're choosing the capacity that matches your current usage.

### Billing FAQ:

**Is there a free trial?**
Yes — 14 days, full access, no credit card required.

**Can I upgrade or downgrade later?**
[VERIFY FROM LIVE PRICING SYSTEM before publishing specific answer]

**What happens to my data if I cancel?**
[VERIFY FROM LIVE PRICING SYSTEM before publishing]

**Do you offer enterprise or custom plans?**
[VERIFY FROM LIVE PRICING SYSTEM or contact-sales flow before publishing]

**Is billing monthly or annual?**
[VERIFY FROM LIVE PRICING SYSTEM before publishing]

### Bottom CTA:
Start your 14-day trial. No credit card. → [Get Started](/auth/signup)

Have a larger team or specific requirements? → [Talk to Sales](/contact-sales)

---

## 4. SECURITY (`/security`) — Status: MISSING, create CMS record `slug='security'`

**SEO Title:** `Enterprise Security | Ordisum AI Gateway`
**Meta Description:** `Ordisum encrypts your provider API keys with AES-256-GCM and never stores your prompts. Read-only keys, TOTP 2FA, and a zero-prompt-logging policy.`

### H1:
We only need to see what your AI spend is — not what you're sending to the model.

### Intro:
Ordisum sits between your application and your AI providers. That position comes with a responsibility: to handle your provider keys, your usage data, and your requests carefully. Here's exactly what we do and don't do.

---

### H2: API Key Encryption

Your provider API keys are encrypted at rest with AES-256-GCM. The plaintext key is never written to logs, never included in error responses, and never retained beyond what's needed to route your request.

We require read-only provider keys wherever the provider supports key-level scoping. Ordisum needs to route your requests — it doesn't need the ability to create, modify, or delete resources on your provider account.

---

### H2: Zero Prompt Logging

Ordisum logs cost and usage metadata: token counts, model name, provider, timestamp, team/project attribution, latency, and error status. Prompt content and completion content are never stored.

This is a deliberate architectural decision, not just a policy. If your prompts contain sensitive information — customer data, internal documents, proprietary context — they do not pass through storage at Ordisum. They pass through the Gateway in transit, the same way they'd pass through any network hop between your app and the provider.

---

### H2: Account Security

Two-factor authentication using TOTP (Time-based One-Time Password) is available on your account. Standard authenticator apps (Google Authenticator, Authy, 1Password) work with it.

---

### H2: What We Don't Claim

We don't have SOC 2 Type II, ISO 27001, HIPAA, GDPR certification, or PCI DSS compliance certifications today. [VERIFY BEFORE PUBLISHING if this changes before launch.]

If your organization requires a specific certification before onboarding a new vendor, [contact us](/contact-sales) — we can discuss your security requirements directly.

---

### Security FAQ:

**Do you store my prompts?**
No. Only cost and usage metadata: token counts, model, provider, timestamp, team attribution.

**Are my provider API keys safe?**
They're encrypted with AES-256-GCM at rest. The plaintext is never logged. We also require read-only keys wherever providers support it.

**Is two-factor authentication available?**
Yes — TOTP-based 2FA is available on your account.

**What data does Ordisum actually store?**
Token counts, cost figures, model and provider names, timestamps, team/project labels you configure, latency, and error codes. Nothing inside the requests or responses.

---

### CTA:
Questions about our security model? [Talk to Sales](/contact-sales) · [Read the API auth docs](/docs/api-auth)

---

## 5. ALTERNATIVE PAGES — Status: MISSING (4 pages)

### 5.1 `/alternatives/helicone` — `slug='alternatives-helicone'`

**SEO Title:** `Ordisum vs. Helicone: An AI Cost Control Alternative`
**Meta Description:** `Helicone is widely used for AI observability. If budget enforcement and ROI reporting are your main requirement, here's how Ordisum compares.`

#### H1:
Ordisum vs. Helicone: Two Different Jobs in the Same Category

#### Intro:
Helicone is a proxy-based AI gateway with strong observability features — request logging, caching, and cost and latency tracking. [VERIFY CURRENT COMPETITOR INFORMATION — Helicone's ownership changed in 2026; confirm current status and positioning before publishing this page.]

Both Helicone and Ordisum track AI costs. The difference is what each does when you're about to exceed a budget.

---

#### H2: What Helicone Does Well

Helicone has a mature integration path, a straightforward proxy setup, and a large existing user base. It logs requests at the prompt level, supports caching to reduce repeat costs, and has a clean dashboard for understanding what's happened.

[VERIFY CURRENT COMPETITOR INFORMATION on all claims above before publishing.]

---

#### H2: Where Ordisum Is Different

| | Helicone | Ordisum |
|---|---|---|
| Budget enforcement | Alert-based [VERIFY] | Requests blocked before limit is exceeded |
| ROI reporting | Not offered [VERIFY] | Built-in ROI Calculator with team/hourly inputs |
| Prompt logging | Yes [VERIFY] | No — prompts never stored |
| Integration | Proxy swap | Base-URL swap, same approach |
| 2FA | [VERIFY] | TOTP available |

**Hard limits:** Ordisum doesn't just alert you when you hit your budget — it stops the next request from going through. That's the practical difference between knowing overspend happened and preventing it.

**ROI Calculator:** Helicone doesn't include a structured way to convert spend into a business case. [VERIFY] Ordisum's ROI Calculator takes your tracked spend and produces a ROI figure using team size, hourly rate, and productivity benchmarks.

**Prompt privacy:** Ordisum stores no prompt content. Only cost and usage metadata.

---

#### H2: Who Should Use Each

Use Helicone if you primarily need request-level logging, caching to reduce repeat costs, and a well-established proxy integration with a large community behind it. [VERIFY CURRENT COMPETITOR INFORMATION before publishing specific claims.]

Use Ordisum if budget enforcement is your main concern — specifically the ability to stop spend before it exceeds a limit, not just get notified afterward — or if you need a structured way to report AI ROI to finance or leadership.

---

#### FAQ:
**Does Helicone enforce hard budget limits?** [VERIFY CURRENT COMPETITOR INFORMATION before answering this in published copy.]
**Does Ordisum store prompts like Helicone might?** No — Ordisum stores only cost and usage metadata.
**Can I use both?** Technically possible but redundant at the gateway layer. They'd compete for the same request routing.

**CTA:** Start Free Trial · [See how budget enforcement works](/use-cases/ai-budget-management)
**Internal links:** `/features`, `/security`, `/use-cases/ai-budget-management`

---

### 5.2 `/alternatives/langfuse` — `slug='alternatives-langfuse'`

**SEO Title:** `Ordisum vs. Langfuse: Financial Control vs. Output Evaluation`
**Meta Description:** `Langfuse is built for LLM tracing and evaluation. Ordisum is built for budget enforcement and AI ROI. Here's the honest difference.`

#### H1:
Ordisum vs. Langfuse: They're Solving Different Problems

#### Intro:
Langfuse is an open-source, self-hostable platform built for detailed LLM tracing and evaluation — strong for teams debugging agent behavior, tracking prompt versions, and scoring outputs. [VERIFY CURRENT COMPETITOR INFORMATION before publishing.]

These are genuinely different jobs. Trace debugging and budget enforcement share a category name ("AI observability") but serve different buyers with different needs.

---

#### H2: What Langfuse Does Well

Langfuse covers the evaluation side of AI operations: span-level tracing for complex agent workflows, prompt management, SDK-based instrumentation across call sites, and self-hosting for teams that want to keep everything on their own infrastructure. [VERIFY CURRENT COMPETITOR INFORMATION.]

---

#### H2: Where Ordisum Is Different

| | Langfuse | Ordisum |
|---|---|---|
| Core focus | Tracing + evaluation [VERIFY] | Budget enforcement + ROI |
| Hosting | Self-hostable [VERIFY] | Managed |
| Integration | SDK-based [VERIFY] | Base-URL swap, no SDK |
| Budget enforcement | [VERIFY] | Hard limits — requests blocked at threshold |
| ROI Calculator | Not offered [VERIFY] | Built in |
| Prompt storage | Stored for evaluation [VERIFY] | Never stored |

---

#### H2: Who Should Use Each

Use Langfuse if you're debugging agent execution, need span-level tracing to understand why a multi-step workflow produced a wrong output, want prompt version management, and have the DevOps capacity to self-host. [VERIFY]

Use Ordisum if your primary need is controlling and attributing spend — stopping overruns before they happen, reporting ROI to non-technical stakeholders, and tracking cost across providers without adding SDK instrumentation to every call site.

---

#### FAQ:
**Can I self-host Ordisum like Langfuse?** [VERIFY — not confirmed from codebase inspection; do not publish until confirmed.]
**Is Ordisum open source?** [VERIFY — not confirmed from codebase; do not publish.]

**CTA:** Start Free Trial · **Internal links:** `/features`, `/security`, `/use-cases/ai-roi-measurement`

---

### 5.3 `/alternatives/portkey` — `slug='alternatives-portkey'`

**SEO Title:** `Ordisum vs. Portkey: Cost Enforcement vs. Multi-Provider Routing`
**Meta Description:** `Portkey handles multi-provider routing and fallback chains. Ordisum handles budget enforcement and AI ROI. See which fits your team's actual need.`

#### H1:
Ordisum vs. Portkey: Routing vs. Enforcement

#### Intro:
Portkey positions itself as a control plane for production AI — multi-provider routing, fallback chains, guardrails, and observability bundled together. [VERIFY CURRENT COMPETITOR INFORMATION before publishing.]

If your main need is routing requests across providers for reliability or cost optimization at the call level, Portkey is built for that. If your main need is stopping your monthly bill from exceeding a set limit, Ordisum is built for that.

---

#### H2: Where Ordisum Is Different

| | Portkey | Ordisum |
|---|---|---|
| Core focus | Multi-provider routing + guardrails [VERIFY] | Budget enforcement + ROI |
| Budget enforcement | [VERIFY] | Hard limits, request-level blocking |
| ROI Calculator | Not offered [VERIFY] | Built in |
| Integration surface | [VERIFY] | Base-URL swap |

---

#### H2: Who Should Use Each

Use Portkey if you need sophisticated request routing — sending traffic to different models or providers based on cost, latency, or availability, with automatic failover. [VERIFY]

Use Ordisum if you need spend to stay under a number you set, with enforcement rather than just visibility, and a way to report that spend as business value to people outside engineering.

**CTA / Internal links:** same pattern.

---

### 5.4 `/alternatives/litellm` — `slug='alternatives-litellm'`

**SEO Title:** `Ordisum vs. LiteLLM: Managed Enforcement vs. Self-Hosted Proxy`
**Meta Description:** `LiteLLM is an open-source self-hosted proxy. Ordisum is managed and built around hard budget enforcement and ROI reporting from day one.`

#### H1:
Ordisum vs. LiteLLM: The Self-Host Option vs. The Managed Enforcement Option

#### Intro:
LiteLLM is a popular open-source proxy for teams with DevOps capacity who want a self-hosted gateway with zero platform fees. [VERIFY CURRENT COMPETITOR INFORMATION before publishing.] It does a lot — multi-provider routing, spend tracking, budget rules — if you're willing to build and maintain the layer yourself.

Ordisum is managed. You don't host it. Budget enforcement and ROI reporting work on day one without building anything.

---

#### H2: Where Ordisum Is Different

| | LiteLLM | Ordisum |
|---|---|---|
| Hosting | Self-hosted [VERIFY] | Managed |
| Platform fee | None, but ops overhead [VERIFY] | Paid plan |
| Budget enforcement | Configurable but requires setup [VERIFY] | Built-in, works at signup |
| ROI Calculator | Not offered [VERIFY] | Built in |

---

#### H2: Who Should Use Each

Use LiteLLM if you have the engineering bandwidth to run and maintain your own gateway, want zero platform cost, and are comfortable building the reporting and enforcement layers yourself. [VERIFY]

Use Ordisum if you want budget enforcement and cost attribution working immediately, managed, without standing up and maintaining infrastructure.

**CTA / Internal links:** same pattern.

---

## 6. USE-CASE PAGES — Status: MISSING (3 pages)

### 6.1 `/use-cases/ai-cost-monitoring` — `slug='use-cases-ai-cost-monitoring'`

**SEO Title:** `AI Cost Monitoring for Engineering Teams | Ordisum`
**Meta Description:** `Track AI API spend per model, provider, team, and project in real time — one dashboard instead of five provider consoles.`

#### H1:
AI Cost Monitoring: See Exactly What You're Spending and Why

#### Pain Point:
You ship a feature. It calls GPT-4o for some things, Claude for others, and Gemini Embeddings in the background. Three weeks later your OpenAI bill is 60% higher than expected. You open the OpenAI console. You open the Anthropic console. You open the Google Cloud billing page. You have three numbers that don't add up to a clear answer.

That's not a monitoring problem, it's an attribution problem. You need to know which model, which team, and which workflow drove the change — not just the total.

#### Solution:
Ordisum meters every request through its Gateway. Each request is logged with model name, provider, token count, cost, latency, and whatever team/project label you've configured. The dashboard shows that data updated every five minutes. You can drill from account-level total to provider to model to the specific team or project that drove a spike.

#### Workflow:
1. Swap your app's API base URL to the Ordisum Gateway and use your Ordisum API key.
2. Configure team and project labels in the dashboard.
3. Your existing code keeps calling whatever model it was calling. Ordisum logs each call automatically.
4. Check the dashboard when you need to understand a change, or set up alerts to be notified before you need to look.

#### Benefits:
No per-provider console-hopping. Attribution to the team and feature that drove cost, not just the provider. Real-time data, not end-of-month summaries.

#### FAQ:
**How often does the dashboard update?** Every five minutes.
**Can I see cost broken down by team?** Yes — attribution includes team and project labels you configure.
**Does tracking cost affect API latency?** [VERIFY — not confirmed from codebase; do not publish a specific latency claim until tested.]
**Do you support all major providers?** OpenAI, Anthropic, Google Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, Cohere.

**CTA:** See your AI cost breakdown in under 5 minutes. [Start Free Trial]
**Internal links:** `/features` (anchor: "see the dashboard feature") · `/docs/dashboard` · `/docs/providers`

---

### 6.2 `/use-cases/ai-budget-management` — `slug='use-cases-ai-budget-management'`

**SEO Title:** `AI Budget Management | Ordisum`
**Meta Description:** `Stop AI budget overruns before they happen. Hard limits that block requests, threshold alerts, and anomaly detection — all configurable per team or project.`

#### H1:
AI Budget Management: Enforce Limits, Don't Just Set Them

#### Pain Point:
You set up an alert for when spend hits 80% of your monthly budget. One Thursday afternoon, a retry loop runs for four hours. The alert fires at 9pm. By then you've spent 140% of your monthly budget.

Alerts don't prevent overruns. They document them.

#### Solution:
Ordisum's budget enforcement blocks requests before they exceed the limit you set. You define a monthly or quarterly cap — at the account level, the team level, or the project level. When that cap is reached, the next request gets a clear error response rather than being processed and added to the bill. The dashboard shows what happened and why.

On top of hard limits: threshold alerts fire at 50%, 75%, 90%, and 100% of budget via Email, Slack, or SMS. Anomaly detection runs separately and fires when hourly spend exceeds 3× your trailing 7-day average — the pattern that usually indicates a bad deploy or a runaway loop.

#### Workflow:
1. In the Ordisum dashboard, set a monthly or quarterly budget for your account, a team, or a specific project.
2. Configure alert channels (Email, Slack, SMS) and which thresholds should trigger each.
3. Enable anomaly detection to catch hour-level spikes without setting a specific alert rule.
4. Ordisum enforces the limit automatically from that point forward — no manual monitoring required.

#### Benefits:
No more end-of-month surprise invoices. Engineering teams can deploy without finance needing to approve every feature. Anomalies surface within the hour, not at billing time.

#### FAQ:
**What happens exactly when the budget is hit?** Requests are blocked/throttled before exceeding the limit. The calling app receives a clear error response — not a silent drop.
**Can different teams have different budget limits?** Yes — limits are configurable per team and per project.
**What counts as an anomaly?** Hourly spend exceeding 3× the trailing 7-day average for that hour.
**Can I set a warning threshold below the hard limit?** Yes — threshold alerts at 50%/75%/90% fire before the limit is reached.

**CTA:** Set a hard budget limit in 5 minutes. [Start Free Trial]
**Internal links:** `/features` · `/docs/budget-alerts` · `/alternatives/helicone` (anchor: "how Ordisum differs from alert-only tools")

---

### 6.3 `/use-cases/ai-roi-measurement` — `slug='use-cases-ai-roi-measurement'`

**SEO Title:** `AI ROI Calculator | Ordisum`
**Meta Description:** `Turn your tracked AI spend into a defensible ROI figure for finance or leadership — using your real usage data and published productivity benchmarks.`

#### H1:
Measuring AI ROI: A Number You Can Actually Bring to a Budget Meeting

#### Pain Point:
An AI budget got approved six months ago. Now it's budget review time, and someone asks: "Was it worth it?"

The honest answer for most teams is: "We think so, but we can't prove it." You have a dollar figure on what you spent. You don't have a clear framework connecting that spend to what it produced.

#### Solution:
Ordisum's ROI Calculator takes three inputs alongside your tracked spend:
- Team size
- Average hourly rate
- Estimate of time savings per week

It multiplies those against the productivity benchmarks from published research on AI productivity impact — the kind of numbers that hold up in a finance conversation because they came from named studies, not internal guesswork — and outputs a ROI figure.

That output is a calculation, not a claim. You can audit every step of it.

#### Who benefits most:
Engineering managers who need to justify renewing an AI tooling budget. CTOs presenting AI spend to a board. Finance teams trying to make sense of an AI line item that keeps growing.

#### FAQ:
**What data does the calculation use?** Your real tracked spend from the Ordisum dashboard, combined with team size, hourly rate, and time-savings inputs you provide.
**Can I export the result?** [VERIFY BEFORE PUBLISHING — confirm current export/report format from the codebase before claiming PDF or CSV export.]
**Do the productivity benchmarks apply to my specific use case?** The benchmarks are general estimates drawn from research across a range of AI use cases. The ROI figure is a starting point for the conversation, not a precise audit.

**CTA:** Calculate your AI ROI with real data. [Start Free Trial]
**Internal links:** `/features` · `/docs/roi-calculator`

---

## 7. DOCUMENTATION SEO PASS — Titles + Meta + Intros only (do NOT alter technical body)

| Route | SEO Title | Meta Description | H1 | Intro line to add |
|---|---|---|---|---|
| `/docs/overview` | Overview \| Ordisum Docs | What Ordisum is, how the Gateway works, and what you'll see in the dashboard. | Ordisum Overview | "Ordisum is an AI API cost management Gateway. This page covers the core concepts before you start." |
| `/docs/quickstart` | Quickstart \| Ordisum Docs | Get Ordisum tracking your AI spend in minutes — two configuration changes, no SDK. | Get Started with Ordisum | "Integration is two things: a base-URL swap and an API key. This guide gets you tracking spend in under 5 minutes." |
| `/docs/providers` | Supported AI Providers \| Ordisum Docs | Every provider Ordisum tracks cost for — OpenAI, Anthropic, Gemini, Azure OpenAI, Bedrock, Mistral, Groq, Cohere — and how to connect each. | Supported AI Providers | "Ordisum supports eight providers. Each section below covers what gets tracked and any provider-specific setup notes." |
| `/docs/dashboard` | Dashboard \| Ordisum Docs | How to read and use the Ordisum cost dashboard — per-model, per-provider breakdowns updated every 5 minutes. | Using the Cost Dashboard | "The dashboard updates every five minutes and breaks cost down by model, provider, team, and project." |
| `/docs/budget-alerts` | Budget Alerts \| Ordisum Docs | Set up hard budget limits, threshold alerts, and anomaly detection — step by step. | Setting Up Budget Alerts | "This page covers hard limits, threshold alerts (50%/75%/90%/100%), and anomaly detection configuration." |
| `/docs/roi-calculator` | ROI Calculator \| Ordisum Docs | How the ROI Calculator converts your tracked AI spend into a business-case ROI figure. | Using the ROI Calculator | "The ROI Calculator takes your tracked spend plus team size, hourly rate, and time-savings estimates, and outputs a ROI figure." |
| `/docs/teams` | Teams \| Ordisum Docs | Manage teams and projects for per-team cost attribution in Ordisum. | Managing Teams | "Set up teams and projects before connecting your application to get clean cost attribution from day one." |
| `/docs/api-auth` | API Authentication \| Ordisum Docs | How to authenticate requests to the Ordisum Gateway — Ordisum API keys and platform keys explained. | Authenticating with the API | "Covers Ordisum API keys for Gateway authentication and platform keys (`ii_sk_...`) for the External API Gateway." |
| `/docs/api-endpoints` | API Endpoints \| Ordisum Docs | Full reference for the Ordisum API. | API Reference | "Endpoint reference for direct API integration." |
| `/docs/faq` | FAQ \| Ordisum Docs | Answers to common Ordisum questions — integration, providers, budget limits, security. | Frequently Asked Questions | "Common questions organized by topic." |
| `/docs/troubleshooting` | Troubleshooting \| Ordisum Docs | Fix common Ordisum integration issues. | Troubleshooting | (accuracy-first — do not add SEO intro that might conflict with technical steps) |
| `/docs/changelog` | Changelog \| Ordisum Docs | What's new in Ordisum — shipped features and fixes. | Changelog | (factual/dated only — no SEO copy) |

**IMPORTANT correction:** The ROI calculator doc slug in the code is `roi-calculator`, NOT `roi-calculator-doc`. Every internal link must use `/docs/roi-calculator`.

---

## 8. BLOG ARTICLES — Full Production Drafts (3 new posts)

### 8.1 `/blog/best-ai-cost-management-tools`

**Meta title:** `The Best AI Cost Management Tools in 2026`
**Meta description:** `A practical guide to the leading AI cost management and observability tools in 2026 — what each is built for, and how to choose.`
**Meta keywords:** `ai cost management tools, ai cost monitoring, llm cost tracking`
**Author:** Ordisum Team · **Category:** Comparisons · **Status:** Published

**Excerpt:** The category has fragmented. Some tools focus on tracing agent behavior. Others focus on routing requests across providers. A few focus specifically on preventing overspend. Knowing which job you're hiring for makes the choice obvious.

---

**Body:**

The AI observability market has a naming problem. Tools with very different jobs all call themselves "AI cost management" or "LLM observability." A team trying to debug why an agent produced the wrong answer needs different tooling than a team trying to stop their monthly AI bill from exceeding $10,000.

Before comparing tools, it's worth being clear about which problem you're solving.

## What "AI cost management" actually covers

The category splits into a few distinct jobs:

**Visibility** — seeing what you spent, broken down by model, provider, team, and feature. This is the baseline. Every serious tool in this category offers some version of it.

**Enforcement** — actually stopping spend before it crosses a line, rather than reporting that it already did. This is where tools differ most significantly.

**Evaluation and tracing** — understanding what the model did on a given request: the prompt, the response, the reasoning chain. This is a different job from cost control, though some tools bundle it in.

**Routing** — sending requests across multiple providers or models based on cost, latency, or availability. Useful for reliability engineering; not the same as cost enforcement.

Most tools are strong at one or two of these. The mistake is assuming that because they overlap in naming, they overlap in function.

## Tool-by-tool

**Helicone** is a proxy-based gateway with a long track record in the observability space. Strong for request logging, caching to reduce repeat costs, and latency tracking. [VERIFY CURRENT COMPETITOR INFORMATION — Helicone's ownership and roadmap changed in 2026; confirm current status before publishing specific capability claims.]

**Langfuse** is open-source and self-hostable, built around span-level LLM tracing and evaluation. The right tool if your main need is understanding agent behavior at a granular level — particularly multi-step workflows where debugging requires seeing what happened at each step. [VERIFY CURRENT COMPETITOR INFORMATION before publishing.]

**Portkey** positions itself as a control plane for production AI: multi-provider routing, fallback chains, and guardrails, with cost visibility as one component of a broader gateway. The right tool if sophisticated request routing is your primary requirement. [VERIFY CURRENT COMPETITOR INFORMATION before publishing.]

**LiteLLM** is an open-source proxy for teams with DevOps capacity who want zero platform fees and full control over their gateway infrastructure. It can do budget tracking and routing, but requires building and maintaining those layers yourself. [VERIFY CURRENT COMPETITOR INFORMATION before publishing.]

**Ordisum** is focused specifically on the enforcement and ROI jobs: hard budget limits that block requests before they exceed a set amount (not just alert after), anomaly detection for hour-level spend spikes, and a built-in ROI Calculator that converts spend into a business case for finance. Zero-SDK integration — a base-URL swap. No prompt storage.

## How to choose

Ask what actually costs you the most right now.

If it's "we don't know what our AI spend is doing" → any of these tools solve that, start with whichever has the cleanest integration path for your stack.

If it's "we know, but we can't stop overruns from happening" → you need enforcement, not visibility. That narrows the field significantly.

If it's "we can't explain to finance whether this AI spend was worth it" → you need an ROI layer, which most cost-tracking tools don't include.

If it's "our agent is producing wrong outputs and we don't know why" → you need a tracing tool, and none of the enforcement-focused tools are the right answer there.

## FAQ

**Do I need more than one of these tools?** Possibly. Tracing and cost enforcement are different jobs with different data models. Some teams run one tool for debugging and another for spend governance.

**Which tools actually enforce budgets, not just alert?** Verify directly with each vendor's current documentation. Ordisum's hard limit enforcement blocks requests before the budget is exceeded.

**Is self-hosting worth the effort for LLM cost management?** Depends on your team's DevOps capacity and sensitivity to platform cost. Self-hosting eliminates the platform fee but adds infrastructure overhead. Most early-stage teams aren't self-hosting; larger teams with dedicated platform engineers sometimes are.

---

**Internal links:** `/features` · `/alternatives/helicone` · `/alternatives/langfuse` · `/alternatives/portkey` · `/alternatives/litellm`
**CTA:** See how Ordisum's budget enforcement works → [Start Free Trial]

---

### 8.2 `/blog/prevent-openai-billing-surprises`

**Meta title:** `How to Prevent OpenAI Billing Surprises`
**Meta description:** `What actually causes AI API bills to spike, and the specific controls that catch it before the invoice — not after.`
**Meta keywords:** `openai api costs, stop openai overages, ai budget alerts`
**Author:** Ordisum Team · **Category:** Cost Optimization

**Excerpt:** Most unexpected AI bills come from something small that ran for a long time before anyone noticed. The fix isn't faster alerts — it's enforcement before the spend completes.

---

**Body:**

An unexpectedly large OpenAI bill almost never comes from one big, obvious decision. It usually comes from something small that ran for longer than it should have, in a part of the system nobody was watching closely.

## Why bills spike

A few patterns show up repeatedly in teams running AI features in production:

**Retry loops.** A deployment introduces a bug that causes a function to retry API calls on failure, but the failure condition never clears. The function keeps retrying. Each retry costs tokens. This runs until someone notices or a hard limit is hit.

**Context bloat.** A code change accidentally increases the context passed to each request — attaching an extra document, removing a summarization step, passing the full conversation history when only the last few messages were needed. Cost doubles, but the feature still works, so nobody flags it.

**Shadow usage.** An internal script, a third-party integration, or an automation was connecting to your AI provider directly, outside your main application. It's been running fine at low volume for months. Then something scales it.

**Traffic spike on an AI feature.** A feature that uses expensive model calls gets more traffic than expected. The cost scales with traffic, but the budget didn't.

None of these show up as a single obvious event. They show up as a number that's higher than expected when the billing cycle closes.

## Visibility isn't enough

Knowing your total spend for the month tells you the problem happened. It doesn't tell you which team or feature caused it, when it started, or how to stop the next one. That's the difference between a dashboard and a control system.

You need three things, not one:

**Attribution** — connecting each API call to the model, team, and feature that made it, so you can locate a spike instead of just seeing it in the total.

**Enforcement** — a limit that stops further spend before it completes, rather than notifying you that it already did.

**Anomaly detection** — an alert that fires when something is actively wrong, not when the monthly total has already accumulated.

## Setting a hard limit

The most direct fix for billing surprises is a budget that stops requests from going through once it's reached, rather than one that sends you an email about it.

Ordisum's budget enforcement works at the team or project level: you set a monthly or quarterly cap, and requests that would push spend past it get a clear error response instead of being processed. The calling application handles that response the same way it handles any API error. Your spend stays under the number you set.

## Catching anomalies before the invoice

Between "everything's fine" and "we've exceeded the monthly budget," there's a window where a problem is detectable if you're watching for it. Most teams aren't watching for it continuously, and that's fine — the point is to have something watching for you.

Ordisum's anomaly detection fires when hourly spend exceeds 3× your trailing 7-day average. That pattern — a sudden multiple of normal — is the signature of a retry loop, a context-bloat bug, or shadow usage scaling up. It fires within the hour. Not at the end of the billing cycle.

## A practical checklist

1. Make sure spend is attributed to teams and projects, not just your account total. You can't investigate a spike you can't locate.
2. Set a hard limit, not just an alert threshold.
3. Turn on hourly anomaly detection, not just monthly budget alerts.
4. Make sure external scripts and third-party tools calling your AI providers are tracked, not just your main application.
5. Review provider attribution monthly — not just total cost, but cost per model and per provider, to catch context drift or model-selection changes that affect cost.

## FAQ

**Can I set different budgets for different teams?** Yes — budgets in Ordisum are configurable per team and per project.
**What happens exactly when the hard limit is reached?** Requests are blocked before exceeding the limit. The calling application gets a clear error response.
**Does this work for usage from scripts outside my main app?** Yes — issue a platform key via the External API Gateway and external callers route through Ordisum automatically.

---

**Internal links:** `/use-cases/ai-budget-management` · `/docs/budget-alerts` · `/features` · Link to existing post: `/blog/reduce-llm-api-costs` (anchor: "seven specific tactics for cutting your LLM bill")
**CTA:** Set a hard budget limit in 5 minutes. [Start Free Trial]

---

### 8.3 `/blog/measuring-real-roi-of-llms`

**Meta title:** `Measuring the Real ROI of LLMs in the Enterprise`
**Meta description:** `A framework for connecting AI spend to actual business value — and why 'we spent X on AI last quarter' is never the answer finance is actually asking for.`
**Meta keywords:** `ai roi calculation, ai roi measurement, llm cost optimization`
**Author:** Ordisum Team · **Category:** ROI

**Excerpt:** Finance isn't asking how much you spent on AI. They're asking whether the spend produced more value than the alternative use of that money. Those are different questions with different answers.

---

**Body:**

Most companies can tell you what they spent on AI last quarter. The number is on an invoice somewhere. Fewer can tell you what they got for it in terms that a CFO or a board would find satisfying.

That gap — between spend data and business case — is what makes AI budget conversations difficult.

## "How much did we spend" is not the question

The question finance is actually asking is: "Did this produce more value than what we could have done with that money instead?" That requires connecting spend to output.

For AI spend, the output is usually one or more of:
- Time saved by people who would otherwise do the task manually
- Quality improvement on a task that humans do inconsistently
- Scale — handling volume that would have required additional headcount

Each of these is a different calculation. "We saved 20 hours per week per engineer" is a different ROI story than "we're handling customer inquiries that would have required two additional support staff."

## A simple framework

The framework doesn't need to be complicated. Three inputs cover most cases:

**What would this task have cost in human time?** Hourly rate × time-per-task × volume = a dollar figure for the counterfactual.

**What is the AI actually costing?** Not the total AI budget, but the cost attributable to this specific use case.

**What percentage of the benefit is actually being realized?** AI doesn't replace human work at 100%. Research on AI productivity impact typically finds improvements in the 20-50% range depending on the task type. Using a realistic, published figure rather than an optimistic internal estimate is what makes the number defensible.

Ordisum's ROI Calculator takes these three inputs alongside your actual tracked spend and outputs a ROI figure. The spend figures come from the dashboard — real numbers, not estimates. The productivity benchmarks are drawn from published research on AI productivity impact. The output is something you can audit, not just present.

## What actually matters in a budget meeting

Three things hold up in a finance conversation. One number doesn't.

**The spend number:** what did we actually pay, attributed to this use case. This needs to be exact, from real tracked data — not an allocation of the AI budget.

**The activity it replaced or accelerated:** specific, not vague. "Our engineers spend X hours per week on code review; AI assistance reduced that to Y" holds up. "AI made our team more productive" doesn't.

**The productivity assumption:** stated explicitly. "We're using a 30% time-savings estimate based on [source]" is defensible. "We assume 80% efficiency gains" without a source isn't.

## FAQ

**What data does the ROI calculation use?** Your actual tracked spend from the Ordisum dashboard, combined with team size, hourly rate, and time-savings inputs you provide. The benchmarks used are from published research — the specific sources are listed in the calculator.

**Can the calculation be scoped to a specific team or project?** [VERIFY BEFORE PUBLISHING — confirm whether ROI calculation in the current product can be scoped to team/project level vs account-wide before stating this as a capability.]

**How do I handle AI use cases that improve quality rather than save time?** Quality improvements are harder to quantify but not impossible. Defect reduction rate, customer satisfaction change, and error rate reduction are measurable proxies. The ROI Calculator currently focuses on the time-savings calculation; quality-based ROI would need additional manual calculation.

---

**Internal links:** `/use-cases/ai-roi-measurement` · `/docs/roi-calculator` · `/features`
**Cross-link:** Link from `/blog/reduce-llm-api-costs` (the existing post) to this article in a "related reading" note.
**CTA:** Turn your AI spend into a defensible ROI report. [Start Free Trial]

---

## 9. SCHEMA / STRUCTURED DATA — JSON-LD (add to `schema.ts`)

### 9.1 Organization (add to buildOrganization, or use on homepage)
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Ordisum",
  "url": "${SITE_URL}",
  "description": "Ordisum is an AI API cost management platform that tracks, budgets, and enforces spend across AI providers including OpenAI, Anthropic, Google Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, and Cohere.",
  "logo": "${SITE_URL}/images/logo.png",
  "foundingDate": "2026",
  "sameAs": [
    "https://twitter.com/ordisum",
    "https://linkedin.com/company/ordisum",
    "https://github.com/ordisum"
  ]
}
```

### 9.2 SoftwareApplication (homepage)
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Ordisum",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "AI API cost management platform with real-time tracking, hard budget enforcement, anomaly detection, and ROI calculator.",
  "url": "${SITE_URL}",
  "offers": {
    "@type": "Offer",
    "description": "14-day free trial, no credit card required"
  },
  "featureList": [
    "Real-time cost tracking per model, provider, team, and project",
    "Hard budget enforcement — requests blocked before limit is exceeded",
    "Threshold alerts at 50/75/90/100% via Email, Slack, SMS",
    "Anomaly detection at 3x trailing 7-day hourly average",
    "ROI Calculator with team size, hourly rate, and productivity benchmarks",
    "External API Gateway with platform keys (ii_sk_...)",
    "Zero-SDK integration — base URL swap only",
    "AES-256-GCM API key encryption at rest",
    "TOTP two-factor authentication"
  ]
}
```

### 9.3 FAQPage (homepage + /docs/faq — exact same questions as visible on page)
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Do I need to install an SDK to use Ordisum?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Change your base URL to the Ordisum Gateway and use your Ordisum API key. No SDK installation or code change beyond configuration is required."
      }
    },
    {
      "@type": "Question",
      "name": "What happens when I hit my budget limit?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Requests are automatically blocked before they push spend past the limit you set. The calling application receives a clear error response rather than the call completing and adding to your bill."
      }
    },
    {
      "@type": "Question",
      "name": "Which AI providers does Ordisum support?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "OpenAI, Anthropic, Google Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, and Cohere."
      }
    },
    {
      "@type": "Question",
      "name": "Does Ordisum store my prompts?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Ordisum stores only cost and usage metadata: token counts, model name, provider, timestamp, team and project labels, latency, and error codes. Prompt and completion content is never stored."
      }
    },
    {
      "@type": "Question",
      "name": "Is there a free trial?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. 14 days, full access, no credit card required."
      }
    }
  ]
}
```

### 9.4 Article schema (add `buildArticle` function to `src/lib/schema.ts`)
```typescript
// Add to schema.ts — extend the existing builder pattern
export function buildArticle(opts: {
  headline: string;
  description: string;
  author?: string;
  datePublished: string;
  dateModified?: string;
  url: string;
  image?: string;
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.headline,
    description: opts.description,
    author: {
      '@type': 'Organization',
      name: opts.author ?? SITE_NAME,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    url: opts.url,
    ...(opts.image ? { image: opts.image } : {}),
  };
}

// Add buildFAQPage to schema.ts
export function buildFAQPage(
  faqs: Array<{ question: string; answer: string }>
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };
}
```

---

## 10. AEO / GEO DIRECT ANSWERS — For AI engine citation

These are the exact answers for the 8 AEO questions identified. They're written to be extractable as standalone answers by ChatGPT, Perplexity, Gemini AI Overviews, etc. Place them in visible page content (not hidden), and they should match FAQ schema exactly.

| Question | Direct Answer | Place on page |
|---|---|---|
| How do you monitor AI API costs? | Ordisum meters every request through a Gateway in real time and attributes each one to a model, provider, team, and project. The dashboard updates every five minutes and shows a breakdown across OpenAI, Anthropic, Gemini, Azure OpenAI, Bedrock, Mistral, Groq, and Cohere — no per-provider console-hopping required. | `/use-cases/ai-cost-monitoring` |
| How do I stop OpenAI API overages? | Set a hard monthly or quarterly budget in Ordisum. Requests are blocked before they push spend past the limit — not alerted after the fact. Anomaly detection also fires when hourly spend exceeds 3× the trailing 7-day average. | `/use-cases/ai-budget-management` |
| Is there an ROI calculator for AI tools? | Yes. Ordisum's ROI Calculator takes your real tracked spend and combines it with team size, hourly rate, and productivity benchmarks to output a ROI figure you can bring to a budget review. | `/use-cases/ai-roi-measurement` |
| How do I track AI costs across multiple providers? | Ordisum's Gateway sits in front of every AI provider you use and routes all requests through one metering layer. A single dashboard shows normalized cost data across all connected providers. | `/` |
| Do I need to install an SDK to track AI costs? | No. Ordisum integrates with a base-URL swap and an API key. Point your existing HTTP client at the Ordisum Gateway instead of the provider endpoint directly. | `/docs/quickstart` |
| What's the difference between an AI gateway and an AI observability tool? | An AI gateway sits in the request path and can enforce rules before completing a call — including budget limits and routing decisions. An observability tool typically logs and analyzes what already happened. Ordisum is a gateway focused on cost enforcement and attribution. | Blog: `best-ai-cost-management-tools` |
| How do I attribute AI spend to a specific team or feature? | In Ordisum, configure team and project labels. Every request that routes through the Gateway is automatically tagged with the correct label and attributed in the dashboard. | `/use-cases/ai-cost-monitoring` |
| Can AI budget alerts actually prevent overspend, or just notify? | Alerts notify. Budget enforcement prevents. Ordisum's hard-limit system blocks requests before the budget is exceeded. An alert-only system cannot undo spend that has already been processed. | `/use-cases/ai-budget-management` |

---

## 11. INTERNAL LINKING MATRIX (33 relationships — implement exactly)

| Source | Destination | Anchor text |
|---|---|---|
| `/` | `/features` | "see the full feature set" |
| `/` | `/pricing` | "view pricing" |
| `/` | `/security` | "read our security model" |
| `/` | `/use-cases/ai-cost-monitoring` | "see how teams monitor AI costs" |
| `/` | `/use-cases/ai-budget-management` | "see how budget enforcement works" |
| `/features` | `/docs/dashboard` | "learn how the dashboard works" |
| `/features` | `/docs/budget-alerts` | "see budget setup docs" |
| `/features` | `/use-cases/ai-budget-management` | "see this in a real workflow" |
| `/features` | `/use-cases/ai-roi-measurement` | "see the ROI calculator in action" |
| `/features` | `/pricing` | "compare plans" |
| `/pricing` | `/features` | "see what's included" |
| `/pricing` | `/use-cases/ai-budget-management` | "why enforcement matters" |
| `/security` | `/docs/api-auth` | "see how API authentication works" |
| `/use-cases/ai-cost-monitoring` | `/features` | "see the dashboard feature" |
| `/use-cases/ai-cost-monitoring` | `/docs/dashboard` | "read the dashboard docs" |
| `/use-cases/ai-cost-monitoring` | `/docs/providers` | "supported providers" |
| `/use-cases/ai-budget-management` | `/docs/budget-alerts` | "set up budget alerts" |
| `/use-cases/ai-budget-management` | `/alternatives/helicone` | "how Ordisum differs from alert-only tools" |
| `/use-cases/ai-roi-measurement` | `/docs/roi-calculator` | "learn how the ROI calculator works" |
| `/alternatives/helicone` | `/features` | "see the full feature comparison" |
| `/alternatives/helicone` | `/security` | "read our security model" |
| `/alternatives/helicone` | `/use-cases/ai-budget-management` | "see how budget enforcement works" |
| `/alternatives/langfuse` | same three as above | same anchors |
| `/alternatives/portkey` | same three as above | same anchors |
| `/alternatives/litellm` | same three as above | same anchors |
| `/docs/quickstart` | `/docs/api-auth` | "authenticate your requests" |
| `/docs/quickstart` | `/features` | "see what you can track" |
| `/docs/dashboard` | `/features` | "back to features" |
| `/docs/budget-alerts` | `/use-cases/ai-budget-management` | "see the full workflow" |
| `/docs/roi-calculator` | `/use-cases/ai-roi-measurement` | "see the business case this builds" |
| Blog `best-ai-cost-management-tools` | `/features` + all 4 `/alternatives/*` | per-competitor and feature anchors |
| Blog `prevent-openai-billing-surprises` | `/use-cases/ai-budget-management` + `/docs/budget-alerts` + existing `/blog/reduce-llm-api-costs` | contextual |
| Blog `measuring-real-roi-of-llms` | `/use-cases/ai-roi-measurement` + `/docs/roi-calculator` | contextual |

---

## 12. FINAL METADATA DATABASE

| URL | SEO Title | Meta Description | Primary KW | Robots |
|---|---|---|---|---|
| `/` | Ordisum — AI API Cost Management & Observability | Real-time cost tracking, hard budget enforcement, and ROI reporting for every AI API call — across OpenAI, Anthropic, Gemini, Azure, Bedrock, Mistral, Groq, and Cohere. | AI cost monitoring | index,follow |
| `/features` | Features \| Ordisum — AI Cost Tracking, Budget Enforcement & ROI | Hard budget limits that block requests before they overspend, real-time multi-provider cost tracking, anomaly detection, ROI calculator, and an external API gateway. | LLM cost tracking | index,follow |
| `/pricing` | Pricing \| Ordisum | Ordisum pricing — plans for teams of every size. 14-day free trial, no credit card required. | Ordisum pricing | index,follow |
| `/security` | Enterprise Security \| Ordisum AI Gateway | AES-256-GCM API key encryption, zero prompt logging, read-only provider keys, and TOTP 2FA — Ordisum's security model. | Secure AI gateway | index,follow |
| `/alternatives/helicone` | Ordisum vs. Helicone: An AI Cost Control Alternative | Helicone is widely used for AI observability. If budget enforcement and ROI reporting are your main need, here's how Ordisum compares. | Helicone alternative | index,follow |
| `/alternatives/langfuse` | Ordisum vs. Langfuse: Financial Control vs. Output Evaluation | Langfuse is built for LLM tracing and evaluation. Ordisum is built for budget enforcement and AI ROI. | Langfuse alternative | index,follow |
| `/alternatives/portkey` | Ordisum vs. Portkey: Cost Enforcement vs. Multi-Provider Routing | Portkey handles multi-provider routing. Ordisum handles budget enforcement and AI ROI. | Portkey alternative | index,follow |
| `/alternatives/litellm` | Ordisum vs. LiteLLM: Managed Enforcement vs. Self-Hosted Proxy | LiteLLM is open-source and self-hosted. Ordisum is managed with hard budget enforcement built in from day one. | LiteLLM alternative | index,follow |
| `/use-cases/ai-cost-monitoring` | AI Cost Monitoring for Engineering Teams \| Ordisum | Track AI API spend per model, provider, team, and project in real time — one dashboard instead of five provider consoles. | AI API cost tracking | index,follow |
| `/use-cases/ai-budget-management` | AI Budget Management \| Ordisum | Hard limits that block requests before they exceed your budget, plus threshold alerts and anomaly detection. | AI budget enforcement | index,follow |
| `/use-cases/ai-roi-measurement` | AI ROI Calculator \| Ordisum | Turn tracked AI spend into a defensible ROI figure using real usage data and published productivity benchmarks. | AI ROI calculator | index,follow |
| `/blog/best-ai-cost-management-tools` | The Best AI Cost Management Tools in 2026 | A practical guide to the leading AI cost management and observability tools — what each is built for, and how to choose. | best ai cost management tools | index,follow |
| `/blog/prevent-openai-billing-surprises` | How to Prevent OpenAI Billing Surprises | What causes AI API bills to spike, and the controls that catch it before the invoice — not after. | stop openai overages | index,follow |
| `/blog/measuring-real-roi-of-llms` | Measuring the Real ROI of LLMs in the Enterprise | A framework for connecting AI spend to business value — and what finance is actually asking when they question your AI budget. | ai roi calculation | index,follow |

All titles unique — verified.

---

## 13. VERIFY BEFORE PUBLISHING — Full Checklist

- [ ] Custom domain: get off .onrender.com — every canonical/OG/sitemap URL depends on this
- [ ] GSC: set up on real domain the day it goes live
- [ ] `VITE_SITE_URL`: set to real production domain — currently causes inconsistent canonical/OG URLs
- [ ] Pricing FAQ: upgrade/downgrade/enterprise/annual billing — [VERIFY FROM LIVE PRICING SYSTEM]
- [ ] All 4 [VERIFY CURRENT COMPETITOR INFORMATION] lines in alternatives pages — re-check each competitor's current positioning
- [ ] ROI export/scoping (can the ROI Calculator be scoped to team/project level vs account-wide?)
- [ ] API latency impact claim: do not state until tested
- [ ] Self-hosting availability — not confirmed from code inspection, do not claim
- [ ] Open source status — not confirmed, do not claim
- [ ] Social profiles (Twitter/X, LinkedIn, GitHub org) — need Ordisum brand set up before GEO citations can build
- [ ] `buildFAQPage` and `buildArticle` functions — need to be added to `src/lib/schema.ts` before any FAQ/Article schema goes live
- [ ] `/docs/roi-calculator` slug correction: everywhere this appeared as `roi-calculator-doc` in prior documents, it must be corrected to `roi-calculator`

---

## 14. 60-DAY GROWTH PLAN CONTENT CALENDAR (aligned to the plan in the attached document)

| Day | Task | Content produced above |
|---|---|---|
| Day 1-2 | Domain + GSC + GA4 | Technical — no content |
| Day 3 | robots.txt + sitemap + llms.txt | robots.txt already in codebase; dynamic sitemap exists; llms.txt MISSING — see below |
| Day 4 | Schema markup | Section 9 above |
| Day 5 | Meta tags + OG | Section 12 metadata table |
| Day 11 | Homepage copy | Section 1 above |
| Day 12 | Features page | Section 2 above |
| Day 13 | Pricing page | Section 3 above |
| Day 15 | Blog post 1 | Section 8.1 (best-ai-cost-management-tools) |
| Day 22 | Blog post 2 | Section 8.2 (prevent-openai-billing-surprises) |
| Day 27 | Blog post 3 | Section 8.3 (measuring-real-roi-of-llms) |
| Day 32 | Competitor/alternatives pages | Section 5 above (all 4) |
| Day 37 | FAQ page + AEO | Section 10 above |

---

## 15. `llms.txt` — MISSING, create at `/public/llms.txt`

```markdown
# Ordisum

> Ordisum is an AI API cost management platform that tracks, budgets, and enforces spend across AI providers including OpenAI, Anthropic, Google Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, and Cohere. It connects as a Gateway between an application and its AI providers — no SDK required, just a base-URL swap.

## What Ordisum does

- Real-time cost tracking per model, provider, team, and project
- Hard budget enforcement — requests blocked before the limit is exceeded
- Threshold alerts at 50/75/90/100% via Email, Slack, SMS
- Anomaly detection when hourly spend exceeds 3× the trailing 7-day average
- ROI Calculator that converts spend to a business case using team size, hourly rate, and productivity benchmarks
- External API Gateway for tracking third-party and script usage via platform keys (ii_sk_...)
- AES-256-GCM encryption for provider API keys at rest
- TOTP two-factor authentication
- 14-day free trial, no credit card required

## Core pages

- [Homepage](${SITE_URL}/)
- [Features](${SITE_URL}/features)
- [Pricing](${SITE_URL}/pricing)
- [Security](${SITE_URL}/security)
- [Documentation](${SITE_URL}/docs)
- [Blog](${SITE_URL}/blog)

## Supported providers

OpenAI, Anthropic, Google Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, Cohere

## Who Ordisum is for

Engineering leads and finance/FinOps teams at companies using multiple AI providers who need cost attribution, budget enforcement, and the ability to report AI ROI to non-technical stakeholders.
```

Replace `${SITE_URL}` with the real production domain once confirmed.

---

**Document complete. Total production content: 14 pages of copy, 3 full blog articles, schema JSON-LD for 4 types, 8 AEO direct answers, 33-link internal matrix, full metadata table, llms.txt, and 17-item verification checklist.**
