'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';

export default function AdminProblemStudioPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-6">
          <Link href="/admin/problems" aria-label="Back to problem bank" className="text-slate-400 transition-colors hover:text-white">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Problem authoring</h1>
            <p className="mt-1 text-xs text-slate-400">This workflow is not connected to persisted problem data.</p>
          </div>
        </div>

        <div role="status" className="mt-8 rounded-2xl border border-amber-500/30 bg-amber-950/20 p-6 text-sm text-amber-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
            <div>
              <h2 className="font-semibold text-white">Create and publish are unavailable</h2>
              <p className="mt-2 text-xs leading-relaxed text-amber-100/80">
                This page previously displayed example challenge data and simulated successful validation and publishing. Those actions did not save records or run the test harness, so they have been disabled. No problem, test case, or debugging variant will be created here.
              </p>
              <p className="mt-3 text-xs leading-relaxed text-amber-100/80">
                A safe authoring workflow needs database-backed drafts, hidden-test handling, and real pre-publication verification before it can be enabled.
              </p>
              <Link href="/admin/problems" className="mt-5 inline-flex rounded-lg border border-amber-400/30 px-3 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/10">
                Return to problem bank
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
