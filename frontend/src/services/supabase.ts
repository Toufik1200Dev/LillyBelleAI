import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? '';

const PLACEHOLDER_URL_SNIPPETS = ['your-project.supabase.co', '<project-ref>', 'YOUR_PROJECT_REF'];

function isPlaceholderSupabaseUrl(url: string): boolean {
  if (!url) return true;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (!host.endsWith('.supabase.co')) return true;
    return PLACEHOLDER_URL_SNIPPETS.some((s) => url.toLowerCase().includes(s.replace(/[<>]/g, '')));
  } catch {
    return true;
  }
}

function isPlaceholderAnonKey(key: string): boolean {
  if (!key || key.length < 40) return true;
  if (!key.startsWith('eyJ')) return true;
  const lower = key.toLowerCase();
  return lower.includes('your-anon') || lower.includes('placeholder') || key === 'your-anon-key-here';
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy frontend/.env.example to frontend/.env and set both (Supabase → Settings → API).'
  );
}

if (isPlaceholderSupabaseUrl(supabaseUrl)) {
  throw new Error(
    'VITE_SUPABASE_URL is still a placeholder (e.g. your-project.supabase.co). Set it to your real Project URL from Supabase → Settings → API, then restart the dev server or rebuild before deploy.'
  );
}

if (isPlaceholderAnonKey(supabaseAnonKey)) {
  throw new Error(
    'VITE_SUPABASE_ANON_KEY is missing or still a placeholder. Paste the anon public key from Supabase → Settings → API (not the service_role key).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
