export function getBackendApiUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_API_URL?.trim() || process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
      return null;
    }

    const base = url.href.replace(/\/+$/, '');
    return base.endsWith('/api/v1') ? base : `${base}/api/v1`;
  } catch {
    return null;
  }
}
