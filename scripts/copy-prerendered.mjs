import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const routes = [
  'terms',
  'privacy-policy',
  'refund-policy',
  'features',
  'pricing',
  'security',
  'contact-sales',
  'blog',
  'docs'
];

console.log('[postbuild] Creating flat extensionless and .html pre-rendered files for direct static server matching...');

for (const route of routes) {
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

    console.log(`  ✓ Successfully created flat static files 'dist/${route}' and 'dist/${route}.html'`);
  } else {
    console.warn(`  ⚠️ Warning: ${indexPath} not found`);
  }
}
