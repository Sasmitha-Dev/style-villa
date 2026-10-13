import { createClient } from '@supabase/supabase-js';
import config from '../config.js';

let supabase = null;

if (config.supabaseUrl && config.supabaseKey) {
  supabase = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: {
      persistSession: false
    }
  });
} else {
  console.warn('⚠️ Supabase credentials not found in backend configuration.');
}

export function getSupabase() {
  return supabase;
}

export default supabase;
