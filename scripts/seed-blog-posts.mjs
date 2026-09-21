import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use service role key if available, otherwise anon key (RLS might block anon key)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const posts = [
  {
    slug: 'best-ai-cost-management-tools',
    title: 'The Best AI Cost Management Tools in 2026',
    excerpt: 'The category has fragmented. Some tools focus on tracing agent behavior. Others focus on routing requests across providers. A few focus specifically on preventing overspend. Knowing which job you\'re hiring for makes the choice obvious.',
    body: `The AI observability market has a naming problem. Tools with very different jobs all call themselves "AI cost management" or "LLM observability." A team trying to debug why an agent produced the wrong answer needs different tooling than a team trying to stop their monthly AI bill from exceeding $10,000.

Before comparing tools, it's worth being clear about which problem you're solving.

## What "AI cost management" actually covers

The category splits into a few distinct jobs:

**Visibility** — seeing what you spent, broken down by model, provider, team, and feature. This is the baseline. Every serious tool in this category offers some version of it.

**Enforcement** — actually stopping spend before it crosses a line, rather than reporting that it already did. This is where tools differ most significantly.

**Evaluation and tracing** — understanding what the model did on a given request: the prompt, the response, the reasoning chain. This is a different job from cost control, though some tools bundle it in.

**Routing** — sending requests across multiple providers or models based on cost, latency, or availability. Useful for reliability engineering; not the same as cost enforcement.

Most tools are strong at one or two of these. The mistake is assuming that because they overlap in naming, they overlap in function.

## Tool-by-tool

**Helicone** is a proxy-based gateway with a long track record in the observability space. Strong for request logging, caching to reduce repeat costs, and latency tracking. 

**Langfuse** is open-source and self-hostable, built around span-level LLM tracing and evaluation. The right tool if your main need is understanding agent behavior at a granular level — particularly multi-step workflows where debugging requires seeing what happened at each step. 

**Portkey** positions itself as a control plane for production AI: multi-provider routing, fallback chains, and guardrails, with cost visibility as one component of a broader gateway. The right tool if sophisticated request routing is your primary requirement. 

**LiteLLM** is an open-source proxy for teams with DevOps capacity who want zero platform fees and full control over their gateway infrastructure. It can do budget tracking and routing, but requires building and maintaining those layers yourself. 

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

**Is self-hosting worth the effort for LLM cost management?** Depends on your team's DevOps capacity and sensitivity to platform cost. Self-hosting eliminates the platform fee but adds infrastructure overhead. Most early-stage teams aren't self-hosting; larger teams with dedicated platform engineers sometimes are.`,
    author: 'Ordisum Team',
    category: 'Comparisons',
    tags: ['ai cost management tools', 'ai cost monitoring', 'llm cost tracking'],
    meta_title: 'The Best AI Cost Management Tools in 2026',
    meta_description: 'A practical guide to the leading AI cost management and observability tools in 2026 — what each is built for, and how to choose.',
    meta_keywords: 'ai cost management tools, ai cost monitoring, llm cost tracking',
    robots: 'index,follow',
    status: 'published',
    published_at: new Date().toISOString()
  },
  {
    slug: 'prevent-openai-billing-surprises',
    title: 'How to Prevent OpenAI Billing Surprises',
    excerpt: 'Most unexpected AI bills come from something small that ran for a long time before anyone noticed. The fix isn\'t faster alerts — it\'s enforcement before the spend completes.',
    body: `An unexpectedly large OpenAI bill almost never comes from one big, obvious decision. It usually comes from something small that ran for longer than it should have, in a part of the system nobody was watching closely.

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
**Does this work for usage from scripts outside my main app?** Yes — issue a platform key via the External API Gateway and external callers route through Ordisum automatically.`,
    author: 'Ordisum Team',
    category: 'Cost Optimization',
    tags: ['openai api costs', 'stop openai overages', 'ai budget alerts'],
    meta_title: 'How to Prevent OpenAI Billing Surprises',
    meta_description: 'What actually causes AI API bills to spike, and the specific controls that catch it before the invoice — not after.',
    meta_keywords: 'openai api costs, stop openai overages, ai budget alerts',
    robots: 'index,follow',
    status: 'published',
    published_at: new Date().toISOString()
  },
  {
    slug: 'measuring-real-roi-of-llms',
    title: 'Measuring the Real ROI of LLMs in the Enterprise',
    excerpt: 'Finance isn\'t asking how much you spent on AI. They\'re asking whether the spend produced more value than the alternative use of that money. Those are different questions with different answers.',
    body: `Finance isn't asking how much you spent on AI. They're asking whether the spend produced more value than the alternative use of that money. Those are different questions with different answers.

When engineering leads are asked to justify their AI API budget, the instinct is often to point to usage: "Look how many tokens we processed," or "Look how many users interacted with the feature."

But volume is a cost metric, not a value metric. To measure real ROI, you have to connect the cost of the tokens to a business outcome that finance recognizes.

## The baseline problem

The core difficulty in measuring AI ROI is that the costs are highly visible and centralized (a single monthly API bill), while the benefits are distributed and hard to measure (small time savings spread across hundreds of employees).

If a new AI code-completion tool costs $20 per developer per month, the cost is exact. If it saves each developer 30 minutes a week, the value is an estimate.

## Moving from "spend" to "return"

To build a defensible ROI calculation, you need three pieces of data:

1. **Exact cost attribution:** You cannot calculate ROI on a lump-sum bill. You need to know exactly how much spend was driven by the specific team or feature you are evaluating.
2. **The alternative cost:** What would it cost to achieve the same result without the AI feature?
3. **Productivity benchmarks:** If the feature saves time, whose time is it saving, and what is that time worth?

## A framework for the ROI conversation

When you sit down with finance, frame the conversation around one of three outcomes:

**1. Direct cost displacement**
The AI feature replaced an existing cost. For example, using an LLM to categorize support tickets replaced a third-party vendor tool that cost $X per month, or reduced the need to hire $Y additional support staff. This is the easiest ROI to prove.

**2. Increased capacity without increased headcount**
The AI feature allowed the team to handle more volume (more support tickets, more code shipped, more content created) without hiring more people. The ROI is the avoided cost of the headcount that would have been required to achieve that volume.

**3. Measurable time savings**
The AI feature saves specific roles a specific amount of time per week. 

This is the most common use case, but also the hardest to defend. You need published benchmarks or internal studies to back up the time-savings estimate, and you need to multiply it by the fully loaded hourly rate of the employees saving that time.

## Using the Ordisum ROI Calculator

This is why we built the ROI Calculator into Ordisum. We saw teams struggling to turn their usage dashboards into business cases.

The ROI Calculator takes your exact, attributed API spend for a specific team or feature, and lets you input:
- The size of the team using the feature
- Their average hourly rate
- An estimate of time saved (backed by published benchmarks on AI productivity)

It outputs a hard ROI figure that compares the cost of the tokens against the value of the time saved. It's a calculation, not a claim — you can show finance exactly how you arrived at the number.

## The goal is a defensible number

You will never get a perfect, down-to-the-penny calculation of AI value. The goal is a defensible, logically sound estimate that connects the cost of the API calls to a business outcome.

Start by attributing your costs cleanly. You can't measure the return if you don't know the investment.`,
    author: 'Ordisum Team',
    category: 'ROI',
    tags: ['ai roi calculation', 'ai roi measurement', 'llm cost optimization'],
    meta_title: 'Measuring the Real ROI of LLMs in the Enterprise',
    meta_description: 'A framework for connecting AI spend to actual business value — and why \'we spent X on AI last quarter\' is never the answer finance is actually asking for.',
    meta_keywords: 'ai roi calculation, ai roi measurement, llm cost optimization',
    robots: 'index,follow',
    status: 'published',
    published_at: new Date().toISOString()
  }
];

async function seed() {
  for (const post of posts) {
    // using upsert with onConflict: 'slug' to avoid duplicates
    const { data, error } = await supabase
      .from('blog_posts')
      .upsert(post, { onConflict: 'slug' });
      
    if (error) {
      console.error(`Error inserting ${post.slug}:`, error);
    } else {
      console.log(`Successfully seeded ${post.slug}`);
    }
  }
}

seed().catch(console.error);
