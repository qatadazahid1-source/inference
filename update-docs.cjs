const fs = require('fs');
const path = require('path');

const docsDir = path.join(__dirname, 'src', 'docs', 'content');

const updates = {
  'overview.ts': {
    seoTitle: 'Overview | Ordisum Docs',
    description: "What Ordisum is, how the Gateway works, and what you'll see in the dashboard.",
    h1: 'Ordisum Overview',
    intro: "Ordisum is an AI API cost management Gateway. This page covers the core concepts before you start."
  },
  'quickstart.ts': {
    seoTitle: 'Quickstart | Ordisum Docs',
    description: "Get Ordisum tracking your AI spend in minutes — two configuration changes, no SDK.",
    h1: 'Get Started with Ordisum',
    intro: "Integration is two things: a base-URL swap and an API key. This guide gets you tracking spend in under 5 minutes."
  },
  'providers.ts': {
    seoTitle: 'Supported AI Providers | Ordisum Docs',
    description: "Every provider Ordisum tracks cost for — OpenAI, Anthropic, Gemini, Azure OpenAI, Bedrock, Mistral, Groq, Cohere — and how to connect each.",
    h1: 'Supported AI Providers',
    intro: "Ordisum supports eight providers. Each section below covers what gets tracked and any provider-specific setup notes."
  },
  'dashboard.ts': {
    seoTitle: 'Dashboard | Ordisum Docs',
    description: "How to read and use the Ordisum cost dashboard — per-model, per-provider breakdowns updated every 5 minutes.",
    h1: 'Using the Cost Dashboard',
    intro: "The dashboard updates every five minutes and breaks cost down by model, provider, team, and project."
  },
  'budget-alerts.ts': {
    seoTitle: 'Budget Alerts | Ordisum Docs',
    description: "Set up hard budget limits, threshold alerts, and anomaly detection — step by step.",
    h1: 'Setting Up Budget Alerts',
    intro: "This page covers hard limits, threshold alerts (50%/75%/90%/100%), and anomaly detection configuration."
  },
  'roi-calculator-doc.ts': { // This will also be renamed!
    seoTitle: 'ROI Calculator | Ordisum Docs',
    description: "How the ROI Calculator converts your tracked AI spend into a business-case ROI figure.",
    h1: 'Using the ROI Calculator',
    intro: "The ROI Calculator takes your tracked spend plus team size, hourly rate, and time-savings estimates, and outputs a ROI figure."
  },
  'teams.ts': {
    seoTitle: 'Teams | Ordisum Docs',
    description: "Manage teams and projects for per-team cost attribution in Ordisum.",
    h1: 'Managing Teams',
    intro: "Set up teams and projects before connecting your application to get clean cost attribution from day one."
  },
  'api-auth.ts': {
    seoTitle: 'API Authentication | Ordisum Docs',
    description: "How to authenticate requests to the Ordisum Gateway — Ordisum API keys and platform keys explained.",
    h1: 'Authenticating with the API',
    intro: "Covers Ordisum API keys for Gateway authentication and platform keys (`ii_sk_...`) for the External API Gateway."
  },
  'api-endpoints.ts': {
    seoTitle: 'API Endpoints | Ordisum Docs',
    description: "Full reference for the Ordisum API.",
    h1: 'API Reference',
    intro: "Endpoint reference for direct API integration."
  },
  'faq.ts': {
    seoTitle: 'FAQ | Ordisum Docs',
    description: "Answers to common Ordisum questions — integration, providers, budget limits, security.",
    h1: 'Frequently Asked Questions',
    intro: "Common questions organized by topic."
  },
  'troubleshooting.ts': {
    seoTitle: 'Troubleshooting | Ordisum Docs',
    description: "Fix common Ordisum integration issues.",
    h1: 'Troubleshooting'
  },
  'changelog.ts': {
    seoTitle: 'Changelog | Ordisum Docs',
    description: "What's new in Ordisum — shipped features and fixes.",
    h1: 'Changelog'
  }
};

for (const [filename, data] of Object.entries(updates)) {
  const filePath = path.join(docsDir, filename);
  if (!fs.existsSync(filePath)) {
    console.error(`Missing file: ${filePath}`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace title (H1) and description
  content = content.replace(/title:\s*'.*?',/, `seoTitle: '${data.seoTitle}',\n  title: '${data.h1}',`);
  
  // Try with double quotes if single quotes failed
  if (!content.includes('seoTitle:')) {
    content = content.replace(/title:\s*".*?",/, `seoTitle: "${data.seoTitle}",\n  title: "${data.h1}",`);
  }
  
  content = content.replace(/description:\s*('.*?'|".*?"),/s, `description: '${data.description.replace(/'/g, "\\'")}',`);
  
  // Insert intro line if specified
  if (data.intro) {
    // We add the intro to the body of the very first section in the array
    content = content.replace(
      /(sections:\s*\[\s*{\s*id:\s*['"][^'"]+['"]\s*,\s*heading:\s*['"][^'"]+['"]\s*,\s*body:\s*)(['"])/,
      `$1$2${data.intro.replace(/'/g, "\\'")} \\n\\n `
    );
    // Note: If the first section body starts with a backtick, or is missing a body, we might need a fallback.
    // So let's try a generic approach if body doesn't exist.
    if (!content.includes(data.intro.replace(/'/g, "\\'"))) {
       // if body doesn't exist, we inject it right after heading
       content = content.replace(
         /(sections:\s*\[\s*{\s*id:\s*['"][^'"]+['"]\s*,\s*heading:\s*['"][^'"]+['"]\s*,)/,
         `$1\n      body: '${data.intro.replace(/'/g, "\\'")}',`
       );
    }
  }

  // Rename roi-calculator-doc.ts to roi-calculator.ts and update its slug
  if (filename === 'roi-calculator-doc.ts') {
    content = content.replace(/slug:\s*'roi-calculator-doc'/, `slug: 'roi-calculator'`);
    const newFilePath = path.join(docsDir, 'roi-calculator.ts');
    fs.writeFileSync(newFilePath, content);
    fs.unlinkSync(filePath);
    
    // Also update index.ts to export the correct module
    const indexPath = path.join(docsDir, 'index.ts');
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    indexContent = indexContent.replace(/import\s+{\s*roiCalculatorPage\s*}\s+from\s+'\.\/roi-calculator-doc'/g, `import { roiCalculatorPage } from './roi-calculator'`);
    fs.writeFileSync(indexPath, indexContent);
    
  } else {
    fs.writeFileSync(filePath, content);
  }
}
console.log('Update complete');
