import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Allow up to 2 hours of clock skew between device and Supabase server.
    // Without this, a 1-hour drift causes "Session issued in the future" warnings
    // and silently rejects the OAuth session, sending the user back to landing page.
    // See: https://github.com/supabase/gotrue-js/issues/806
    clockSkewInSeconds: 7200,
  }
});
