import https from 'https';

const pagesToTest = [
  '/terms',
  '/privacy-policy',
  '/refund-policy'
];

const baseUrl = 'https://www.ordisum.com';

const testUrl = (urlPath) => {
  return new Promise((resolve, reject) => {
    // Add a random query parameter to bypass Cloudflare cache
    const cacheBuster = `?cb=${Date.now()}`;
    const fullUrl = `${baseUrl}${urlPath}${cacheBuster}`;

    https.get(fullUrl, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          url: urlPath,
          statusCode: res.statusCode,
          headers: res.headers,
          bodySnippet: data.substring(0, 1000), // First 1000 chars to check if HTML
          isHTML: data.includes('<html') && data.includes('<head>')
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

const runTests = async () => {
  console.log('--- STARTING PRODUCTION HTTP VERIFICATION ---\n');
  
  for (const page of pagesToTest) {
    try {
      console.log(`Testing: ${page}`);
      const result = await testUrl(page);
      
      console.log(`  Status Code: ${result.statusCode}`);
      console.log(`  Content-Type: ${result.headers['content-type']}`);
      
      const contentDisposition = result.headers['content-disposition'];
      console.log(`  Content-Disposition: ${contentDisposition ? contentDisposition : 'None (Correct!)'}`);
      
      if (result.headers['content-type'] === 'binary/octet-stream') {
        console.error(`  ❌ FAILED: Still serving as binary/octet-stream`);
      } else if (result.headers['content-type'].includes('text/html')) {
        console.log(`  ✅ SUCCESS: Serving as text/html`);
      }
      
      if (contentDisposition && contentDisposition.includes('attachment')) {
        console.error(`  ❌ FAILED: Still has attachment disposition`);
      }

      console.log(`  Is Valid HTML Document: ${result.isHTML ? 'Yes ✅' : 'No ❌'}`);
      
      // Look for H1 to ensure it's not the SPA shell
      const h1Match = result.bodySnippet.match(/<h1[^>]*>(.*?)<\/h1>/i);
      console.log(`  First H1 tag found: ${h1Match ? h1Match[1] : 'None found in first 1000 chars'}`);
      
      // Look for canonical
      const canonicalMatch = result.bodySnippet.match(/<link rel="canonical" href="(.*?)"/i);
      console.log(`  Canonical URL: ${canonicalMatch ? canonicalMatch[1] : 'None found in first 1000 chars'}`);

      console.log('\n----------------------------------------\n');
    } catch (err) {
      console.error(`Error testing ${page}:`, err);
    }
  }
};

runTests();
