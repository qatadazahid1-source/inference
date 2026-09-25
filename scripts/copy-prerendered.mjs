import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');

// Legal routes that are strictly required and validated
const mandatoryLegalRoutes = [
  { route: 'terms', expectedTitle: 'Terms of Service', expectedH1: 'Terms of Service' },
  { route: 'privacy-policy', expectedTitle: 'Privacy Policy', expectedH1: 'Privacy Policy' },
  { route: 'refund-policy', expectedTitle: 'Refund Policy', expectedH1: 'Refund Policy' }
];

// Additional public marketing routes to copy
const otherPublicRoutes = [
  'features',
  'pricing',
  'security',
  'contact-sales',
  'blog',
  'docs'
];

const allRoutes = [...mandatoryLegalRoutes.map(r => r.route), ...otherPublicRoutes];

console.log('[postbuild] Creating flat .html and flat extensionless pre-rendered files for native Render static matching...');

let buildErrors = [];

for (const route of allRoutes) {
  const dirPath = path.join(distDir, route);
  const indexPath = path.join(dirPath, 'index.html');
  const htmlPath = path.join(distDir, `${route}.html`);
  const flatFilePath = path.join(distDir, route);

  if (fs.existsSync(indexPath)) {
    const htmlContent = fs.readFileSync(indexPath, 'utf8');

    // 1. Create flat .html file (e.g. dist/terms.html)
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');

    // 2. Remove directory (e.g. dist/terms/) so we can place a flat extensionless file in its place
    fs.rmSync(dirPath, { recursive: true, force: true });

    // 3. Create flat extensionless file (e.g. dist/terms)
    fs.writeFileSync(flatFilePath, htmlContent, 'utf8');

    console.log(`  ✓ Created flat static files 'dist/${route}' and 'dist/${route}.html'`);
  } else {
    console.warn(`  ⚠️ Warning: Pre-rendered file ${indexPath} not found`);
  }
}

console.log('\n[postbuild] Validating mandatory legal route HTML files...');

// Validation step for mandatory legal routes
for (const { route, expectedTitle, expectedH1 } of mandatoryLegalRoutes) {
  const htmlPath = path.join(distDir, `${route}.html`);
  const flatFilePath = path.join(distDir, route);

  if (!fs.existsSync(htmlPath)) {
    buildErrors.push(`[VALIDATION ERROR] Required file missing: dist/${route}.html`);
    continue;
  }

  if (!fs.existsSync(flatFilePath)) {
    buildErrors.push(`[VALIDATION ERROR] Required file missing: dist/${route}`);
    continue;
  }

  const content = fs.readFileSync(htmlPath, 'utf8');

  // Check 1: Does it contain expected title/heading?
  if (!content.toLowerCase().includes(expectedTitle.toLowerCase()) && !content.toLowerCase().includes(expectedH1.toLowerCase())) {
    buildErrors.push(`[VALIDATION ERROR] dist/${route}.html does not contain expected title/heading "${expectedTitle}"`);
  }

  // Check 2: Does it contain homepage main hero title instead of legal content?
  if (content.includes('<h1>AI API Cost') && !content.includes(expectedH1)) {
    buildErrors.push(`[VALIDATION ERROR] dist/${route}.html accidentally contains the homepage hero instead of ${expectedTitle}`);
  }
}

if (buildErrors.length > 0) {
  console.error('\n❌ BUILD FAILED - Legal Page Pre-rendering Validation Errors:');
  for (const err of buildErrors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
} else {
  console.log('  ✓ All mandatory legal page HTML files verified successfully (terms, terms.html, privacy-policy, privacy-policy.html, refund-policy, refund-policy.html).\n');
}
