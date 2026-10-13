/**
 * Supabase client instance for Style Villa
 * Connects directly to Supabase via CDN or dynamic ESM
 */
export const SUPABASE_URL = 'https://rhukoaepajqryepnbwmy.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_i0RQeW-ReKQ1m7d8CVN7RQ_PUohCdC_';

let client = null;

if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const supabase = client;
export default supabase;
