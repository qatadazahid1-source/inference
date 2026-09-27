const fs = require('fs');
const path = './backend/src/routes/admin/pricing.js';
let content = fs.readFileSync(path, 'utf8');

const syncGroqRoute = `

// --- POST /api/admin/pricing/sync-groq ---
// Fetches the live model list from Groq's API, then:
//   1. Activates groq DB models that ARE in Groq's current live list
//   2. Deactivates groq DB models that are NO LONGER in Groq's live list
//   3. Inserts brand-new models (not yet in DB) with $0 placeholder pricing
router.post('/sync-groq', async (req, res) => {
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured on the server.' });
  }

  try {
    // 1. Fetch live model list from Groq's official API
    const groqRes = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        Authorization: \`Bearer \${GROQ_API_KEY}\`,
        'Content-Type': 'application/json',
      },
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      return res.status(502).json({ error: \`Groq API error (\${groqRes.status}): \${errBody}\` });
    }

    const groqJson = await groqRes.json();
    // Groq returns: { object: 'list', data: [ { id, object, created, owned_by }, ... ] }
    const liveModels = (groqJson.data || []).map(m => m.id);
    const liveSet = new Set(liveModels);

    // 2. Fetch ALL existing groq rows from DB (paginated)
    let dbRows = [];
    let from = 0;
    const limit = 1000;
    let hasMore = true;
    while (hasMore) {
      const { data, error: fetchErr } = await supabase
        .from('model_pricing')
        .select('id, model, is_active, input_cost_per_1k, output_cost_per_1k')
        .eq('provider', 'groq')
        .range(from, from + limit - 1);
      if (fetchErr) throw fetchErr;
      if (!data || data.length === 0) { hasMore = false; }
      else {
        dbRows = dbRows.concat(data);
        if (data.length < limit) hasMore = false;
        from += limit;
      }
    }

    const dbMap = new Map(dbRows.map(r => [r.model, r]));
    let activated = 0, deactivated = 0, inserted = 0;
    const now = new Date().toISOString();

    // 3. Activate models that exist in DB and appear in Groq's live list
    for (const liveId of liveModels) {
      const existing = dbMap.get(liveId);
      if (existing) {
        if (!existing.is_active) {
          await supabase
            .from('model_pricing')
            .update({ is_active: true, updated_at: now })
            .eq('id', existing.id);
          activated++;
        }
      } else {
        // 4. Insert brand-new models with $0 placeholder pricing
        const { data: newRow, error: insErr } = await supabase
          .from('model_pricing')
          .insert({
            provider: 'groq',
            model: liveId,
            input_cost_per_1k: 0,
            output_cost_per_1k: 0,
            is_active: true,
          })
          .select()
          .single();

        if (!insErr && newRow) {
          inserted++;
          await logPricingChange({
            changedBy: req.user.id,
            modelPricingId: newRow.id,
            provider: 'groq',
            modelName: liveId,
            oldInputCost: null,
            oldOutputCost: null,
            newInputCost: 0,
            newOutputCost: 0,
            action: 'created',
          });
        }
      }
    }

    // 5. Deactivate DB models that Groq no longer lists
    for (const [modelId, row] of dbMap.entries()) {
      if (!liveSet.has(modelId) && row.is_active) {
        await supabase
          .from('model_pricing')
          .update({ is_active: false, updated_at: now })
          .eq('id', row.id);
        deactivated++;
        await logPricingChange({
          changedBy: req.user.id,
          modelPricingId: row.id,
          provider: 'groq',
          modelName: modelId,
          oldInputCost: row.input_cost_per_1k,
          oldOutputCost: row.output_cost_per_1k,
          newInputCost: row.input_cost_per_1k,
          newOutputCost: row.output_cost_per_1k,
          action: 'deactivated',
        });
      }
    }

    res.json({
      success: true,
      totalLiveGroqModels: liveModels.length,
      activated,
      deactivated,
      inserted,
      liveModels,
    });
  } catch (err) {
    console.error('[admin/pricing] sync-groq error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});
`;

// Insert before the DELETE route (line ~505). We look for 'router.delete' which is unique
const insertBefore = 'router.delete(\'/:id\'';
const idx = content.indexOf(insertBefore);
if (idx === -1) {
  console.error('Could not find router.delete — check file manually');
  process.exit(1);
}

content = content.slice(0, idx) + syncGroqRoute + '\n' + content.slice(idx);
fs.writeFileSync(path, content, 'utf8');
console.log('sync-groq route inserted successfully!');
