'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Users,
  AlertTriangle,
  TrendingUp,
  Brain,
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatsCard } from '@/components/ui/StatsCard';
import { SimulationBanner } from '@/components/ui/SimulationBanner';
import { MOCK_TEACHER_COHORT } from '@/lib/mock-data';

export default function TeacherDashboardPage() {
  const [cohort, setCohort] = useState(MOCK_TEACHER_COHORT);
  const [alertSent, setAlertSent] = useState<string | null>(null);

  const handleSendHint = (studentId: string, studentName: string) => {
    setAlertSent(studentName);
    setTimeout(() => setAlertSent(null), 3000);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SimulationBanner featureName="Teacher Real-Time Cohort Analytics & Struggle Radar" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Teacher Cohort Radar</h1>
              <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-400 border border-teal-500/30">
                Instructor Mode
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Active Course: <strong className="text-white font-medium">{cohort.courseName}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select className="rounded-xl border border-slate-700 bg-navy-900 px-3 py-1.5 text-xs text-slate-200 outline-none hover:border-slate-600">
              <option>CS 102: Data Structures (Fall 2026)</option>
              <option>CS 201: Algorithms & Complexity</option>
              <option>CS 101: Intro to Python</option>
            </select>
          </div>
        </div>

        {/* Top KPI Cards */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Enrolled Students"
            value={cohort.totalStudents}
            subtitle={`${cohort.activeToday} students coding today`}
            icon={Users}
            accentColor="indigo"
          />
          <StatsCard
            title="Students Currently Stuck"
            value={cohort.stuckStudentsCount}
            subtitle="Inactive or failing > 15 mins"
            icon={AlertTriangle}
            accentColor="rose"
          />
          <StatsCard
            title="Average Class Mastery"
            value={`${cohort.averageMastery}%`}
            subtitle="+3.5% vs previous assignment"
            icon={TrendingUp}
            accentColor="teal"
          />
          <StatsCard
            title="Diagnostic Health"
            value="Optimal"
            subtitle="No sandbox queue delays"
            icon={GraduationCap}
            accentColor="indigo"
          />
        </div>

        {/* Alert Feedback Banner */}
        {alertSent && (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-xs text-emerald-300 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Socratic Hint dispatched to <strong className="text-white">{alertSent}</strong>'s workspace.</span>
            </div>
            <span className="text-[11px] text-slate-400">Notification sent</span>
          </div>
        )}

        {/* Main Grid: Student Struggle Radar & Class Error Patterns */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Struggle Radar (2 cols) */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-navy-900/60 p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-400">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Live Student Struggle Radar</h3>
                  <p className="text-xs text-slate-400">Students facing recurring test failures or stalled progress</p>
                </div>
              </div>
              <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-400 border border-rose-500/20">
                {cohort.strugglingStudents.length} Flagged
              </span>
            </div>

            <div className="space-y-3 pt-2">
              {cohort.strugglingStudents.map((st) => (
                <div
                  key={st.id}
                  className="rounded-xl border border-slate-800 bg-navy-950 p-4 space-y-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-white">{st.name}</h4>
                      <p className="text-[11px] text-slate-400">
                        Challenge: <strong className="text-slate-200">{st.currentProblem}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="rounded bg-rose-500/10 px-2 py-0.5 text-rose-400 font-mono">
                        {st.timeSpentMinutes} mins elapsed
                      </span>
                      <span className="rounded bg-amber-500/10 px-2 py-0.5 text-amber-400 font-mono">
                        {st.failedAttempts} failed attempts
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-navy-900 p-2.5 text-[11px] text-slate-300 border border-slate-800/80 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-teal-400">Pedagogical Suggestion: </span>
                      {st.recommendedIntervention}
                    </div>

                    <button
                      onClick={() => handleSendHint(st.id, st.name)}
                      className="flex-shrink-0 flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1 text-[11px] font-bold text-white hover:bg-teal-500 transition-colors"
                    >
                      <Send className="h-3 w-3" />
                      <span>Send Hint</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Class-Wide Error Patterns */}
          <div className="rounded-2xl border border-slate-800 bg-navy-900/60 p-6 backdrop-blur-md space-y-5">
            <div>
              <h3 className="text-sm font-bold text-white">Class-Wide Error Patterns</h3>
              <p className="text-xs text-slate-400">Most frequent misconceptions across the current cohort</p>
            </div>

            <div className="space-y-4">
              {cohort.topClassErrors.map((err, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">{err.errorType}</span>
                    <span className="font-mono text-xs text-white">{err.studentCount} students</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${(err.studentCount / cohort.totalStudents) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4 text-xs text-indigo-300 space-y-2">
              <strong className="block font-bold text-white">Teacher Recommendation</strong>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                45% of students struggle with loop boundary conditions on Binary Search. Consider scheduling a 10-minute live code walkthrough on pointer invariants.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
