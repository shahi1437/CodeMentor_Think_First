'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, History, Loader2, RefreshCw, Search } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface Submission {
  id: string;
  problem_id: string;
  status: string;
  score: number | null;
  language: string;
  created_at: string;
}

interface ProblemSummary {
  id: string;
  title: string;
  problem_mode: 'normal' | 'debugging' | 'both';
}

type SubmissionHistoryItem = Submission & {
  problem_title: string;
  problem_mode: ProblemSummary['problem_mode'] | 'unknown';
};

type ModeFilter = 'all' | 'normal' | 'debugging';

const backendUrl = process.env.NEXT_PUBLIC_API_URL
  || process.env.NEXT_PUBLIC_BACKEND_URL
  || '';

function isSubmission(value: unknown): value is Submission {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string'
    && typeof record.problem_id === 'string'
    && typeof record.status === 'string'
    && (typeof record.score === 'number' || record.score === null)
    && typeof record.language === 'string'
    && typeof record.created_at === 'string';
}

function isProblemSummary(value: unknown): value is ProblemSummary {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string'
    && typeof record.title === 'string'
    && ['normal', 'debugging', 'both'].includes(String(record.problem_mode));
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

export default function LearningHistoryPage() {
  const [submissions, setSubmissions] = useState<SubmissionHistoryItem[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<ModeFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadHistory = useCallback(async () => {
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
        throw new Error('Sign in to view your saved submission history.');
      }

      const headers = { Authorization: `Bearer ${session.access_token}` };
      const [submissionResponse, problemResponse] = await Promise.all([
        fetch(`${backendUrl}/api/v1/platform/submissions`, { headers, cache: 'no-store' }),
        fetch(`${backendUrl}/api/v1/platform/problems`, { headers, cache: 'no-store' }),
      ]);
      const [submissionBody, problemBody]: [unknown, unknown] = await Promise.all([
        submissionResponse.json().catch(() => null),
        problemResponse.json().catch(() => null),
      ]);
      const failedResponse = [
        [submissionResponse, submissionBody],
        [problemResponse, problemBody],
      ].find(([response]) => !(response as Response).ok);
      if (failedResponse) {
        const [response, body] = failedResponse as [Response, unknown];
        const detail = typeof body === 'object' && body !== null
          ? (body as Record<string, unknown>).detail
          : null;
        throw new Error(typeof detail === 'string' ? detail : `History request failed (${response.status}).`);
      }
      if (!Array.isArray(submissionBody) || !submissionBody.every(isSubmission)
        || !Array.isArray(problemBody) || !problemBody.every(isProblemSummary)) {
        throw new Error('The backend returned invalid submission history data.');
      }

      const problemById = new Map((problemBody as ProblemSummary[]).map((problem) => [problem.id, problem]));
      setSubmissions((submissionBody as Submission[]).map((submission) => {
        const problem = problemById.get(submission.problem_id);
        return {
          ...submission,
          problem_title: problem?.title ?? `Problem ${submission.problem_id.slice(0, 8)}`,
          problem_mode: problem?.problem_mode ?? 'unknown',
        };
      }));
      setErrorMessage('');
    } catch (error) {
      setSubmissions([]);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load your submission history.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadHistory);
  }, [loadHistory]);

  const refreshHistory = () => {
    setIsLoading(true);
    setErrorMessage('');
    void loadHistory();
  };

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return submissions.filter((submission) => {
      const matchesMode = selectedFilter === 'all'
        || submission.problem_mode === selectedFilter
        || (selectedFilter === 'normal' && submission.problem_mode === 'both');
      const matchesSearch = submission.problem_title.toLowerCase().includes(query)
        || submission.language.toLowerCase().includes(query)
        || submission.status.toLowerCase().includes(query);
      return matchesMode && matchesSearch;
    });
  }, [searchTerm, selectedFilter, submissions]);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-400" />
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Learning History</h1>
              {!isLoading && !errorMessage && (
                <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400">
                  {submissions.length} recent submissions
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Your 20 most recent persisted submissions, using safe summary fields only. Source code and test outputs are not shown here.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshHistory}
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-navy-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {isLoading && (
          <div role="status" aria-live="polite" className="mt-6 flex items-center gap-2 rounded-xl border border-slate-800 bg-navy-900/60 p-5 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            Loading your saved submissions...
          </div>
        )}

        {errorMessage && (
          <div role="alert" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
            <span>{errorMessage}</span>
            <button type="button" onClick={refreshHistory} className="rounded-lg border border-rose-400/30 px-3 py-1.5 font-semibold hover:bg-rose-500/10">
              Retry
            </button>
          </div>
        )}

        {!isLoading && !errorMessage && (
          <>
            <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-navy-900/60 p-4 sm:flex-row">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="search"
                  aria-label="Search submission history"
                  placeholder="Search title, language, or status..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-navy-950 py-2 pl-9 pr-4 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[11px] font-semibold uppercase text-slate-400">Mode:</span>
                {(['all', 'normal', 'debugging'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setSelectedFilter(filter)}
                    aria-pressed={selectedFilter === filter}
                    className={`rounded-lg px-2.5 py-1 capitalize transition-colors ${
                      selectedFilter === filter ? 'bg-indigo-600 font-bold text-white' : 'bg-navy-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {submissions.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-slate-800 bg-navy-900/60 p-12 text-center text-xs text-slate-400">
                <History className="mx-auto mb-2 h-8 w-8 text-slate-500" />
                <p className="text-sm font-semibold text-slate-300">No saved submissions yet</p>
                <p className="mt-1">Accepted and unsuccessful submission summaries will appear here.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-slate-800 bg-navy-900/60 p-8 text-center text-xs text-slate-400">
                <AlertCircle className="mx-auto mb-2 h-6 w-6 text-slate-500" />
                No submissions match the selected search and mode.
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-2xl border border-slate-800 bg-navy-900/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 bg-navy-950 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">Problem</th>
                        <th className="px-4 py-3">Mode</th>
                        <th className="px-4 py-3">Language</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3">Submitted</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filtered.map((submission) => {
                        const mode = submission.problem_mode === 'unknown' ? 'unknown' : submission.problem_mode;
                        const href = mode === 'debugging'
                          ? `/workspace/debugging/${submission.problem_id}`
                          : `/workspace/coding/${submission.problem_id}`;
                        return (
                          <tr key={submission.id}>
                            <td className="px-4 py-3 font-semibold text-white">{submission.problem_title}</td>
                            <td className="px-4 py-3 capitalize">{mode}</td>
                            <td className="px-4 py-3 font-mono text-slate-400">{submission.language}</td>
                            <td className="px-4 py-3 capitalize">{formatStatus(submission.status)}</td>
                            <td className="px-4 py-3 font-mono">{submission.score === null ? '—' : `${submission.score}%`}</td>
                            <td className="px-4 py-3 text-slate-500">{new Date(submission.created_at).toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">
                              <Link href={href} className="font-semibold text-indigo-400 hover:text-indigo-300">
                                Re-open
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
