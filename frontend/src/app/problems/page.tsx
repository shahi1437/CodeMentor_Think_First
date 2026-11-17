'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Code2,
  Bug,
  ArrowRight,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface ProblemRecord {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  category: string;
  problem_mode: 'normal' | 'debugging' | 'both';
  tags: string[];
  supported_languages: string[];
  description: string;
}

const backendUrl =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';

export default function ProblemHubPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedMode, setSelectedMode] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [problems, setProblems] = useState<ProblemRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadProblems = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        throw new Error('Supabase authentication is not configured in this environment.');
      }
      if (!backendUrl) {
        throw new Error('Set NEXT_PUBLIC_API_URL or NEXT_PUBLIC_BACKEND_URL to connect to the backend.');
      }
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session) throw new Error('Please sign in to browse published problems.');

      const response = await fetch(`${backendUrl}/api/v1/platform/problems`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.detail || 'Unable to load problems from the server.');
      }
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error('The server returned an invalid problem catalog.');
      setProblems(data as ProblemRecord[]);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Unable to load problems.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProblems();
  }, [loadProblems]);

  const categories = useMemo(
    () => Array.from(new Set(problems.map((problem) => problem.category))),
    [problems],
  );
  const availableLanguages = useMemo(
    () => Array.from(new Set(problems.flatMap((problem) => problem.supported_languages || []))).sort(),
    [problems],
  );

  // Filter logic
  const filteredProblems = problems.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.tags || []).some((t) => t.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.description.toLowerCase().includes(searchTerm.toLowerCase());

    const difficultyLabel = ({ beginner: 'Easy', intermediate: 'Medium', advanced: 'Hard' } as Record<string, string>)[
      p.difficulty.toLowerCase()
    ] || p.difficulty;
    const matchesDifficulty =
      selectedDifficulty === 'all' || difficultyLabel.toLowerCase() === selectedDifficulty.toLowerCase();

    const matchesMode = selectedMode === 'all' || p.problem_mode === selectedMode || p.problem_mode === 'both';

    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesLanguage =
      selectedLanguage === 'all' || (p.supported_languages || []).includes(selectedLanguage);

    return matchesSearch && matchesDifficulty && matchesMode && matchesCategory && matchesLanguage;
  });

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedDifficulty('all');
    setSelectedMode('all');
    setSelectedCategory('all');
    setSelectedLanguage('all');
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Problem Hub</h1>
              <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/30">
                {problems.length} Published Challenges
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Practice building algorithms from scratch or diagnosing tricky seeded bugs in real code.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/problems/new"
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-navy-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <span>+ Propose Challenge</span>
            </Link>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-navy-900/60 p-4 backdrop-blur-md space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search challenges by title, concept, or tag..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-navy-950 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded-xl border border-slate-700 bg-navy-950 px-3 py-2 text-xs text-slate-300 outline-none hover:border-slate-600 focus:border-indigo-500"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="rounded-xl border border-slate-700 bg-navy-950 px-3 py-2 text-xs text-slate-300 outline-none hover:border-slate-600 focus:border-indigo-500"
              aria-label="Filter by programming language"
            >
              <option value="all">All Languages</option>
              {availableLanguages.map((language) => (
                <option key={language} value={language}>{language}</option>
              ))}
            </select>
          </div>

          {/* Difficulty & Mode Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mode:</span>
              <button
                onClick={() => setSelectedMode('all')}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedMode === 'all' ? 'bg-indigo-600 text-white' : 'bg-navy-950 text-slate-400 hover:text-white'
                }`}
              >
                All Modes
              </button>
              <button
                onClick={() => setSelectedMode('normal')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedMode === 'normal' ? 'bg-indigo-600 text-white' : 'bg-navy-950 text-slate-400 hover:text-white'
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Normal Coding</span>
              </button>
              <button
                onClick={() => setSelectedMode('debugging')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedMode === 'debugging' ? 'bg-amber-600 text-white' : 'bg-navy-950 text-slate-400 hover:text-white'
                }`}
              >
                <Bug className="h-3.5 w-3.5" />
                <span>Debugging Lab</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Difficulty:</span>
              {['all', 'Easy', 'Medium', 'Hard'].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors capitalize ${
                    selectedDifficulty.toLowerCase() === diff.toLowerCase()
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Problems List / Table */}
        <div className="mt-6">
          {isLoading ? (
            /* Loading State */
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 w-full animate-pulse rounded-2xl bg-slate-800/40"></div>
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 text-center" role="alert">
              <AlertCircle className="mx-auto h-9 w-9 text-rose-400 mb-3" />
              <h3 className="text-base font-bold text-white">Problem catalog unavailable</h3>
              <p className="mt-2 text-sm text-slate-300">{loadError}</p>
              <button
                onClick={() => void loadProblems()}
                className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                Try again
              </button>
            </div>
          ) : problems.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-navy-900/40 p-12 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-slate-500 mb-3" />
              <h3 className="text-base font-bold text-white">No published problems yet</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                Published coding and debugging problems will appear here when the database is configured.
              </p>
            </div>
          ) : filteredProblems.length === 0 ? (
            /* Empty State */
            <div className="rounded-2xl border border-slate-800 bg-navy-900/40 p-12 text-center">
              <AlertCircle className="mx-auto h-10 w-10 text-slate-500 mb-3" />
              <h3 className="text-base font-bold text-white">No challenges match your criteria</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
                Try expanding your search terms or resetting the difficulty and mode filters.
              </p>
              <button
                onClick={resetFilters}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Clear All Filters</span>
              </button>
            </div>
          ) : (
            /* Success State: Problem Cards Grid */
            <div className="space-y-3">
              {filteredProblems.map((problem) => {
                const isDebugging =
                  problem.problem_mode === 'debugging' ||
                  (problem.problem_mode === 'both' && selectedMode === 'debugging');
                const difficultyLabel = ({
                  beginner: 'Easy',
                  intermediate: 'Medium',
                  advanced: 'Hard',
                } as Record<string, string>)[problem.difficulty.toLowerCase()] || problem.difficulty;
                const targetUrl =
                  isDebugging
                    ? `/workspace/debugging/${problem.id}`
                    : `/workspace/coding/${problem.id}`;

                return (
                  <div
                    key={problem.id}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-800 bg-navy-900/60 p-5 backdrop-blur-md hover:border-indigo-500/40 hover:bg-navy-900/90 transition-all duration-200 gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Mode badge */}
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide border ${
                            isDebugging
                              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                              : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                          }`}
                        >
                          {isDebugging ? '🐞 Debugging Lab' : problem.problem_mode === 'both' ? 'Coding + Debugging' : '💻 Normal Coding'}
                        </span>

                        {/* Difficulty badge */}
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                            difficultyLabel === 'Easy'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : difficultyLabel === 'Medium'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {difficultyLabel}
                        </span>

                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs text-slate-400">{problem.category}</span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors">
                        <Link href={targetUrl}>{problem.title}</Link>
                      </h3>

                      {/* Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {(problem.tags || []).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-navy-950 px-2 py-0.5 text-[10px] font-medium text-slate-400 border border-slate-800/80"
                          >
                            {tag}
                          </span>
                        ))}
                        <span className="text-[11px] text-slate-500 ml-2">
                          Languages: {(problem.supported_languages || []).join(', ') || 'Not configured'}
                        </span>
                      </div>
                    </div>

                    {/* Launch Action */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 border-slate-800/80 pt-3 sm:pt-0">
                      <Link
                        href={targetUrl}
                        className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition-all shadow-md ${
                          isDebugging
                            ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                            : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                        }`}
                      >
                        <span>{isDebugging ? 'Diagnose Bug' : 'Solve Problem'}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
