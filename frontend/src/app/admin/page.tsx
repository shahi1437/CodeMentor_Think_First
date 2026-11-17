'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Cpu,
  Server,
  Database,
  Users,
  Layers,
  Activity,
  PlusCircle,
  RefreshCw,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatsCard } from '@/components/ui/StatsCard';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type AdminDashboardSummary = {
  metrics: {
    total_users: number;
    students: number;
    teachers: number;
    published_problems: number;
    submissions: number;
    published_courses: number;
  };
  integrations: {
    database: string;
    judge0: string;
    llm: string;
  };
};

function isAdminDashboardSummary(value: unknown): value is AdminDashboardSummary {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  const metrics = record.metrics;
  const integrations = record.integrations;
  if (typeof metrics !== 'object' || metrics === null || typeof integrations !== 'object' || integrations === null) {
    return false;
  }

  const metricValues = metrics as Record<string, unknown>;
  const integrationValues = integrations as Record<string, unknown>;
  return ['total_users', 'students', 'teachers', 'published_problems', 'submissions', 'published_courses']
    .every((key) => typeof metricValues[key] === 'number')
    && ['database', 'judge0', 'llm'].every((key) => typeof integrationValues[key] === 'string');
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        throw new Error('Supabase authentication is not configured in this browser.');
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session?.access_token) {
        throw new Error('Sign in again to load administrator metrics.');
      }

      const backendUrl = process.env.NEXT_PUBLIC_API_URL
        || process.env.NEXT_PUBLIC_BACKEND_URL
        || '';
      if (!backendUrl) {
        throw new Error('Set NEXT_PUBLIC_BACKEND_URL to connect to the backend.');
      }

      const response = await fetch(`${backendUrl}/api/v1/platform/admin/dashboard-summary`, {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail || 'Unable to load administrator metrics.');
      }
      if (!isAdminDashboardSummary(payload)) {
        throw new Error('The backend returned an invalid administrator metrics response.');
      }
      setSummary(payload);
    } catch (loadError) {
      setSummary(null);
      setError(loadError instanceof Error ? loadError.message : 'Unable to load administrator metrics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">System Administration</h1>
              <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/30">
                Administrator View
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Database-backed platform counts and external-service configuration.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadSummary()}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-navy-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-rose-400' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
            <Link
              href="/admin/problems/new"
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:bg-indigo-500 transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              <span>New Problem Studio</span>
            </Link>
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-5 flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-200">
            <p>{error}</p>
            <button onClick={() => void loadSummary()} className="ml-4 font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {/* Top KPIs */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Users"
            value={summary?.metrics.total_users ?? (isLoading ? '…' : '—')}
            subtitle={summary ? `${summary.metrics.students} students • ${summary.metrics.teachers} teachers` : 'Live profile count'}
            icon={Users}
            accentColor="indigo"
          />
          <StatsCard
            title="Published Problems"
            value={summary?.metrics.published_problems ?? (isLoading ? '…' : '—')}
            subtitle="Published records in Supabase"
            icon={Layers}
            accentColor="teal"
          />
          <StatsCard
            title="Submissions"
            value={summary?.metrics.submissions ?? (isLoading ? '…' : '—')}
            subtitle="Persisted submission records"
            icon={Activity}
            accentColor="indigo"
          />
          <StatsCard
            title="Published Courses"
            value={summary?.metrics.published_courses ?? (isLoading ? '…' : '—')}
            subtitle="Published course records"
            icon={Users}
            accentColor="teal"
          />
        </div>

        {/* Infrastructure Nodes & Sandbox Health */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Infrastructure Health Status */}
          <div className="rounded-2xl border border-slate-800 bg-navy-900/60 p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Service Configuration</h3>
              <span className="text-[11px] text-slate-400">Configuration is not a live health check</span>
            </div>

            <div className="space-y-3">
              {[
                { name: 'Supabase PostgreSQL', status: summary?.integrations.database, note: 'Backend credentials configured', icon: Database },
                { name: 'Judge0 CE', status: summary?.integrations.judge0, note: 'Execution provider configuration', icon: Cpu },
                { name: 'LLM provider', status: summary?.integrations.llm, note: 'Mentor provider configuration', icon: Server },
              ].map((sys, idx) => {
                const Icon = sys.icon;
                const configured = sys.status === 'configured';
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-navy-950 p-3.5 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-semibold text-white">{sys.name}</span>
                        <p className="text-[11px] text-slate-400 mt-0.5">{sys.note}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${configured ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/60 text-slate-300'}`}>
                        {sys.status || (isLoading ? 'checking' : 'unknown')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Management Actions */}
          <div className="rounded-2xl border border-slate-800 bg-navy-900/60 p-6 backdrop-blur-md space-y-5">
            <h3 className="text-sm font-bold text-white">Problem Bank Management</h3>
            <p className="text-xs text-slate-400">
              Create and review problem records using the existing administrative screens.
            </p>

            <div className="grid grid-cols-1 gap-3 pt-1">
              <Link
                href="/admin/problems/new"
                className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-600/20 p-3.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/30 transition-colors"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Author Problem Variant</span>
              </Link>
              <Link
                href="/admin/problems"
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-navy-950 p-3.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <Layers className="h-4 w-4" />
                <span>Manage Problem Bank</span>
              </Link>
            </div>

            <div className="rounded-xl border border-slate-800 bg-navy-950 p-4 text-[11px] text-slate-400 space-y-1.5">
              <span className="font-bold text-slate-200 block">Data notes</span>
              <p>Metrics are database counts, not platform uptime or execution telemetry.</p>
              <p>External service labels indicate configuration only; live checks are not performed here.</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
