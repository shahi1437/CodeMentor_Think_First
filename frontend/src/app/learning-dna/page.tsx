'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Dna,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Bug,
  Brain,
  Shield,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { StatsCard } from '@/components/ui/StatsCard';
import { SimulationBanner } from '@/components/ui/SimulationBanner';
import { MOCK_DNA_PROFILE } from '@/lib/mock-data';

export default function LearningDNAPage() {
  const [profile, setProfile] = useState(MOCK_DNA_PROFILE);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = () => {
    setIsRecalculating(true);
    setTimeout(() => {
      setIsRecalculating(false);
    }, 600);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SimulationBanner featureName="Scikit-learn Error Classifier & Learning DNA Engine" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Learning DNA Profile</h1>
              <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/30">
                Proprietary Error Archetypes
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Cognitive fingerprint analyzing recurring programming logic habits, boundary oversights, and debugging tendencies.
            </p>
          </div>

          <button
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-navy-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isRecalculating ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Recalculate Model</span>
          </button>
        </div>

        {/* Overall Mastery Snapshot */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            title="Overall Mastery Index"
            value={`${profile.overallMastery}%`}
            subtitle="Based on 77 total exercises"
            icon={Brain}
            trend={{ value: '4.2% this month', isPositive: true }}
            accentColor="indigo"
          />
          <StatsCard
            title="Diagnosed Error Types"
            value="4 Major"
            subtitle="Classified via Scikit-learn"
            icon={Bug}
            accentColor="amber"
          />
          <StatsCard
            title="Active Learning Streak"
            value={`${profile.streakDays} Days`}
            subtitle="Top 10% in cohort"
            icon={TrendingUp}
            accentColor="teal"
          />
          <StatsCard
            title="Recovery Resilience"
            value="82%"
            subtitle="Bugs fixed without spoiler hints"
            icon={Shield}
            trend={{ value: '8% increase', isPositive: true }}
            accentColor="indigo"
          />
        </div>

        {/* Main Columns: Error Breakdown & Skill Matrix */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Recurring Error Archetypes */}
          <div className="rounded-2xl border border-slate-800 bg-navy-900/60 p-6 backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Classified Error Archetypes</h3>
                <p className="text-xs text-slate-400">Frequency of logic slips identified in your submissions</p>
              </div>
              <span className="text-[10px] uppercase font-bold text-slate-500">Distribution</span>
            </div>

            <div className="space-y-4">
              {profile.errorArchetypes.map((archetype, idx) => (
                <div key={idx} className="rounded-xl border border-slate-800 bg-navy-950 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{archetype.category}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        archetype.trend === 'improving'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : archetype.trend === 'stable'
                          ? 'bg-indigo-500/10 text-indigo-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {archetype.trend.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400">{archetype.description}</p>

                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>Frequency Share</span>
                      <span className="text-amber-400 font-bold">{archetype.frequency}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-indigo-500"
                        style={{ width: `${archetype.frequency}%` }}
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
                  <h3 className="text-sm font-bold text-white">Algorithmic Skill Proficiency</h3>
                  <p className="text-xs text-slate-400">Mastery levels across core curriculum competencies</p>
                </div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Scale 0-100</span>
              </div>

              <div className="space-y-3.5">
                {profile.skillProficiency.map((skill, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{skill.skill}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-semibold ${
                            skill.status === 'Mastered'
                              ? 'text-teal-400'
                              : skill.status === 'Proficient'
                              ? 'text-indigo-400'
                              : skill.status === 'Learning'
                              ? 'text-amber-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {skill.status}
                        </span>
                        <span className="font-mono text-xs text-white">{skill.level}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          skill.level >= 80
                            ? 'bg-teal-400'
                            : skill.level >= 60
                            ? 'bg-indigo-500'
                            : skill.level >= 50
                            ? 'bg-amber-400'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${skill.level}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Growth Achievements Box */}
            <div className="rounded-2xl border border-teal-500/30 bg-teal-950/20 p-6 backdrop-blur-md space-y-3">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="h-4 w-4" />
                <span>Recent Pedagogical Growth Milestones</span>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                {profile.recentGrowthAreas.map((area, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-teal-400 flex-shrink-0 mt-0.5" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2">
                <Link
                  href="/daily-plan"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-300 hover:text-teal-200"
                >
                  <span>Generate targeted challenge plan from this DNA</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
