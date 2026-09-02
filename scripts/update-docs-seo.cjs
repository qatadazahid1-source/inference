const fs = require('fs');
const path = require('path');

const updates = {
  'overview': { title: 'Overview', description: 'What Ordisum is and how the Gateway fits into your stack.' },
  'quickstart': { title: 'Quickstart', description: 'Get Ordisum tracking your AI spend in minutes — no SDK required.' },
  'providers': { title: 'Supported Providers', description: 'See every AI provider Ordisum tracks cost for, and how to connect each.' },
  'dashboard': { title: 'Dashboard', description: 'How to read and use the Ordisum cost dashboard.' },
  'budget-alerts': { title: 'Budget Alerts', description: 'Set up hard budget limits and threshold/anomaly alerts.' },
  'roi-calculator-doc': { title: 'ROI Calculator', description: 'How the ROI Calculator turns spend into a business case.' },
  'teams': { title: 'Teams', description: 'Manage teams and projects for cost attribution.' },
  'api-auth': { title: 'API Authentication', description: 'Authenticate requests to the Ordisum API and Gateway.' },
  'api-endpoints': { title: 'API Endpoints', description: 'Full reference for the Ordisum API.' },
  'faq': { title: 'FAQ', description: 'Answers to common Ordisum questions.' },
  'troubleshooting': { title: 'Troubleshooting', description: 'Fix common integration issues.' },
  'changelog': { title: 'Changelog', description: 'What\'s new in Ordisum.' }
};

const docsDir = path.join(__dirname, '../src/docs/content');

for (const [slug, data] of Object.entries(updates)) {
  const filePath = path.join(docsDir, `${slug}.ts`);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    continue;
  }
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Replace title
  content = content.replace(/title:\s*['"].*?['"],/, `title: '${data.title}',`);
  
  // Replace description (multiline support if needed, but it's usually single line)
  // Let's use a regex that matches `description: '...'` or `description: "..."`
  content = content.replace(/description:\s*['"](.*?)['"],/s, `description: '${data.description}',`);
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Updated ${slug}.ts`);
}
