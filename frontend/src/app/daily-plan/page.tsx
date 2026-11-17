'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Calendar, CheckCircle2, Loader2, RotateCcw } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type DailyPlanTask = {
  id: string;
  plan_id: string;
  title: string;
  description: string | null;
  task_type: 'practice' | 'review' | 'debugging' | 'mentor' | 'assessment';
  completed: boolean;
};

type DailyPlan = {
  id: string;
  plan_name: string;
  summary: string | null;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  tasks: DailyPlanTask[];
};

const backendUrl = process.env.NEXT_PUBLIC_API_URL
  || process.env.NEXT_PUBLIC_BACKEND_URL
  || '';
const taskTypes: DailyPlanTask['task_type'][] = ['practice', 'review', 'debugging', 'mentor', 'assessment'];

function isDailyPlan(value: unknown): value is DailyPlan {
  if (typeof value !== 'object' || value === null) return false;
  const plan = value as Record<string, unknown>;
  return typeof plan.id === 'string'
    && typeof plan.plan_name === 'string'
    && (plan.summary === null || typeof plan.summary === 'string')
    && ['active', 'completed', 'archived'].includes(String(plan.status))
    && typeof plan.created_at === 'string'
    && !Number.isNaN(Date.parse(plan.created_at))
    && Array.isArray(plan.tasks)
    && plan.tasks.every((task) => {
      if (typeof task !== 'object' || task === null) return false;
      const taskRecord = task as Record<string, unknown>;
      return typeof taskRecord.id === 'string'
        && typeof taskRecord.plan_id === 'string'
        && typeof taskRecord.title === 'string'
        && (taskRecord.description === null || typeof taskRecord.description === 'string')
        && typeof taskRecord.task_type === 'string'
        && taskTypes.includes(taskRecord.task_type as DailyPlanTask['task_type'])
        && typeof taskRecord.completed === 'boolean';
    });
}

async function getAccessToken(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error('Supabase authentication is not configured in this browser.');
  }
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    throw new Error('Sign in to view and update your saved study plans.');
  }
  return session.access_token;
}

