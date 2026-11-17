'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Brain,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatsCard } from '@/components/ui/StatsCard';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface LearningDNA {
  user_id: string;
  mastery: Record<string, number>;
  streak_days: number;
  consistency: number;
  daily_plan: string[];
  submission_count: number;
  accepted_submission_count: number;
  problems_solved: number;
  error_categories: Record<string, number>;
  activity_days: number;
  has_data: boolean;
}

export default function LearningDNAPage() {
  const [profile, setProfile] = useState<LearningDNA | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        throw new Error('Supabase authentication is not configured.');
      }
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('Sign in to view your Learning DNA profile.');
      }

      const backendUrl = process.env.NEXT_PUBLIC_API_URL
        || process.env.NEXT_PUBLIC_BACKEND_URL
        || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/api/v1/platform/learning-dna`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.detail || `Unable to load Learning DNA (${response.status}).`);
      }
      setProfile(result as LearningDNA);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load your Learning DNA profile.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const overallAcceptedRate = profile && profile.submission_count > 0
    ? Math.round((profile.accepted_submission_count / profile.submission_count) * 100)
    : 0;
  const errorCategories = Object.entries(profile?.error_categories ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Learning DNA Profile</h1>
              <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/30">
                Submission-based profile
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Performance summaries are calculated from your persisted coding submissions.
            </p>
          </div>

          <button
            onClick={() => void loadProfile()}
            disabled={isLoading}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-navy-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Refresh activity</span>
          </button>
        </div>

        {isLoading && (
          <div role="status" aria-live="polite" className="mt-8 flex items-center gap-2 rounded-xl border border-slate-800 bg-navy-900/60 p-5 text-sm text-slate-300">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
            Loading your persisted submission activity...
          </div>
        )}

        {errorMessage && (
          <div role="alert" className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
            <span>{errorMessage}</span>
            <button onClick={() => void loadProfile()} className="rounded-lg border border-rose-400/30 px-3 py-1.5 font-semibold hover:bg-rose-500/10">
              Retry
            </button>
          </div>
        )}

        {!isLoading && !errorMessage && profile && !profile.has_data && (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-navy-900/60 p-8 text-center">
            <Brain className="mx-auto h-8 w-8 text-indigo-400" />
            <h2 className="mt-3 text-base font-semibold text-white">Your Learning DNA is ready to grow</h2>
            <p className="mt-2 text-sm text-slate-400">
              There are no persisted submissions to analyze yet. Submit a coding solution to start building this profile.
            </p>
          </div>
        )}

        {!isLoading && !errorMessage && profile?.has_data && (
          <>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
              <StatsCard
                title="Accepted Submission Rate"
                value={`${overallAcceptedRate}%`}
                subtitle={`${profile.accepted_submission_count} accepted of ${profile.submission_count} submissions`}
                icon={Brain}
                accentColor="indigo"
              />
              <StatsCard
                title="Problems Solved"
                value={profile.problems_solved}
                subtitle="Distinct problems with an accepted submission"
                icon={CheckCircle2}
                accentColor="teal"
              />
              <StatsCard
                title="Current Activity Streak"
                value={`${profile.streak_days} Days`}
                subtitle="Consecutive days with a submission"
                icon={TrendingUp}
                accentColor="teal"
              />
              <StatsCard
                title="Submission Activity"
                value={profile.activity_days}
                subtitle={`${Math.round(profile.consistency * 100)}% activity consistency in recorded span`}
                icon={AlertTriangle}
                accentColor="amber"
              />
            </div>

            {/* Main Columns: Error Breakdown & Skill Matrix */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Recurring Error Archetypes */}
          <div className="rounded-2xl border border-slate-800 bg-navy-900/60 p-6 backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Submission Issue Categories</h3>
                <p className="text-xs text-slate-400">Recorded verdicts from your unsuccessful submissions</p>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-500">Distribution</span>
            </div>

            <div className="space-y-4">
              {errorCategories.length === 0 && (
                <p className="text-xs text-slate-400">No unsuccessful submissions have been recorded.</p>
              )}
              {errorCategories.map(([category, count]) => (
                <div key={category} className="rounded-xl border border-slate-800 bg-navy-950 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold capitalize text-white">{category.replace(/_/g, ' ')}</span>
                    <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                      {count} {count === 1 ? 'submission' : 'submissions'}
                    </span>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Share of all submissions</span>
                      <span className="text-amber-400 font-bold">
                        {Math.round((count / profile.submission_count) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-indigo-500"
                        style={{ width: `${Math.min(100, (count / profile.submission_count) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Skill Matrix & Growth Plan */}
          <div className="space-y-6">
            {/* Proficiency Bars */}
            <div className="rounded-2xl border border-slate-800 bg-navy-900/60 p-6 backdrop-blur-md space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Accepted Rate by Language</h3>
                  <p className="text-xs text-slate-400">Successful submissions divided by attempts in each language</p>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Scale 0-100</span>
              </div>

              <div className="space-y-3.5">
                {Object.entries(profile.mastery).map(([language, level]) => (
                  <div key={language} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold capitalize text-slate-200">{language}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-slate-400">accepted rate</span>
                        <span className="font-mono text-xs text-white">{level}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          level >= 80
                            ? 'bg-teal-400'
                            : level >= 60
                            ? 'bg-indigo-500'
                            : level >= 50
                            ? 'bg-amber-400'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${level}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity-based recommendations */}
            <div className="rounded-2xl border border-teal-500/30 bg-teal-950/20 p-6 backdrop-blur-md space-y-3">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="h-4 w-4" />
                <span>Activity-based next steps</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                {profile.daily_plan.map((area, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-400 flex-shrink-0 mt-0.5" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
