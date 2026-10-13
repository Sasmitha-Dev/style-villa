/**
 * Supabase client instance for Style Villa
 * Connects directly to Supabase with automatic fallbacks and zero crash risk
 */
export const SUPABASE_URL = 'https://rhukoaepajqryepnbwmy.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_i0RQeW-ReKQ1m7d8CVN7RQ_PUohCdC_';

let client = null;

export function getSupabase() {
  if (client) return client;
  if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      return client;
    } catch (e) {
      console.warn('Error initializing Supabase from window.supabase:', e);
    }
  }
  return null;
}

export async function ensureSupabase() {
  if (client) return client;
  const existing = getSupabase();
  if (existing) return existing;

  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return client;
  } catch (err) {
    console.warn('Supabase ESM dynamic load warning:', err);
    return null;
  }
}

// Immediately try to initialize
getSupabase();

// Proxy to guarantee safe calls to supabase.from(...) without unhandled exceptions
export const supabase = new Proxy({}, {
  get(_target, prop) {
    const instance = getSupabase();
    if (instance && typeof instance[prop] === 'function') {
      return instance[prop].bind(instance);
    }
    if (instance && prop in instance) {
      return instance[prop];
    }
    return (..._args) => ({
      select: () => Promise.resolve({ data: null, error: { message: 'Database not initialized' } }),
      insert: () => Promise.resolve({ data: null, error: { message: 'Database not initialized' } }),
      update: () => Promise.resolve({ data: null, error: { message: 'Database not initialized' } }),
      delete: () => Promise.resolve({ data: null, error: { message: 'Database not initialized' } })
    });
  }
});

export default supabase;
