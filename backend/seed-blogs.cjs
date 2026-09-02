const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const newBlogPosts = [
  {
    slug: 'prevent-openai-billing-surprises',
    title: 'How to Prevent OpenAI Billing Surprises',
    excerpt: 'A practical breakdown of what causes AI API bills to spike, and how to catch it before the invoice.',
    body: `# How to Prevent OpenAI Billing Surprises

An unexpectedly large OpenAI bill almost never comes from one big, obvious mistake. It usually comes from something small compounding for hours before anyone notices.

## Why bills actually spike
A few patterns show up repeatedly in teams running AI features in production:
- A retry loop or agent that keeps calling the model on failure, multiplying token usage silently.
- A bad deploy that removes a caching layer or increases context length by accident.
- "Shadow" usage — an internal script or a third-party integration calling the API directly, outside whatever tracking the main app has.
- A traffic spike hitting a feature that wasn't sized for it.

None of these show up in a monthly billing summary until it's too late to act on them.

## Visibility isn't enough
Knowing your total spend for the month tells you the problem happened. It doesn't tell you *when* it started, *which* team or feature caused it, or *stop* it from continuing. That's the gap between a dashboard and a control system.

## Setting a hard limit
The most direct fix is a hard budget: a monthly or quarterly limit that, once reached, stops further requests rather than just sending an alert. Ordisum's budget enforcement works this way — you set the limit, and requests are auto-throttled before they push spend past it, at the team or project level.

## Catching anomalies before the invoice
Between "everything's fine" and "we blew the monthly budget," there's a window where a spike is visible if you're watching for it. Ordisum's anomaly detection flags any hour where spend exceeds 3× the trailing 7-day average, and threshold alerts fire at 50/75/90/100% of budget via Email, Slack, or SMS — so the first person to notice isn't whoever opens the invoice.

## A simple checklist
1. Attribute spend to team/project, not just total — you can't fix what you can't locate.
2. Set a hard limit, not just an alert threshold.
3. Turn on anomaly detection for hour-level spikes, not just monthly totals.
4. Make sure external scripts/third-party tools calling the API are tracked too, not just your main app.

## FAQ
**Can I set different budgets for different teams?**
Yes — budgets and alerts can be set per team/project.

**What happens exactly when the hard limit is reached?**
Requests are blocked/throttled before exceeding the limit, rather than allowed through with a retroactive alert.

**Does this cover usage from scripts outside my main app?**
Yes, via the External API Gateway's read-only platform keys.

[See the full budget enforcement workflow →](/use-cases/ai-budget-management)`,
    meta_title: 'How to Prevent OpenAI Billing Surprises',
    meta_description: 'A practical breakdown of what causes AI API bills to spike, and how to catch it before the invoice.',
    meta_keywords: 'openai api costs, stop openai overages, ai budget alerts',
    status: 'published',
    published_at: new Date().toISOString(),
    tags: ['AI Budget Management', 'OpenAI', 'Cost Control'],
  },
  {
    slug: 'measuring-real-roi-of-llms',
    title: 'Measuring the Real ROI of LLMs in the Enterprise',
    excerpt: 'A framework for connecting AI spend to actual business value, beyond just tracking token cost.',
    body: `# Measuring the Real ROI of LLMs in the Enterprise

Most companies can tell you how much they spent on AI last quarter. Far fewer can tell you what they got for it.

## "How much did we spend" is the wrong first question
Spend is easy to track — it's a number on an invoice. Value is harder, because it's distributed across time saved, tasks automated, and decisions made faster, none of which show up on a billing page. Without a framework connecting the two, an AI budget review turns into a guess dressed up as a decision.

## A simple framework for AI ROI
The core idea is straightforward: what would the work AI is now doing have cost in human time, and how does that compare to what you're actually spending on the AI itself? That requires three inputs:
1. **Actual AI spend** — the real, tracked cost, not an estimate.
2. **Team size and hourly rate** — a proxy for what the equivalent human effort would have cost.
3. **A productivity benchmark** — a defensible estimate of how much time AI is actually saving on the relevant task, rather than an assumed 100%.

## How Ordisum's ROI Calculator does this
Ordisum already tracks your real spend data — the ROI Calculator uses that tracked spend and combines it with your team size, hourly rate, and productivity benchmarks (drawn from published research on AI productivity impact) to produce a business-case-ready ROI figure, rather than a back-of-envelope estimate built in a spreadsheet.

## What to bring to the budget review
A credible AI ROI case usually needs three things: the real spend number (not an estimate), a clear statement of what task the spend is replacing or accelerating, and a productivity assumption that's stated explicitly rather than implied. If any of the three is missing, the number won't survive scrutiny in a budget conversation.

## FAQ
**What data feeds the ROI calculation?**
Your actual tracked AI spend, combined with team size, hourly rate, and productivity benchmarks.

**Can this work for a single feature, not the whole company?**
[VERIFY BEFORE PUBLISHING — confirm whether ROI calculation can be scoped to a team/project vs. account-wide before stating this as a feature.]

[See how the ROI calculator works →](/use-cases/ai-roi-measurement)`,
    meta_title: 'Measuring the Real ROI of LLMs in the Enterprise',
    meta_description: 'A framework for connecting AI spend to actual business value, beyond just tracking token cost.',
    meta_keywords: 'ai roi calculation, ai roi measurement, llm cost optimization',
    status: 'published',
    published_at: new Date().toISOString(),
    tags: ['AI ROI', 'Enterprise', 'LLMs'],
  }
];

async function run() {
  let errors = 0;
  for (const post of newBlogPosts) {
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('slug')
      .eq('slug', post.slug)
      .maybeSingle();

    if (existing) {
      console.log(`  ⏭  ${post.slug} (already exists)`);
      continue;
    }

    const { error } = await supabase.from('blog_posts').insert(post);
    if (error) {
      console.error(`  ❌  ${post.slug}:`, error.message);
      errors++;
    } else {
      console.log(`  ✓  ${post.slug}`);
    }
  }
  process.exit(errors > 0 ? 1 : 0);
}

run();
