'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Bug,
  Code2,
  BookOpen,
  Zap,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SimulationBanner } from '@/components/ui/SimulationBanner';
import { MOCK_DAILY_TASKS } from '@/lib/mock-data';
import { DailyTask } from '@/types';

export default function AdaptiveDailyPlanPage() {
  const [tasks, setTasks] = useState<DailyTask[]>(MOCK_DAILY_TASKS);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100);
  const totalMinutes = tasks.reduce((acc, t) => acc + t.estimatedMinutes, 0);

  const toggleTask = (id: string) => {
    setTasks(
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleRegenerate = () => {
    setIsRegenerating(true);
    setTimeout(() => {
      setIsRegenerating(false);
    }, 600);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <SimulationBanner featureName="Adaptive Daily Curriculum Engine" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Adaptive Daily Plan</h1>
              <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-400 border border-teal-500/30">
                Personalized Schedule
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Curated based on your most frequent Learning DNA error archetype (Off-by-one bounds & state mutation).
            </p>
          </div>

          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-navy-900 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin text-teal-400' : ''}`} />
            <span>Regenerate Today&apos;s Plan</span>
          </button>
        </div>

        {/* Progress Overview Card */}
        <div className="mt-8 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-navy-900/90 via-navy-900 to-indigo-950/40 p-6 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                Today&apos;s Milestone Progress
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">{completedCount} of {tasks.length}</span>
                <span className="text-xs text-slate-400">tasks finished ({progressPercent}%)</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Estimated study commitment today: <strong className="text-slate-200">{totalMinutes} minutes</strong>
              </p>
            </div>

            <div className="w-full sm:w-64 space-y-1.5">
              <div className="flex justify-between text-xs font-mono text-slate-300">
                <span>Completion</span>
                <span className="text-teal-400 font-bold">{progressPercent}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Task Cards List */}
        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Scheduled Tasks</h3>

          {tasks.map((task, idx) => (
            <div
              key={task.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border p-5 backdrop-blur-md transition-all gap-4 ${
                task.completed
                  ? 'border-slate-800/60 bg-navy-950/40 opacity-70'
                  : 'border-slate-800 bg-navy-900/60 hover:border-indigo-500/40'
              }`}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`mt-1 flex h-6 w-6 items-center justify-center rounded-lg border transition-all ${
                    task.completed
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                      : 'border-slate-700 bg-slate-800/40 text-transparent hover:border-slate-500'
                  }`}
                  title={task.completed ? 'Mark incomplete' : 'Mark completed'}
                >
                  <CheckCircle2 className="h-4 w-4 fill-emerald-400 text-navy-950" />
                </button>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${
                        task.type === 'debugging'
                          ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                          : task.type === 'coding'
                          ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                          : 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                      }`}
                    >
                      {task.type}
                    </span>

                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" /> {task.estimatedMinutes} mins
                    </span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">Target: {task.targetSkill}</span>
                  </div>

                  <h4 className={`text-sm font-bold ${task.completed ? 'text-slate-400 line-through' : 'text-white'}`}>
                    {task.title}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={task.href}
                  className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-indigo-600 hover:text-white transition-colors"
                >
                  <span>Launch Task</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
