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
console.log('[postbuild] NOTE: dist/<route>/index.html directories are PRESERVED for correct Render Content-Type serving.');
console.log('[postbuild] NOTE: Flat extensionless files are NOT created (they cause binary/octet-stream Content-Type on Render).\n');

let buildErrors = [];

for (const route of allRoutes) {
  const dirPath = path.join(distDir, route);
  const indexPath = path.join(dirPath, 'index.html');
  const htmlPath = path.join(distDir, `${route}.html`);
  const flatFilePath = path.join(distDir, route);

  // CRITICAL: Remove flat extensionless file if it exists from a previous build.
  // Render's static server finds dist/<route> (binary) BEFORE evaluating _redirects,
  // causing Content-Type: binary/octet-stream which makes browsers download the file.
  if (fs.existsSync(flatFilePath) && !fs.statSync(flatFilePath).isDirectory()) {
    fs.unlinkSync(flatFilePath);
    console.log(`  🗑️  Removed flat extensionless file 'dist/${route}' (was causing binary Content-Type download bug)`);
  }

  if (fs.existsSync(indexPath)) {
    const htmlContent = fs.readFileSync(indexPath, 'utf8');

    // Create flat .html file (e.g. dist/terms.html) — kept as backup but not used for routing
    fs.writeFileSync(htmlPath, htmlContent, 'utf8');

    // IMPORTANT: Keep dist/<route>/index.html directory INTACT.
    // _redirects rewrites /terms → /terms/index.html
    // Render serves dist/terms/index.html with Content-Type: text/html (correct!)
    console.log(`  ✓ Created 'dist/${route}.html' | Preserved 'dist/${route}/index.html'`);
  } else {
    console.warn(`  ⚠️  Warning: Pre-rendered file ${indexPath} not found`);
  }
}

console.log('\n[postbuild] Validating mandatory legal route HTML files...');

// Validation step for mandatory legal routes
for (const { route, expectedTitle, expectedH1 } of mandatoryLegalRoutes) {
  const indexPath = path.join(distDir, route, 'index.html');
  const htmlPath = path.join(distDir, `${route}.html`);
  const flatFilePath = path.join(distDir, route);

  // Flat extensionless file must NOT exist
  if (fs.existsSync(flatFilePath) && !fs.statSync(flatFilePath).isDirectory()) {
    buildErrors.push(`[VALIDATION ERROR] Flat extensionless file 'dist/${route}' exists — this will cause binary/octet-stream Content-Type! Remove it.`);
  }

  // dist/<route>/index.html must exist (for _redirects → /route/index.html rewrite)
  if (!fs.existsSync(indexPath)) {
    buildErrors.push(`[VALIDATION ERROR] Required file missing: dist/${route}/index.html`);
    continue;
  }

  // dist/<route>.html must exist (backup copy)
  if (!fs.existsSync(htmlPath)) {
    buildErrors.push(`[VALIDATION ERROR] Required file missing: dist/${route}.html`);
    continue;
  }

  const content = fs.readFileSync(indexPath, 'utf8');

  // Check 1: Must contain the expected legal page heading
  if (!content.toLowerCase().includes(expectedTitle.toLowerCase()) && !content.toLowerCase().includes(expectedH1.toLowerCase())) {
    buildErrors.push(`[VALIDATION ERROR] dist/${route}/index.html does not contain expected heading "${expectedTitle}"`);
  }

  // Check 2: Must NOT contain homepage hero text
  if (content.includes('AI API Cost Observability') && !content.includes(expectedH1)) {
    buildErrors.push(`[VALIDATION ERROR] dist/${route}/index.html accidentally contains homepage hero instead of ${expectedTitle}`);
  }

  // Check 3: Canonical URL must point to the clean route
  if (!content.includes(`canonical" href="https://ordisum.com/${route}`) && 
      !content.includes(`rel="canonical" href="https://ordisum.com/${route}`)) {
    console.warn(`  ⚠️  Warning: canonical URL for /${route} may be missing or incorrect`);
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
  console.log('  ✓ No flat extensionless files exist (binary Content-Type bug prevented).');
  console.log('  ✓ dist/terms/index.html, dist/privacy-policy/index.html, dist/refund-policy/index.html all present.\n');
}
