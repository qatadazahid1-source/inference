import express from 'express';
import { supabase } from '../../index.js';
import { callAgentLLM } from '../../utils/llmFallback.js';

const router = express.Router();

/**
 * Helper to fetch all plans for context
 */
async function getAllPlansContext() {
  const { data, error } = await supabase
    .from('plans')
    .select('id, name, slug, price_monthly, price_annual, description, system_limits, is_active')
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('[PricingAgent] Error fetching plans context:', error);
    return [];
  }
  return data;
}

/**
 * POST /api/admin/pricing-agent/chat
 * Analyzes the user's prompt and returns a Preview of the plan to be created/updated.
 */
router.post('/chat', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const existingPlans = await getAllPlansContext();
    const toolCall = await callAgentLLM(prompt, existingPlans);

    // Return the preview to the frontend for approval
    res.json({
      success: true,
      preview: {
        action: toolCall.action, // 'create_plan' or 'update_plan'
        payload: toolCall.args,
        provider: toolCall.provider
      }
    });

  } catch (error) {
    console.error('[PricingAgent] Chat Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

/**
 * POST /api/admin/pricing-agent/execute
 * Executes the approved plan creation/update.
 */
router.post('/execute', async (req, res) => {
  try {
    const { action, payload } = req.body;
    
    if (action === 'create_plan') {
      // Create new plan
      const { data, error } = await supabase
        .from('plans')
        .insert([{
          name: payload.name,
          slug: payload.slug || payload.name.toLowerCase().replace(/\s+/g, '-'),
          price_monthly: payload.price_monthly ?? payload.monthly_price ?? 0,
          price_annual: payload.price_annual ?? payload.yearly_price ?? 0,
          description: payload.description || '',
          system_limits: payload.system_limits ?? {},
          features: payload.features ?? {},
          is_active: true,
        }])
        .select()
        .single();
        
      if (error) throw error;
      return res.json({ success: true, data, message: 'Plan created successfully' });
      
    } else if (action === 'update_plan') {
      // Update existing plan
      const { plan_id, updates } = payload;
      if (!plan_id) return res.status(400).json({ error: 'plan_id is required for update_plan' });
      
      const { data, error } = await supabase
        .from('plans')
        .update({
          name: updates.name,
          price_monthly: updates.price_monthly ?? updates.monthly_price,
          price_annual: updates.price_annual ?? updates.yearly_price,
          description: updates.description,
          system_limits: updates.system_limits,
          is_active: updates.is_active,
        })
        .eq('id', plan_id)
        .select()
        .single();
        
      if (error) throw error;
      return res.json({ success: true, data, message: 'Plan updated successfully' });
      
    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('[PricingAgent] Execute Error:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

export default router;
