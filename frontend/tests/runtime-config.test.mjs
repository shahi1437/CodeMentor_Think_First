import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getBackendApiUrl } from '../src/lib/backend-url.ts';
import { getSupabaseConfig } from '../src/lib/supabase/config.ts';

const fixtureUrl = 'https://fixture.supabase.co';
const publishable = 'sb_publishable_fixture';
const tokenWithRole = (role) => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;

describe('Supabase browser settings', () => {
  it('rejects missing and privileged keys', (t) => {
    const originalEnv = process.env;
    t.after(() => { process.env = originalEnv; });
    process.env = { NEXT_PUBLIC_SUPABASE_URL: fixtureUrl };
    assert.equal(getSupabaseConfig(), null);
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_secret_fixture';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = tokenWithRole('service_role');
    assert.equal(getSupabaseConfig(), null);
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = tokenWithRole('anon');
    assert.equal(getSupabaseConfig()?.key, tokenWithRole('anon'));
  });

  it('prefers the publishable key and rejects invalid endpoints', (t) => {
    const originalEnv = process.env;
    t.after(() => { process.env = originalEnv; });
    process.env = {
      NEXT_PUBLIC_SUPABASE_URL: `${fixtureUrl}/`,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishable,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: tokenWithRole('anon'),
    };
    assert.deepEqual(getSupabaseConfig(), { url: fixtureUrl, key: publishable });
    process.env.NEXT_PUBLIC_SUPABASE_URL = '/relative';
    assert.equal(getSupabaseConfig(), null);
  });
});

it('resolves the FastAPI prefix and rejects malformed overrides', (t) => {
  const originalEnv = process.env;
  t.after(() => { process.env = originalEnv; });
  process.env = { NEXT_PUBLIC_BACKEND_URL: ' http://127.0.0.1:8000/ ' };
  assert.equal(getBackendApiUrl(), 'http://127.0.0.1:8000/api/v1');
  process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com/service/api/v1/';
  assert.equal(getBackendApiUrl(), 'https://api.example.com/service/api/v1');
  process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com?unexpected=true';
  assert.equal(getBackendApiUrl(), null);
});
