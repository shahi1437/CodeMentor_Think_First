'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, BookOpen, GraduationCap, Loader2, RefreshCw, Users } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface TeacherCourse {
  id: string;
  title: string;
  code: string | null;
  description: string | null;
  is_published: boolean;
  active_enrollment_count: number;
}

interface TeacherSummary {
  courses: TeacherCourse[];
}

const backendUrl = process.env.NEXT_PUBLIC_API_URL
  || process.env.NEXT_PUBLIC_BACKEND_URL
  || '';

function isTeacherSummary(value: unknown): value is TeacherSummary {
  if (typeof value !== 'object' || value === null || !Array.isArray((value as Record<string, unknown>).courses)) {
    return false;
  }
  return (value as { courses: unknown[] }).courses.every((course) => {
    if (typeof course !== 'object' || course === null) return false;
    const record = course as Record<string, unknown>;
    return typeof record.id === 'string'
      && typeof record.title === 'string'
      && (typeof record.code === 'string' || record.code === null)
      && (typeof record.description === 'string' || record.description === null)
      && typeof record.is_published === 'boolean'
      && typeof record.active_enrollment_count === 'number';
  });
}

export default function TeacherDashboardPage() {
  const [summary, setSummary] = useState<TeacherSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadSummary = useCallback(async () => {
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
        throw new Error('Sign in with a teacher account to view your courses.');
      }

      const response = await fetch(`${backendUrl}/api/v1/platform/dashboard-summary`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: 'no-store',
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = typeof body === 'object' && body !== null
          ? (body as Record<string, unknown>).detail
          : null;
        throw new Error(typeof detail === 'string' ? detail : `Course request failed (${response.status}).`);
      }
      if (!isTeacherSummary(body)) {
        throw new Error('The backend returned invalid course summary data.');
      }
      setSummary(body);
      setErrorMessage('');
    } catch (error) {
      setSummary(null);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load your courses.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadSummary);
  }, [loadSummary]);

  const refreshSummary = () => {
    setIsLoading(true);
    setErrorMessage('');
    void loadSummary();
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-7 w-7 text-teal-400" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Teacher courses</h1>
              <p className="mt-1 text-xs text-slate-400">
                Course details and active enrollment counts from your account.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshSummary}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-navy-900 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {isLoading && (
          <div role="status" aria-live="polite" className="mt-8 flex items-center gap-2 rounded-xl border border-slate-800 bg-navy-900/60 p-5 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            Loading your persisted course data...
          </div>
        )}

        {errorMessage && (
          <div role="alert" className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
            <span>{errorMessage}</span>
            <button type="button" onClick={refreshSummary} className="rounded-lg border border-rose-400/30 px-3 py-1.5 font-semibold hover:bg-rose-500/10">
              Retry
            </button>
          </div>
        )}

        {!isLoading && !errorMessage && summary && (
          summary.courses.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-slate-800 bg-navy-900/60 p-8 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-slate-500" />
              <h2 className="mt-3 text-sm font-bold text-white">No courses assigned</h2>
              <p className="mt-1 text-xs text-slate-400">
                Courses created by or assigned to your teacher account will appear here.
              </p>
            </div>
          ) : (
            <>
              <p className="mt-6 text-xs text-slate-400">
                These summaries do not include student-level activity or learning analytics.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {summary.courses.map((course) => (
                  <article key={course.id} className="rounded-2xl border border-slate-800 bg-navy-900/60 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-sm font-bold text-white">{course.title}</h2>
                        {course.code && <p className="mt-1 text-xs font-mono text-slate-400">{course.code}</p>}
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                        course.is_published
                          ? 'border-teal-500/30 bg-teal-500/10 text-teal-300'
                          : 'border-slate-700 bg-slate-800 text-slate-400'
                      }`}>
                        {course.is_published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    {course.description && (
                      <p className="mt-3 text-xs leading-relaxed text-slate-400">{course.description}</p>
                    )}
                    <div className="mt-5 flex items-center gap-2 border-t border-slate-800 pt-4 text-xs text-slate-300">
                      <Users className="h-4 w-4 text-indigo-400" />
                      <span>{course.active_enrollment_count} active {course.active_enrollment_count === 1 ? 'enrollment' : 'enrollments'}</span>
                    </div>
                  </article>
                ))}
              </div>
              <div className="mt-6 flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-xs text-amber-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Student struggle alerts, class mastery metrics, and hint delivery are not implemented. This page reports only persisted course and enrollment data.
                </p>
              </div>
            </>
          )
        )}
      </div>
    </AppShell>
  );
}
