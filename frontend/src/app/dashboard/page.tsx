'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Bug,
  CheckCircle2,
  Code2,
  Dna,
  Flame,
  Loader2,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatsCard } from '@/components/ui/StatsCard';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface LearningDNA {
  mastery: Record<string, number>;
  streak_days: number;
  consistency: number;
  submission_count: number;
  accepted_submission_count: number;
  problems_solved: number;
  error_categories: Record<string, number>;
  has_data: boolean;
}

interface Submission {
  id: string;
  problem_id: string;
  status: string;
  score: number | null;
  language: string;
  created_at: string;
}

interface DailyPlanTask {
  id: string;
  title: string;
  task_type: string;
  completed: boolean;
}

interface DailyPlan {
  id: string;
  plan_name: string;
  status: string;
  tasks: DailyPlanTask[];
}

interface DashboardData {
  dna: LearningDNA;
  submissions: Submission[];
  plans: DailyPlan[];
  studentName: string;
}

type ActivityFilter = 'all' | 'passed' | 'errors';

const backendUrl = process.env.NEXT_PUBLIC_API_URL
  || process.env.NEXT_PUBLIC_BACKEND_URL
  || '';
const EMPTY_SUBMISSIONS: Submission[] = [];

function isLearningDNA(value: unknown): value is LearningDNA {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.streak_days === 'number'
    && typeof record.submission_count === 'number'
    && typeof record.accepted_submission_count === 'number'
    && typeof record.problems_solved === 'number'
    && typeof record.has_data === 'boolean'
    && typeof record.mastery === 'object'
    && record.mastery !== null
    && typeof record.error_categories === 'object'
    && record.error_categories !== null;
}

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

function isDailyPlan(value: unknown): value is DailyPlan {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string'
    && typeof record.plan_name === 'string'
    && typeof record.status === 'string'
    && Array.isArray(record.tasks)
    && record.tasks.every((task) => (
      typeof task === 'object'
      && task !== null
      && typeof (task as Record<string, unknown>).id === 'string'
      && typeof (task as Record<string, unknown>).title === 'string'
      && typeof (task as Record<string, unknown>).task_type === 'string'
      && typeof (task as Record<string, unknown>).completed === 'boolean'
    ));
}

