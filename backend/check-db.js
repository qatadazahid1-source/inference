import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase.from('plans').select('id, name, slug, lemonsqueezy_variant_id_monthly, lemonsqueezy_variant_id_annual, is_active');
  if (error) {
    console.error(error);
  } else {
    console.table(data);
  }
}
check();
