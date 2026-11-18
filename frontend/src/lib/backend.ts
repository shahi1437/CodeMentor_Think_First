import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export async function backendRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const backend = (process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL)?.replace(/\/$/, '');
  const supabase = getSupabaseBrowserClient();
  if (!backend || !supabase) throw new Error('The backend or sign-in service is unavailable.');
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('Sign in to continue.');

  const headers = new Headers(init?.headers);
  headers.set('Authorization', 'Bearer ' + session.access_token);
  if (init?.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(backend + '/api/v1' + path, { ...init, headers, cache: 'no-store' });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.detail;
    const message = typeof detail === 'string' ? detail
      : Array.isArray(detail) && typeof detail[0]?.msg === 'string' ? detail[0].msg
      : 'The request failed (' + response.status + '). Try again.';
    throw new Error(message);
  }
  return data as T;
}