function taskHref(taskType: string) {
  if (taskType === 'mentor') return '/mentor';
  if (taskType === 'assessment') return '/assessment';
  return '/problems';
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

export default function StudentDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [filterState, setFilterState] = useState<ActivityFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadDashboard = useCallback(async () => {
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
        throw new Error('Sign in to load your student dashboard.');
      }

      const headers = { Authorization: `Bearer ${session.access_token}` };
      const [dnaResponse, submissionResponse, planResponse] = await Promise.all([
        fetch(`${backendUrl}/api/v1/platform/learning-dna`, { headers, cache: 'no-store' }),
        fetch(`${backendUrl}/api/v1/platform/submissions`, { headers, cache: 'no-store' }),
        fetch(`${backendUrl}/api/v1/platform/daily-plans`, { headers, cache: 'no-store' }),
      ]);
      const [dnaBody, submissionBody, planBody] = await Promise.all([
        dnaResponse.json().catch(() => null),
        submissionResponse.json().catch(() => null),
        planResponse.json().catch(() => null),
      ]);

      const failedResponse = [
        [dnaResponse, dnaBody],
        [submissionResponse, submissionBody],
        [planResponse, planBody],
      ].find(([response]) => !(response as Response).ok);
      if (failedResponse) {
        const [response, body] = failedResponse as [Response, unknown];
        const detail = typeof body === 'object' && body !== null
          ? (body as Record<string, unknown>).detail
          : null;
        throw new Error(typeof detail === 'string' ? detail : `Dashboard request failed (${response.status}).`);
      }
      if (!isLearningDNA(dnaBody)
        || !Array.isArray(submissionBody)
        || !submissionBody.every(isSubmission)
        || !Array.isArray(planBody)
        || !planBody.every(isDailyPlan)) {
        throw new Error('The backend returned invalid dashboard data.');
      }

      const name = session.user.user_metadata?.full_name;
      setData({
        dna: dnaBody,
        submissions: submissionBody,
        plans: planBody,
        studentName: typeof name === 'string' && name.trim() ? name : 'learner',
      });
    } catch (error) {
      setData(null);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load your dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  const refreshDashboard = () => {
    setIsLoading(true);
    setErrorMessage('');
    void loadDashboard();
  };

  const submissions = data?.submissions ?? EMPTY_SUBMISSIONS;
  const filteredSubmissions = useMemo(() => submissions.filter((submission) => {
    if (filterState === 'passed') return submission.status === 'passed';
    if (filterState === 'errors') return submission.status !== 'passed';
    return true;
  }), [filterState, submissions]);

  const firstActivePlan = data?.plans.find((plan) => plan.status === 'active') ?? data?.plans[0];
  const planTasks = firstActivePlan?.tasks ?? [];
  const errorCategories = Object.entries(data?.dna.error_categories ?? {})
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);
  const acceptedRate = data && data.dna.submission_count > 0
    ? Math.round((data.dna.accepted_submission_count / data.dna.submission_count) * 100)
    : 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome, {data?.studentName ?? 'learner'}
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              Your progress is based on persisted submissions and saved study plans.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={refreshDashboard}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-navy-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link href="/problems" className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-500">
              Browse problems
            </Link>
          </div>
        </div>

        {isLoading && (
          <div role="status" aria-live="polite" className="mt-8 flex items-center gap-2 rounded-xl border border-slate-800 bg-navy-900/60 p-5 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            Loading your persisted activity...
          </div>
        )}

        {errorMessage && (
          <div role="alert" className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
            <span>{errorMessage}</span>
            <button type="button" onClick={refreshDashboard} className="rounded-lg border border-rose-400/30 px-3 py-1.5 font-semibold hover:bg-rose-500/10">
              Retry
            </button>
          </div>
        )}

        {!isLoading && !errorMessage && data && (
          <>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Problems Solved"
                value={data.dna.problems_solved}
                subtitle="Distinct problems with accepted submissions"
                icon={Code2}
                accentColor="indigo"
              />
              <StatsCard
                title="Accepted Rate"
                value={`${acceptedRate}%`}
                subtitle={`${data.dna.accepted_submission_count} accepted of ${data.dna.submission_count} analyzed`}
                icon={TrendingUp}
                accentColor="teal"
              />
              <StatsCard
                title="Activity Streak"
                value={`${data.dna.streak_days} days`}
                subtitle="Consecutive days with recorded submissions"
                icon={Flame}
                accentColor="amber"
              />
              <StatsCard
                title="Recent Attempts"
                value={submissions.length}
                subtitle="Most recent persisted submissions"
                icon={Bug}
                accentColor="rose"
              />
            </div>

            {!data.dna.has_data && (
              <div className="mt-6 rounded-xl border border-slate-800 bg-navy-900/50 p-4 text-xs text-slate-300">
                No submissions have been recorded yet. Solve a published problem to start building your progress profile.
              </div>
            )}

            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
              <section className="space-y-5 lg:col-span-2">
                <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-navy-900/90 to-indigo-950/40 p-6">
                  <span className="rounded border border-indigo-500/30 bg-indigo-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-indigo-300">
                    Practice
                  </span>
                  <h2 className="mt-3 text-lg font-bold text-white">Choose your next challenge</h2>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-300">
                    The adaptive challenge selector is not implemented yet. Browse the published catalog and choose a problem that fits your goals.
                  </p>
                  <Link href="/problems" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-500">
                    Open Problem Hub <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                <section className="rounded-2xl border border-slate-800 bg-navy-900/60 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-bold text-white">Saved study plan</h2>
                      <p className="text-xs text-slate-400">{firstActivePlan?.plan_name ?? 'No active plan'}</p>
                    </div>
                    <Link href="/daily-plan" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                      View plans
                    </Link>
                  </div>
                  {planTasks.length === 0 ? (
                    <p className="mt-4 rounded-xl border border-slate-800 p-4 text-xs text-slate-400">
                      No tasks are available in your saved plan.
                    </p>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {planTasks.slice(0, 4).map((task) => (
                        <Link
                          key={task.id}
                          href={taskHref(task.task_type)}
                          className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-navy-950/60 p-3 transition-colors hover:border-slate-700"
                        >
                          <span className={`text-xs ${task.completed ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                            {task.title}
                          </span>
                          {task.completed
                            ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            : <ArrowRight className="h-4 w-4 text-slate-500" />}
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-navy-900/60 p-6">
                <div className="flex items-center gap-2">
                  <Dna className="h-5 w-5 text-indigo-400" />
                  <h2 className="text-sm font-bold text-white">Learning DNA</h2>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  Recorded unsuccessful submission categories.
                </p>
                <div className="mt-4 space-y-3">
                  {errorCategories.length === 0 ? (
                    <p className="rounded-xl border border-slate-800 p-3 text-xs text-slate-400">
                      No error categories have been recorded.
                    </p>
                  ) : errorCategories.map(([category, count]) => (
                    <div key={category} className="rounded-xl border border-slate-800 bg-navy-950/70 p-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold capitalize text-slate-200">{formatStatus(category)}</span>
                        <span className="font-mono text-amber-400">{count}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {count} {count === 1 ? 'submission' : 'submissions'}
                      </p>
                    </div>
                  ))}
                </div>
                <Link href="/learning-dna" className="mt-5 inline-block text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                  Full analysis →
                </Link>
              </section>
            </div>

            <section className="mt-8 rounded-2xl border border-slate-800 bg-navy-900/60 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-white">Recent submissions</h2>
                  <p className="text-xs text-slate-400">Safe summary fields from your account only</p>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-navy-950 p-1 text-xs">
                  {(['all', 'passed', 'errors'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setFilterState(filter)}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors ${
                        filterState === filter ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>
              {filteredSubmissions.length === 0 ? (
                <div className="py-10 text-center">
                  <AlertCircle className="mx-auto h-8 w-8 text-slate-500" />
                  <p className="mt-2 text-sm font-semibold text-slate-300">
                    {submissions.length === 0 ? 'No submissions yet' : 'No submissions match this filter'}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {submissions.length === 0 ? 'Your submitted solutions will appear here.' : 'Choose another filter to see more activity.'}
                  </p>
                </div>
              ) : (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="pb-3">Problem</th>
                        <th className="pb-3">Language</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Score</th>
                        <th className="pb-3">Submitted</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredSubmissions.map((submission) => (
                        <tr key={submission.id}>
                          <td className="py-3 font-semibold text-white">
                            <Link href="/problems" className="hover:text-indigo-400">
                              Problem {submission.problem_id.slice(0, 8)}
                            </Link>
                          </td>
                          <td className="py-3 font-mono text-slate-400">{submission.language}</td>
                          <td className="py-3 capitalize">{formatStatus(submission.status)}</td>
                          <td className="py-3 font-mono text-slate-400">
                            {submission.score === null ? '—' : `${submission.score}%`}
                          </td>
                          <td className="py-3 text-slate-500">
                            {new Date(submission.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
