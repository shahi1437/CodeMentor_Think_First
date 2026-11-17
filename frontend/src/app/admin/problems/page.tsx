'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ChevronLeft, RefreshCw, Search } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface ProblemRecord {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  category: string;
  problem_mode: 'normal' | 'debugging' | 'both';
  tags: string[];
  supported_languages: string[];
  is_published: boolean;
}

const backendUrl = process.env.NEXT_PUBLIC_API_URL
  || process.env.NEXT_PUBLIC_BACKEND_URL
  || '';

function isProblem(value: unknown): value is ProblemRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string'
    && typeof record.title === 'string'
    && typeof record.slug === 'string'
    && typeof record.difficulty === 'string'
    && typeof record.category === 'string'
    && ['normal', 'debugging', 'both'].includes(String(record.problem_mode))
    && Array.isArray(record.tags)
    && record.tags.every((tag) => typeof tag === 'string')
    && Array.isArray(record.supported_languages)
    && record.supported_languages.every((language) => typeof language === 'string')
    && typeof record.is_published === 'boolean';
}

export default function AdminProblemBankPage() {
  const [problems, setProblems] = useState<ProblemRecord[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadProblems = useCallback(async () => {
    try {
      if (!backendUrl) {
        throw new Error('Set NEXT_PUBLIC_BACKEND_URL to connect to the backend.');
      }
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        throw new Error('Supabase authentication is not configured in this browser.');
      }
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Sign in with an administrator account to view the problem bank.');
      }

      const response = await fetch(`${backendUrl}/api/v1/platform/problems`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = typeof body === 'object' && body !== null
          ? (body as Record<string, unknown>).detail
          : null;
        throw new Error(typeof detail === 'string' ? detail : `Problem request failed (${response.status}).`);
      }
      if (!Array.isArray(body) || !body.every(isProblem)) {
        throw new Error('The backend returned invalid problem data.');
      }
      setProblems(body);
      setErrorMessage('');
    } catch (error) {
      setProblems([]);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load problems.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadProblems);
  }, [loadProblems]);

  const refreshProblems = () => {
    setIsLoading(true);
    setErrorMessage('');
    void loadProblems();
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return problems.filter((problem) => (
      problem.title.toLowerCase().includes(query)
      || problem.category.toLowerCase().includes(query)
    ));
  }, [problems, search]);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/admin" aria-label="Back to administrator dashboard" className="text-slate-400 transition-colors hover:text-white">
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Problem Bank</h1>
              {!isLoading && !errorMessage && (
                <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400">
                  {problems.length} recent records
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Database-backed problem records. Hidden tests are not included in this response.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/problems/new" className="rounded-lg border border-slate-700 bg-navy-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white">
              Authoring status
            </Link>
            <button
              type="button"
              onClick={refreshProblems}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-navy-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-navy-900/60 p-4">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="search"
              aria-label="Search problem title or category"
              placeholder="Search title or category..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-navy-950 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>
          {!isLoading && !errorMessage && (
            <span className="text-xs font-mono text-slate-400">
              Showing {filtered.length} of {problems.length}
            </span>
          )}
        </div>

        {isLoading && (
          <div role="status" aria-live="polite" className="mt-6 rounded-xl border border-slate-800 bg-navy-900/60 p-5 text-sm text-slate-300">
            Loading persisted problems...
          </div>
        )}

        {errorMessage && (
          <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
            <span>{errorMessage}</span>
            <button type="button" onClick={refreshProblems} className="rounded-lg border border-rose-400/30 px-3 py-1.5 font-semibold hover:bg-rose-500/10">
              Retry
            </button>
          </div>
        )}

        {!isLoading && !errorMessage && problems.length === 0 && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-navy-900/60 p-8 text-center text-sm text-slate-300">
            No problem records are available in the database.
          </div>
        )}

        {!isLoading && !errorMessage && problems.length > 0 && filtered.length === 0 && (
          <div className="mt-6 rounded-2xl border border-slate-800 bg-navy-900/60 p-8 text-center text-sm text-slate-300">
            No problems match this search.
          </div>
        )}

        {!isLoading && !errorMessage && filtered.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-navy-900/60">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 bg-navy-950 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Mode</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Difficulty</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map((problem) => (
                    <tr key={problem.id}>
                      <td className="px-4 py-3 font-semibold text-white">{problem.title}</td>
                      <td className="px-4 py-3 capitalize">{problem.problem_mode}</td>
                      <td className="px-4 py-3 text-slate-400">{problem.category}</td>
                      <td className="px-4 py-3 capitalize">{problem.difficulty}</td>
                      <td className="px-4 py-3">
                        <span className={problem.is_published ? 'text-teal-300' : 'text-amber-300'}>
                          {problem.is_published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-xs text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Problem create/edit/publish and debugging-variant verification workflows are not implemented. No destructive actions are offered here.</p>
        </div>
      </div>
    </AppShell>
  );
}
