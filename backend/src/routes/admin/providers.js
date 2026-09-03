import express from 'express';
import { supabase } from '../../index.js';

const router = express.Router();

// GET /api/admin/providers
// Get all AI providers
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ai_providers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('[admin/providers] GET error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// POST /api/admin/providers
// Create a new AI provider
router.post('/', async (req, res) => {
  const { name, provider_id, color, is_active } = req.body;

  if (!name || !provider_id) {
    return res.status(400).json({ error: 'name and provider_id are required' });
  }

  try {
    const { data, error } = await supabase
      .from('ai_providers')
      .insert({ name, provider_id, color, is_active })
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('[admin/providers] POST error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// PUT /api/admin/providers/:id
// Update an AI provider
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, provider_id, color, is_active } = req.body;

  try {
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (provider_id !== undefined) updates.provider_id = provider_id;
    if (color !== undefined) updates.color = color;
    if (is_active !== undefined) updates.is_active = is_active;

    const { data, error } = await supabase
      .from('ai_providers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    console.error('[admin/providers] PUT error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// DELETE /api/admin/providers/:id
// Delete an AI provider
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('ai_providers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[admin/providers] DELETE error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

export default router;
