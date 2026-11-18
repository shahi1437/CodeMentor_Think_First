import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseConfig } from './config';

export function getSupabaseBrowserClient() {
  const config = getSupabaseConfig();
  return config ? createBrowserClient(config.url, config.key) : null;
}
