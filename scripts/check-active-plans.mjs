import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: 'C:/Users/AL-Rehmat/OneDrive/Desktop/NEW ROI/.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data, error } = await supabase
  .from('plans')
  .select('id, name, slug, price_monthly, price_annual, tagline, is_popular, cta_text, cta_variant, sort_order, display_features, is_active')
  .eq('is_active', true)
  .order('sort_order');

if (error) {
  console.error('DB error:', JSON.stringify(error));
} else {
  console.log(JSON.stringify(data, null, 2));
}
