'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Cpu,
  Server,
  Database,
  Users,
  Layers,
  Activity,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatsCard } from '@/components/ui/StatsCard';
import { SimulationBanner } from '@/components/ui/SimulationBanner';

export default function AdminDashboardPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleAction = (actionName: string) => {
    setToastMessage(`Executed: ${actionName}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setToastMessage('System telemetry updated successfully.');
      setTimeout(() => setToastMessage(null), 3000);
    }, 500);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SimulationBanner featureName="Administrator Infrastructure Health Monitor" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">System Administration</h1>
              <span className="rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-400 border border-rose-500/30">
                Root Admin Mode
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Platform telemetry, Judge0 CE execution queues, and problem bank curation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-navy-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-rose-400' : ''}`} />
              <span>Poll Status</span>
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

        {/* Notification Toast */}
        {toastMessage && (
          <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top KPIs */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Users"
            value="1,248"
            subtitle="1,180 Students • 68 Faculty"
            icon={Users}
            accentColor="indigo"
          />
          <StatsCard
            title="Problem Bank Size"
            value="58 Active"
            subtitle="4 Pending Authoring Review"
            icon={Layers}
            accentColor="teal"
          />
          <StatsCard
            title="Judge0 CE Executions"
            value="24,190"
            subtitle="Avg sandbox latency: 124ms"
            icon={Cpu}
            trend={{ value: '99.98% Uptime', isPositive: true }}
            accentColor="indigo"
          />
          <StatsCard
            title="Classifier Accuracy"
            value="94.2%"
            subtitle="Scikit-learn Error Model v1.2"
            icon={Activity}
            accentColor="teal"
          />
        </div>

        {/* Infrastructure Nodes & Sandbox Health */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Infrastructure Health Status */}
          <div className="rounded-2xl border border-slate-800 bg-navy-900/60 p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Modular Subsystem Status</h3>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                All Systems Operational
              </span>
            </div>

            <div className="space-y-3">
              {[
                { name: 'Judge0 CE Sandboxes (Isolated Containers)', status: 'Healthy', latency: '42ms', load: '18% Capacity', icon: Cpu },
                { name: 'Supabase PostgreSQL & pgvector (DB)', status: 'Healthy', latency: '12ms', load: '24 Conns', icon: Database },
                { name: 'Scikit-learn Error Classification Engine', status: 'Healthy', latency: '19ms', load: 'Model v1.2', icon: Activity },
                { name: 'LLM Agent Guardrails & Backend Tool Proxy', status: 'Healthy', latency: '210ms', load: 'Active', icon: Server },
              ].map((sys, idx) => {
                const Icon = sys.icon;
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
                        <p className="text-[11px] text-slate-400 mt-0.5">Telemetry: {sys.load}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                        {sys.status}
                      </span>
                      <span className="block text-[10px] text-slate-500 font-mono mt-0.5">{sys.latency}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Management Actions & Rules Audit */}
          <div className="rounded-2xl border border-slate-800 bg-navy-900/60 p-6 backdrop-blur-md space-y-5">
            <h3 className="text-sm font-bold text-white">Administrative Actions & Security Gates</h3>
            <p className="text-xs text-slate-400">
              Strict controls enforcing AGENTS.md rules: no student code runs unsandboxed, and test cases stay hidden.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Link
                href="/admin/problems/new"
                className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-600/20 p-3.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/30 transition-colors"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Author Problem Variant</span>
              </Link>

              <button
                onClick={() => handleAction('Purged Sandbox Temp Files')}
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-navy-950 p-3.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Flush Sandbox Queue</span>
              </button>

              <Link
                href="/admin/problems"
                className="flex items-center gap-2 rounded-xl border border-slate-700 bg-navy-950 p-3.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <Layers className="h-4 w-4" />
                <span>Manage Problem Bank</span>
              </Link>

              <button
                onClick={() => handleAction('Audited ML Classifier Accuracy against 500 test traces')}
                className="flex items-center gap-2 rounded-xl border border-teal-500/30 bg-teal-500/10 p-3.5 text-xs font-semibold text-teal-300 hover:bg-teal-500/20 transition-colors"
              >
                <Activity className="h-4 w-4" />
                <span>Run Model Sanity Check</span>
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-navy-950 p-4 text-[11px] text-slate-400 space-y-1.5">
              <span className="font-bold text-slate-200 block">Security Policy Checklist (Rule 11-15):</span>
              <p>✓ Untrusted student code is hard-routed to Judge0 CE sandboxes.</p>
              <p>✓ Hidden test cases are never transmitted to client bundles.</p>
              <p>✓ Debugging variants require pre-verification by test harness before publishing.</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
