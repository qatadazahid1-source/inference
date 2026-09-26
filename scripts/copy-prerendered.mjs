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

console.log('[postbuild] Copying pre-rendered HTML into dist/<route>.html files...');
console.log('[postbuild] NOTE: Flat extensionless files are NOT created to avoid Render octet-stream bug.');

let buildErrors = [];

for (const route of allRoutes) {
  const dirPath = path.join(distDir, route);
  const indexPath = path.join(dirPath, 'index.html');
  const htmlPath = path.join(distDir, `${route}.html`);
  const flatFilePath = path.join(distDir, route);

  // CRITICAL: Remove flat extensionless file if it exists
  if (fs.existsSync(flatFilePath) && !fs.statSync(flatFilePath).isDirectory()) {
    fs.unlinkSync(flatFilePath);
  }

  if (fs.existsSync(indexPath)) {
    const htmlContent = fs.readFileSync(indexPath, 'utf8');

    // Create flat .html file (e.g. dist/terms.html)
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');

    // Remove the directory to force Render to rely on _redirects -> terms.html
    // This prevents any weird SPA shell index.html loops from directories
    fs.rmSync(dirPath, { recursive: true, force: true });

    console.log(`  ✓ Created 'dist/${route}.html' and cleaned up directory`);
  } else {
    console.warn(`  ⚠️  Warning: Pre-rendered file ${indexPath} not found`);
  }
}

console.log('\n[postbuild] Validating mandatory legal route HTML files...');

// Validation step for mandatory legal routes
for (const { route, expectedTitle, expectedH1 } of mandatoryLegalRoutes) {
  const htmlPath = path.join(distDir, `${route}.html`);
  const flatFilePath = path.join(distDir, route);

  // Flat extensionless file must NOT exist
  if (fs.existsSync(flatFilePath) && !fs.statSync(flatFilePath).isDirectory()) {
    buildErrors.push(`[VALIDATION ERROR] Flat extensionless file 'dist/${route}' exists!`);
  }

  // dist/<route>.html must exist
  if (!fs.existsSync(htmlPath)) {
    buildErrors.push(`[VALIDATION ERROR] Required file missing: dist/${route}.html`);
    continue;
  }

  const content = fs.readFileSync(htmlPath, 'utf8');

  // Check 1: Must contain the expected legal page heading
  if (!content.toLowerCase().includes(expectedTitle.toLowerCase()) && !content.toLowerCase().includes(expectedH1.toLowerCase())) {
    buildErrors.push(`[VALIDATION ERROR] dist/${route}.html does not contain expected heading "${expectedTitle}"`);
  }

  // Check 2: Must NOT contain homepage hero text
  if (content.includes('AI API Cost Observability') && !content.includes(expectedH1)) {
    buildErrors.push(`[VALIDATION ERROR] dist/${route}.html accidentally contains homepage hero instead of ${expectedTitle}`);
  }
}

if (buildErrors.length > 0) {
  console.error('\n❌ BUILD FAILED - Legal Page Pre-rendering Validation Errors:');
  for (const err of buildErrors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
} else {
  console.log('  ✓ All mandatory legal page HTML files verified successfully.');
  console.log('  ✓ No flat extensionless files exist (binary Content-Type bug prevented).\n');
}
