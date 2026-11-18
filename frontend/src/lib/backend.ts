import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { supabaseConfigMessage } from '@/lib/supabase/config';
import { getBackendApiUrl } from '@/lib/backend-url';

export interface PlatformRunResult {
  status: string;
  message?: string;
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  execution_time_ms?: number | null;
  memory_kb?: number | null;
  passed_test_count?: number;
  total_test_count?: number;
}

export class BackendRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function getBackendAccessToken() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new BackendRequestError(supabaseConfigMessage, 503);

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new BackendRequestError('Sign in to continue.', 401);
  return session.access_token;
}

export async function backendRequestWithToken<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const backend = getBackendApiUrl();
  if (!backend) {
    throw new BackendRequestError('Set NEXT_PUBLIC_BACKEND_URL (or NEXT_PUBLIC_API_URL) to a valid FastAPI URL in frontend/.env.local.', 503);
  }

  const headers = new Headers(init?.headers);
  headers.set('Authorization', 'Bearer ' + token);
  if (init?.body) headers.set('Content-Type', 'application/json');
  let response: Response;
  try {
    response = await fetch(backend + path, {
      ...init, headers, cache: 'no-store', redirect: 'error',
    });
  } catch {
    throw new BackendRequestError('Could not reach FastAPI. Check that the configured backend is running.', 503);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.detail;
    const message = typeof detail === 'string' ? detail
      : Array.isArray(detail) && typeof detail[0]?.msg === 'string' ? detail[0].msg
      : 'The request failed (' + response.status + '). Try again.';
    throw new BackendRequestError(message, response.status);
  }
  return data as T;
}

export async function backendRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return backendRequestWithToken<T>(path, await getBackendAccessToken(), init);
}