export default function AdaptiveDailyPlanPage() {
  const [plans, setPlans] = useState<DailyPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [updateError, setUpdateError] = useState('');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      if (!backendUrl) {
        throw new Error('Set NEXT_PUBLIC_BACKEND_URL to connect to the backend.');
      }
      const accessToken = await getAccessToken();
      const response = await fetch(`${backendUrl}/api/v1/platform/daily-plans`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = typeof result === 'object' && result !== null
          ? (result as Record<string, unknown>).detail
          : null;
        throw new Error(typeof detail === 'string' ? detail : 'Unable to load your saved plans.');
      }
      if (!Array.isArray(result) || !result.every(isDailyPlan)) {
        throw new Error('The server returned an invalid daily-plan response.');
      }
      setPlans(result);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load your saved plans.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadPlans);
  }, [loadPlans]);

  const refreshPlans = () => {
    setIsLoading(true);
    setLoadError('');
    void loadPlans();
  };

  const updateTask = async (planId: string, task: DailyPlanTask) => {
    setUpdatingTaskId(task.id);
    setUpdateError('');
    try {
      if (!backendUrl) {
        throw new Error('Set NEXT_PUBLIC_BACKEND_URL to connect to the backend.');
      }
      const accessToken = await getAccessToken();
      const response = await fetch(
        `${backendUrl}/api/v1/platform/daily-plans/${encodeURIComponent(planId)}/tasks/${encodeURIComponent(task.id)}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ completed: !task.completed }),
        },
      );
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = typeof result === 'object' && result !== null
          ? (result as Record<string, unknown>).detail
          : null;
        throw new Error(typeof detail === 'string' ? detail : 'Unable to save task progress.');
      }
      if (typeof result !== 'object' || result === null || typeof (result as Record<string, unknown>).completed !== 'boolean') {
        throw new Error('The server returned an invalid task update.');
      }
      const completed = (result as Record<string, unknown>).completed as boolean;
      setPlans((previous) => previous.map((plan) => (
        plan.id !== planId
          ? plan
          : {
            ...plan,
            tasks: plan.tasks.map((item) => (
              item.id === task.id ? { ...item, completed } : item
            )),
          }
      )));
    } catch (error) {
      setUpdateError(error instanceof Error ? error.message : 'Unable to save task progress.');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const allTasks = plans.flatMap((plan) => plan.tasks);
  const completedCount = allTasks.filter((task) => task.completed).length;
  const progressPercent = allTasks.length
    ? Math.round((completedCount / allTasks.length) * 100)
    : 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-400" />
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Daily Study Plans</h1>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Your saved plans and task progress, loaded from your account.
            </p>
          </div>
          <button
            type="button"
            onClick={refreshPlans}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-navy-900 px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-60"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh plans
          </button>
        </div>

        {isLoading && (
          <div role="status" aria-live="polite" className="mt-8 flex items-center gap-2 rounded-xl border border-slate-800 bg-navy-900/60 p-5 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            Loading your saved study plans...
          </div>
        )}

        {loadError && (
          <div role="alert" className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
            <span>{loadError}</span>
            <button type="button" onClick={refreshPlans} className="rounded-lg border border-rose-400/30 px-3 py-1.5 font-semibold hover:bg-rose-500/10">
              Retry
            </button>
          </div>
        )}

        {!isLoading && !loadError && plans.length === 0 && (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-navy-900/60 p-8 text-center">
            <Calendar className="mx-auto h-8 w-8 text-indigo-400" />
            <h2 className="mt-3 text-base font-semibold text-white">No saved study plans yet</h2>
            <p className="mt-2 text-sm text-slate-400">
              Plans appear here after they are created for your account. Browse the real problem catalog in the meantime.
            </p>
            <Link href="/problems" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500">
              Browse problems <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}

        {!isLoading && !loadError && plans.length > 0 && (
          <>
            <section aria-label="Task progress" className="mt-8 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-navy-900/90 via-navy-900 to-indigo-950/40 p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Saved task progress</span>
                  <p className="mt-1 text-2xl font-extrabold text-white">
                    {completedCount} of {allTasks.length} tasks complete
                  </p>
                </div>
                <div className="w-full space-y-1.5 sm:w-64">
                  <div className="flex justify-between text-xs font-mono text-slate-300">
                    <span>Completion</span>
                    <span className="font-bold text-teal-400">{progressPercent}%</span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full bg-gradient-to-r from-indigo-500 to-teal-400 transition-all" style={{ width: `${progressPercent}%` }} />
                  </div>
                </div>
              </div>
            </section>

            {updateError && (
              <div role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
                {updateError}
              </div>
            )}

            <div className="mt-8 space-y-8">
              {plans.map((plan) => (
                <section key={plan.id} className="space-y-3">
                  <div>
                    <h2 className="text-sm font-bold text-white">{plan.plan_name}</h2>
                    {plan.summary && <p className="mt-1 text-xs text-slate-400">{plan.summary}</p>}
                    <p className="mt-1 text-[11px] text-slate-500">
                      {new Date(plan.created_at).toLocaleDateString()} · {plan.status}
                    </p>
                  </div>
                  {plan.tasks.length === 0 ? (
                    <p className="rounded-xl border border-slate-800 bg-navy-900/40 p-4 text-xs text-slate-400">
                      This plan has no tasks yet.
                    </p>
                  ) : plan.tasks.map((task) => (
                    <article
                      key={task.id}
                      className={`flex flex-col gap-4 rounded-2xl border p-5 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                        task.completed
                          ? 'border-slate-800/60 bg-navy-950/40 opacity-75'
                          : 'border-slate-800 bg-navy-900/60 hover:border-indigo-500/40'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <button
                          type="button"
                          onClick={() => void updateTask(plan.id, task)}
                          disabled={updatingTaskId !== null}
                          aria-label={task.completed ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
                          className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border transition-colors disabled:cursor-wait ${
                            task.completed
                              ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                              : 'border-slate-700 bg-slate-800/40 text-transparent hover:border-slate-500'
                          }`}
                        >
                          {updatingTaskId === task.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-300" />
                            : <CheckCircle2 className="h-4 w-4" />}
                        </button>
                        <div>
                          <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-300">
                            {task.task_type}
                          </span>
                          <h3 className={`mt-2 text-sm font-bold ${task.completed ? 'text-slate-400 line-through' : 'text-white'}`}>
                            {task.title}
                          </h3>
                          {task.description && <p className="mt-1 text-xs text-slate-400">{task.description}</p>}
                        </div>
                      </div>
                      <Link
                        href={task.task_type === 'mentor' ? '/mentor' : task.task_type === 'assessment' ? '/assessment' : '/problems'}
                        className="flex items-center gap-1.5 self-start rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-indigo-600 hover:text-white sm:self-auto"
                      >
                        Open activity <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </article>
                  ))}
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
