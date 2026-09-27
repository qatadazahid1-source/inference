import https from 'https';

const url = 'https://www.ordisum.com/terms';

const check = () => {
  const cacheBuster = `?cb=${Date.now()}`;
  https.get(`${url}${cacheBuster}`, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const h1Match = data.match(/<h1[^>]*>(.*?)<\/h1>/i);
      const isHomepage = data.includes('Zero Prompt Content Storage');
      
      console.log(`Status: ${res.statusCode}, Content-Type: ${res.headers['content-type']}, Content-Disposition: ${res.headers['content-disposition'] || 'none'}`);
      console.log(`Is Homepage: ${isHomepage}, H1: ${h1Match ? h1Match[1] : 'None'}`);
      
      if (!isHomepage && h1Match && h1Match[1] === 'Terms of Service') {
        console.log('✅ DEPLOYMENT IS LIVE! The terms page is working correctly.');
        process.exit(0);
      } else {
        console.log('... waiting 5 seconds for deployment to propagate ...\n');
        setTimeout(check, 5000);
      }
    });
  }).on('error', err => {
    console.error('Request error:', err);
    setTimeout(check, 5000);
  });
};

check();
