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

console.log('[postbuild] Copying pre-rendered index.html files to flat .html files for clean URL resolution...');

for (const route of routes) {
  const indexPath = path.join(distDir, route, 'index.html');
  const htmlPath = path.join(distDir, `${route}.html`);

  if (fs.existsSync(indexPath)) {
    fs.copyFileSync(indexPath, htmlPath);
    console.log(`  ✓ Copied ${route}/index.html -> ${route}.html`);
  } else {
    console.warn(`  ⚠️ Warning: ${indexPath} not found`);
  }
}
