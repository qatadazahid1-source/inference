const fs = require('fs');

const fixSelectLimit = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  
  const getRegex = /router\.get\('\/', async \(req, res\) => \{\s*try \{\s*const \{ data, error \} = await supabase\s*\.from\('model_pricing'\)\s*\.select\('\*'\)\s*\.order\('provider', \{ ascending: true \}\)\s*\.order\('model', \{ ascending: true \}\);\s*if \(error\) throw error;\s*res\.json\(\{ data \}\);/m;
  
  const getReplacement = `router.get('/', async (req, res) => {
  try {
    let allData = [];
    let from = 0;
    let limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('model_pricing')
        .select('*')
        .order('provider', { ascending: true })
        .order('model', { ascending: true })
        .range(from, from + limit - 1);

      if (error) throw error;
      if (data.length === 0) {
        hasMore = false;
      } else {
        allData = allData.concat(data);
        if (data.length < limit) hasMore = false;
        from += limit;
      }
    }

    res.json({ data: allData });`;
    
  if (content.match(getRegex)) {
    content = content.replace(getRegex, getReplacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed GET limit in', filePath);
  } else {
    console.log('GET regex not found in', filePath);
  }
};

const fixScraperLimit = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');
  const selectRegex = /const \{ data: dbModels, error: fetchErr \} = await supabase\s*\.from\('model_pricing'\)\s*\.select\('id, provider, model, input_cost_per_1k, output_cost_per_1k'\);\s*if \(fetchErr\) throw fetchErr;/m;
  
  const selectReplacement = `let dbModels = [];
    let from = 0;
    let limit = 1000;
    let hasMore = true;
    while(hasMore) {
      const { data, error: fetchErr } = await supabase
        .from('model_pricing')
        .select('id, provider, model, input_cost_per_1k, output_cost_per_1k')
        .range(from, from + limit - 1);
      if (fetchErr) throw fetchErr;
      if (data.length === 0) {
        hasMore = false;
      } else {
        dbModels = dbModels.concat(data);
        if (data.length < limit) hasMore = false;
        from += limit;
      }
    }`;
    
  if (content.match(selectRegex)) {
    content = content.replace(selectRegex, selectReplacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed scraper limit in', filePath);
  } else {
    console.log('Scraper regex not found in', filePath);
  }
};

fixSelectLimit('./backend/src/routes/admin/pricing.js');
fixScraperLimit('./backend/src/controllers/portkeyScraperController.js');
fixScraperLimit('./backend/src/controllers/openrouterScraperController.js');

let pricingContent = fs.readFileSync('./backend/src/routes/admin/pricing.js', 'utf8');
const selectRegex = /const \{ data: existingPricing, error: fetchErr \} = await supabase\s*\.from\('model_pricing'\)\s*\.select\('id, provider, model, input_cost_per_1k, output_cost_per_1k'\);\s*if \(fetchErr\) throw fetchErr;/g;

const selectReplacement2 = `let existingPricing = [];
    let from = 0;
    let limit = 1000;
    let hasMore = true;
    while(hasMore) {
      const { data, error: fetchErr } = await supabase
        .from('model_pricing')
        .select('id, provider, model, input_cost_per_1k, output_cost_per_1k')
        .range(from, from + limit - 1);
      if (fetchErr) throw fetchErr;
      if (data.length === 0) {
        hasMore = false;
      } else {
        existingPricing = existingPricing.concat(data);
        if (data.length < limit) hasMore = false;
        from += limit;
      }
    }`;
pricingContent = pricingContent.replace(selectRegex, selectReplacement2);
fs.writeFileSync('./backend/src/routes/admin/pricing.js', pricingContent, 'utf8');

console.log('Done replacing!');
