export const supabaseConfigMessage =
  'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and a publishable or anon key in frontend/.env.local.';

function isPublicKey(key: string): boolean {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;

  const segments = key.split('.');
  if (segments.length !== 3 || segments.some((segment) => !/^[A-Za-z0-9_-]+$/.test(segment))) return false;

  try {
    const payload = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload))?.role === 'anon';
  } catch {
    return false;
  }
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url || url.includes('your-project-ref')) return null;

  try {
    const endpoint = new URL(url);
    if (!['http:', 'https:'].includes(endpoint.protocol) || endpoint.username || endpoint.password
      || endpoint.search || endpoint.hash) return null;
  } catch {
    return null;
  }

  const key = [process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY]
    .map((value) => value?.trim() ?? '')
    .find(isPublicKey);
  return key ? { url: url.replace(/\/+$/, ''), key } : null;
}
