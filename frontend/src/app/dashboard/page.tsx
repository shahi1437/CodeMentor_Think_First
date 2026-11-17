'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Code2,
  Bug,
  Flame,
  Dna,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatsCard } from '@/components/ui/StatsCard';
import { SimulationBanner } from '@/components/ui/SimulationBanner';
import { MOCK_DNA_PROFILE, MOCK_DAILY_TASKS, MOCK_SUBMISSIONS } from '@/lib/mock-data';

export default function StudentDashboardPage() {
  const [filterState, setFilterState] = useState<'all' | 'accepted' | 'errors'>('all');
  const [submissions, setSubmissions] = useState(MOCK_SUBMISSIONS);
  const [isLoading, setIsLoading] = useState(false);

  const filteredSubmissions = submissions.filter((s) => {
    if (filterState === 'accepted') return s.status === 'Accepted' || s.status === 'Bug Found';
    if (filterState === 'errors') return s.status === 'Wrong Answer' || s.status === 'Time Limit Exceeded';
    return true;
  });

  const simulateRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 600);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SimulationBanner featureName="Student Activity Engine" />

        {/* Welcome Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Welcome back, {MOCK_DNA_PROFILE.studentName}
              </h1>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/30">
                Active Student
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Your overall programming mastery is <strong className="text-teal-400 font-bold">{MOCK_DNA_PROFILE.overallMastery}%</strong>. Keep up your {MOCK_DNA_PROFILE.streakDays}-day momentum!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={simulateRefresh}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-navy-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Refresh Stats</span>
            </button>
            <Link
              href="/assessment"
              className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-500 transition-colors shadow-md"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Retake Diagnostic</span>
            </Link>
          </div>
        </div>

        {/* Key KPI Stats Grid */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Problems Solved"
            value={MOCK_DNA_PROFILE.totalProblemsSolved}
            subtitle="Standard algorithm challenges"
            icon={Code2}
            trend={{ value: '12% this week', isPositive: true }}
            accentColor="indigo"
          />
          <StatsCard
            title="Bugs Diagnosed"
            value={MOCK_DNA_PROFILE.totalBugsDiagnosed}
            subtitle="Seeded faulty variants repaired"
            icon={Bug}
            trend={{ value: '5 new this week', isPositive: true }}
            accentColor="amber"
          />
          <StatsCard
            title="Learning Streak"
            value={`${MOCK_DNA_PROFILE.streakDays} Days`}
            subtitle="Consistency record: 21 days"
            icon={Flame}
            accentColor="teal"
          />
          <StatsCard
            title="Mastery Score"
            value={`${MOCK_DNA_PROFILE.overallMastery}%`}
            subtitle="Calculated across 5 core topics"
            icon={TrendingUp}
            trend={{ value: '+4% overall', isPositive: true }}
            accentColor="indigo"
          />
        </div>

        {/* Middle Two-Column Section: Today's Action & Learning DNA Preview */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Today's Adaptive Action (2 cols on large) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-navy-900/90 to-indigo-950/40 p-6 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <span className="rounded bg-indigo-500/20 px-2.5 py-0.5 text-[11px] font-bold text-indigo-300 border border-indigo-500/30 uppercase tracking-wide">
                  Top Recommended Challenge
                </span>
                <span className="text-xs text-slate-400">Targeting: Off-by-one errors</span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-white">Off-by-One in Binary Search</h3>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed max-w-xl">
                Your Learning DNA detected an elevated frequency of boundary condition miscalculations. Diagnosing this medium-level binary search flaw will strengthen your pointer instincts.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href="/workspace/debugging/p-3"
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-amber-500 transition-colors"
                >
                  <Bug className="h-3.5 w-3.5" />
                  <span>Start Debugging Challenge</span>
                </Link>
                <Link
                  href="/daily-plan"
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-navy-950 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <span>View Full Daily Plan</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Daily Checklist */}
            <div className="rounded-2xl border border-slate-800 bg-navy-900/60 p-6 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Today&apos;s Adaptive Routine</h3>
                <span className="text-xs text-slate-400">1 of 4 completed</span>
              </div>
              <div className="space-y-2.5">
                {MOCK_DAILY_TASKS.map((task) => (
                  <Link
                    key={task.id}
                    href={task.href}
                    className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-navy-950/60 p-3 hover:border-slate-700 hover:bg-navy-950 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-5 w-5 rounded-md flex items-center justify-center ${
                          task.completed
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'border border-slate-700 bg-slate-800/40 text-slate-500'
                        }`}
                      >
                        {task.completed && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <p className={`text-xs font-medium ${task.completed ? 'text-slate-400 line-through' : 'text-slate-200 group-hover:text-white'}`}>
                          {task.title}
                        </p>
                        <span className="text-[10px] text-slate-500">
                          {task.estimatedMinutes} mins • {task.difficulty} • {task.targetSkill}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Learning DNA Snapshot Card (1 col) */}
          <div className="rounded-2xl border border-slate-800 bg-navy-900/60 p-6 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                    <Dna className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold text-white">Learning DNA</h3>
                </div>
                <Link href="/learning-dna" className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold">
                  Full Analysis →
                </Link>
              </div>

              <p className="mt-3 text-xs text-slate-400">
                Top recurring mistake archetypes diagnosed from your code submissions:
              </p>

              <div className="mt-4 space-y-3">
                {MOCK_DNA_PROFILE.errorArchetypes.slice(0, 3).map((err, i) => (
                  <div key={i} className="rounded-xl border border-slate-800 bg-navy-950/70 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{err.category}</span>
                      <span className="font-mono text-xs text-amber-400">{err.frequency}%</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400 leading-tight">{err.description}</p>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-amber-500"
                        style={{ width: `${err.frequency}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-teal-500/20 bg-teal-500/10 p-3.5 text-xs text-teal-300">
              <strong className="block font-bold text-white mb-0.5">Key Growth Area</strong>
              You reduced loop bounds errors by 32% over the last 7 days.
            </div>
          </div>
        </div>

        {/* Recent Submissions Feed (Handling All 4 UI States) */}
        <div className="mt-8 rounded-2xl border border-slate-800 bg-navy-900/60 p-6 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h3 className="text-sm font-bold text-white">Recent Problem Submissions</h3>
              <p className="text-xs text-slate-400">Real-time log of your coding and bug diagnosis attempts</p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-navy-950 p-1 text-xs">
              <button
                onClick={() => setFilterState('all')}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  filterState === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({submissions.length})
              </button>
              <button
                onClick={() => setFilterState('accepted')}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  filterState === 'accepted' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Passed
              </button>
              <button
                onClick={() => setFilterState('errors')}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  filterState === 'errors' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Errors
              </button>
            </div>
          </div>

          {/* Loading State */}
          {isLoading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-slate-800/40"></div>
              ))}
            </div>
          ) : filteredSubmissions.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-8 w-8 text-slate-500 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No submissions found in this category</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting the filter or solving a new challenge.</p>
              <button
                onClick={() => setFilterState('all')}
                className="mt-4 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Reset Filter
              </button>
            </div>
          ) : (
            /* Success State: Submissions Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="pb-3">Problem Title</th>
                    <th className="pb-3">Learning Mode</th>
                    <th className="pb-3">Language</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Performance</th>
                    <th className="pb-3">Submitted</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredSubmissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 font-semibold text-white">
                        <Link
                          href={sub.mode === 'debugging' ? `/workspace/debugging/${sub.problemId}` : `/workspace/coding/${sub.problemId}`}
                          className="hover:text-indigo-400 transition-colors"
                        >
                          {sub.problemTitle}
                        </Link>
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold border ${
                            sub.mode === 'debugging'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                          }`}
                        >
                          {sub.mode === 'debugging' ? '🐞 Bug Lab' : '💻 Normal'}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-400">{sub.language}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                            sub.status === 'Accepted' || sub.status === 'Bug Found'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {sub.status === 'Accepted' || sub.status === 'Bug Found' ? '✓' : '✗'} {sub.status}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-400 text-[11px]">
                        {sub.runtimeMs}ms / {sub.memoryMb}MB
                      </td>
                      <td className="py-3 text-slate-500">{sub.submittedAt}</td>
                      <td className="py-3 text-right">
                        <Link
                          href={sub.mode === 'debugging' ? `/workspace/debugging/${sub.problemId}` : `/workspace/coding/${sub.problemId}`}
                          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                        >
                          Replay →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
