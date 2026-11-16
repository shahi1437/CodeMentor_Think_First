'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  History,
  Code2,
  Bug,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Search,
  Filter,
  ArrowRight,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SimulationBanner } from '@/components/ui/SimulationBanner';
import { MOCK_SUBMISSIONS } from '@/lib/mock-data';
import { SubmissionRecord } from '@/types';

export default function LearningHistoryPage() {
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>(MOCK_SUBMISSIONS);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'coding' | 'debugging'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSub, setSelectedSub] = useState<SubmissionRecord | null>(null);

  const filtered = submissions.filter((s) => {
    const matchesMode =
      selectedFilter === 'all' ||
      (selectedFilter === 'coding' && s.mode === 'normal') ||
      (selectedFilter === 'debugging' && s.mode === 'debugging');

    const matchesSearch =
      s.problemTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.language.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.status.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesMode && matchesSearch;
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SimulationBanner featureName="Audit Trail & Submission History" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Learning History</h1>
              <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/30">
                {submissions.length} Total Runs Logged
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Complete historical record of algorithm submissions, test outputs, and debugging diagnoses.
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-navy-900/60 p-4 backdrop-blur-md">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by problem title, language, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-navy-950 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Filter Mode:</span>
            <button
              onClick={() => setSelectedFilter('all')}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                selectedFilter === 'all' ? 'bg-indigo-600 text-white font-bold' : 'bg-navy-950 text-slate-400 hover:text-white'
              }`}
            >
              All ({submissions.length})
            </button>
            <button
              onClick={() => setSelectedFilter('coding')}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                selectedFilter === 'coding' ? 'bg-indigo-600 text-white font-bold' : 'bg-navy-950 text-slate-400 hover:text-white'
              }`}
            >
              Normal Coding
            </button>
            <button
              onClick={() => setSelectedFilter('debugging')}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                selectedFilter === 'debugging' ? 'bg-amber-600 text-white font-bold' : 'bg-navy-950 text-slate-400 hover:text-white'
              }`}
            >
              Debugging Lab
            </button>
          </div>
        </div>

        {/* Submissions Table / Empty State */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-navy-900/60 overflow-hidden backdrop-blur-md">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <History className="mx-auto h-8 w-8 text-slate-500 mb-2" />
              <p className="text-sm font-semibold text-slate-300">No submissions found</p>
              <p className="mt-1">Try modifying your filter or search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-800 bg-navy-950 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Problem</th>
                    <th className="py-3 px-4">Mode</th>
                    <th className="py-3 px-4">Language</th>
                    <th className="py-3 px-4">Verdict Status</th>
                    <th className="py-3 px-4">Passed Tests</th>
                    <th className="py-3 px-4">Runtime / Mem</th>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">
                        <Link
                          href={s.mode === 'debugging' ? `/workspace/debugging/${s.problemId}` : `/workspace/coding/${s.problemId}`}
                          className="hover:text-indigo-300"
                        >
                          {s.problemTitle}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                            s.mode === 'debugging'
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                          }`}
                        >
                          {s.mode === 'debugging' ? '🐞 Bug Lab' : '💻 Normal'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{s.language}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            s.status === 'Accepted' || s.status === 'Bug Found'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {s.status === 'Accepted' || s.status === 'Bug Found' ? '✓' : '✗'} {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {s.passedCount} / {s.totalCount} tests
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                        {s.runtimeMs}ms / {s.memoryMb}MB
                      </td>
                      <td className="py-3 px-4 text-slate-500">{s.submittedAt}</td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={s.mode === 'debugging' ? `/workspace/debugging/${s.problemId}` : `/workspace/coding/${s.problemId}`}
                          className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                        >
                          Re-open →
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
