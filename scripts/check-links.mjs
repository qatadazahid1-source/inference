import http from 'http';
import https from 'https';

// Simple broken link checker that tests the built app running locally.
// Run AFTER starting the preview server: npm run preview
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

// The public routes we explicitly want to check
const START_ROUTES = [
  '/',
  '/features',
  '/pricing',
  '/security',
  '/contact-sales',
  '/blog',
  '/docs',
  '/privacy-policy',
  '/terms',
  '/refund-policy'
];

const visited = new Set();
const broken = [];

/** Check whether the preview server is reachable before running the full crawl. */
async function checkServerReachable() {
  return new Promise((resolve) => {
    const req = http.get(`${BASE_URL}/`, (res) => {
      res.resume(); // consume response to free socket
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function fetchUrl(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const client = url.protocol === 'https:' ? https : http;
    
    const req = client.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, data });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
  });
}

function extractLinks(html) {
  const links = new Set();
  // Match href="/path" or href="/path/"
  const regex = /href="(\/[^"]*)"/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    let link = match[1];
    // Ignore fragments
    if (link.includes('#')) {
      link = link.split('#')[0];
    }
    // Handle trailing slashes
    if (link.length > 1 && link.endsWith('/')) {
      link = link.slice(0, -1);
    }
    if (link) {
      links.add(link);
    }
  }
  return Array.from(links);
}

async function checkRoute(path) {
  if (visited.has(path)) return;
  visited.add(path);
  
  // Skip private routes
  if (path.startsWith('/dashboard') || path.startsWith('/admin') || path.startsWith('/auth') || path.startsWith('/settings')) {
    return;
  }
  
  console.log(`Checking ${path}...`);
  try {
    const { status, data } = await fetchUrl(path);
    
    if (status !== 200) {
      if (data.includes('Something went wrong') || data.includes('Page not found')) {
        broken.push({ path, reason: 'Rendered error state' });
      }
    } else {
      if (data.includes('Something went wrong') || data.includes('Page not found')) {
         broken.push({ path, reason: 'Rendered error state' });
      }
      
      const links = extractLinks(data);
      for (const link of links) {
        await checkRoute(link);
      }
    }
  } catch (err) {
    broken.push({ path, reason: err.message });
  }
}

async function run() {
  console.log('Starting link checker...');

  // Preflight: confirm preview server is running before crawling
  const reachable = await checkServerReachable();
  if (!reachable) {
    console.error(`\n❌ Cannot reach preview server at ${BASE_URL}`);
    console.error('   Start it first with:  npm run preview');
    console.error('   Then re-run:          npm run check:links\n');
    process.exit(2); // exit code 2 = server not running (distinct from link failures)
  }
  
  // Check the initial routes
  for (const route of START_ROUTES) {
    await checkRoute(route);
  }
  
  if (broken.length > 0) {
    console.error('\n❌ Broken links found:');
    broken.forEach(({ path, reason }) => {
      console.error(`- ${path}: ${reason}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All links valid.');
    process.exit(0);
  }
}

run().catch(console.error);
