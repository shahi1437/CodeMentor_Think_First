'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  PlusCircle,
  Search,
  Code2,
  Bug,
  ChevronLeft,
  CheckCircle2,
  Trash2,
  Edit3,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SimulationBanner } from '@/components/ui/SimulationBanner';
import { SAMPLE_PROBLEMS } from '@/lib/mock-data';

export default function AdminProblemBankPage() {
  const [problems, setProblems] = useState(SAMPLE_PROBLEMS);
  const [search, setSearch] = useState('');

  const filtered = problems.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SimulationBanner featureName="Administrator Problem Bank Manager" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Problem Bank Repository</h1>
              <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/30">
                {problems.length} Registered Problems
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Review published challenges, verify hidden test suites, and manage debugging lab variants.
            </p>
          </div>

          <Link
            href="/admin/problems/new"
            className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-500 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create New Challenge</span>
          </Link>
        </div>

        {/* Search */}
        <div className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-navy-900/60 p-4 backdrop-blur-md">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search problem title or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-navy-950 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Showing {filtered.length} of {problems.length}
          </span>
        </div>

        {/* Table */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-navy-900/60 overflow-hidden backdrop-blur-md">
          <table className="w-full text-left text-xs text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 bg-navy-950 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Difficulty</th>
                <th className="py-3 px-4">Acceptance</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-3 px-4 font-bold text-white">
                    <Link
                      href={p.mode === 'debugging' ? `/workspace/debugging/${p.id}` : `/workspace/coding/${p.id}`}
                      className="hover:text-indigo-400"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                        p.mode === 'debugging'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                      }`}
                    >
                      {p.mode === 'debugging' ? '🐞 Bug Lab' : '💻 Normal'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-400">{p.category}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        p.difficulty === 'Easy'
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : p.difficulty === 'Medium'
                          ? 'text-amber-400 bg-amber-500/10'
                          : 'text-rose-400 bg-rose-500/10'
                      }`}
                    >
                      {p.difficulty}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">{p.acceptanceRate}%</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/problems/new`}
                        className="rounded p-1 text-slate-400 hover:text-white"
                        title="Edit problem definition"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => alert(`Problem "${p.title}" deleted in simulation mode.`)}
                        className="rounded p-1 text-slate-400 hover:text-rose-400"
                        title="Delete problem"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
