import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPlans() {
  const { data, error } = await supabase.from('plans').select('*');
  if (error) {
    console.error('Error fetching plans:', error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

checkPlans();
