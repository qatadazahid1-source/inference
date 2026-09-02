import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve the path to the root workspace .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing supabase URL or service role key in env", { supabaseUrl, supabaseKey });
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking static_pages...");
  const { data: pages, error: errorPages } = await supabase.from('static_pages').select('slug, title, is_published');
  if (errorPages) console.error("Pages error:", errorPages);
  else console.log("Pages:", pages);

  console.log("Checking blog_posts...");
  const { data: posts, error: errorPosts } = await supabase.from('blog_posts').select('slug, title, status');
  if (errorPosts) console.error("Posts error:", errorPosts);
  else console.log("Posts:", posts);

  console.log("Checking site_links...");
  const { data: links, error: errorLinks } = await supabase.from('site_links').select('id, section, label, url, is_active');
  if (errorLinks) console.error("Links error:", errorLinks);
  else console.log("Links:", links);
}

check();
