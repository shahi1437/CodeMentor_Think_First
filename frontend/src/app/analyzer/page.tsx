'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  Cpu,
  Layers,
  Loader2,
  Terminal,
  Zap,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { CodeEditor } from '@/components/ui/CodeEditor';
import { BackendRequestError, backendRequest } from '@/lib/backend';
import {
  MAX_ANALYZER_SOURCE_CHARACTERS,
  analyzerErrorKind,
  formatParseError,
  isAnalyzerResult,
  isConfigurationMessage,
  isNetworkErrorMessage,
  type AnalyzerErrorKind,
  type AnalyzerFinding,
  type AnalyzerFunction,
  type AnalyzerResult,
} from '@/lib/analyzer';

const PRESETS = {
  binary_search: {
    title: 'Binary Search',
    note: 'Example: iterative search with a while loop.',
    code: `def binary_search(nums, target):\n    left, right = 0, len(nums) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1`,
  },
  nested_loop: {
    title: 'Nested Loops',
    note: 'Example: quadratic pair scan.',
    code: `def two_sum_naive(nums, target):\n    n = len(nums)\n    for i in range(n):\n        for j in range(i + 1, n):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    return []`,
  },
  list_mutation: {
    title: 'List Mutation',
    note: 'Example: removing items while iterating.',
    code: `def remove_odds(nums):\n    for x in nums:\n        if x % 2 != 0:\n            nums.remove(x)\n    return nums`,
  },
} as const;

type PresetKey = keyof typeof PRESETS;

const severityStyles: Record<string, string> = {
  high: 'border-rose-500/30 bg-rose-950/20 text-rose-200',
  medium: 'border-amber-500/30 bg-amber-950/20 text-amber-200',
  low: 'border-sky-500/30 bg-sky-950/20 text-sky-200',
  clean: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200',
};

function StatCard({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number;
  className: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 text-center ${className}`}>
      <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      <div className="mt-1 break-words font-mono text-xl font-extrabold">{value}</div>
    </div>
  );
}

function FindingCard({ finding }: { finding: AnalyzerFinding }) {
  const tone = severityStyles[finding.severity] ?? 'border-slate-700 bg-slate-900/60 text-slate-200';
  const Icon = finding.severity === 'clean' ? CheckCircle2 : AlertTriangle;
  return (
    <div className={`rounded-xl border p-3 text-xs ${tone}`}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <div className="flex flex-wrap items-center gap-2 font-bold">
            <span>{finding.label}</span>
            <span className="text-[10px] uppercase opacity-80">{finding.severity}</span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{finding.description}</p>
        </div>
      </div>
    </div>
  );
}

function FunctionRow({ item }: { item: AnalyzerFunction }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-navy-950/70 px-3 py-2 text-xs">
      <div className="min-w-0">
        <span className="font-mono font-bold text-slate-100">{item.name}</span>
        <span className="ml-2 text-[11px] text-slate-400">
          line {item.line} · {item.arguments.length > 0 ? item.arguments.join(', ') : 'no arguments'}
        </span>
      </div>
      {item.recursive && (
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-300">
          Recursive
        </span>
      )}
    </div>
  );
}

function errorTitle(kind: AnalyzerErrorKind) {
  if (kind === 'auth') return 'Sign in required';
  if (kind === 'validation') return 'Check your input';
  if (kind === 'configuration') return 'Configuration needed';
  if (kind === 'network' || kind === 'unavailable') return 'Analyzer unavailable';
  return 'Analysis failed';
}

export default function VisualCodeAnalyzerPage() {
  const [presetKey, setPresetKey] = useState<PresetKey>('binary_search');
  const [code, setCode] = useState<string>(PRESETS.binary_search.code);
  const [result, setResult] = useState<AnalyzerResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<{ kind: AnalyzerErrorKind; message: string } | null>(null);

  const sourceTooLarge = code.length > MAX_ANALYZER_SOURCE_CHARACTERS;
  const canAnalyze = code.trim().length > 0 && !sourceTooLarge && !isAnalyzing;

  const loadPreset = (key: PresetKey) => {
    setPresetKey(key);
    setCode(PRESETS[key].code);
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!code.trim()) {
      setResult(null);
      setError({ kind: 'validation', message: 'Enter Python code before running analysis.' });
      return;
    }
    if (sourceTooLarge) {
      setResult(null);
      setError({
        kind: 'validation',
        message: `Keep the source at or below ${MAX_ANALYZER_SOURCE_CHARACTERS.toLocaleString()} characters.`,
      });
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    setError(null);

    try {
      const response = await backendRequest<unknown>('/platform/analyze', {
        method: 'POST',
        body: JSON.stringify({ language: 'python', source_code: code }),
      });
      if (!isAnalyzerResult(response)) {
        throw new Error('The analyzer returned an unexpected response. Please try again.');
      }
      setResult(response);
    } catch (caught) {
      if (caught instanceof BackendRequestError) {
        let kind = analyzerErrorKind(caught.status);
        if (isConfigurationMessage(caught.message)) kind = 'configuration';
        else if (isNetworkErrorMessage(caught.message)) kind = 'network';
        setError({ kind, message: caught.message });
      } else {
        setError({
          kind: 'unexpected',
          message: caught instanceof Error ? caught.message : 'The analyzer request failed.',
        });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Visual Code Analyzer</h1>
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400">
                Live Python AST
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Inspect Python structure, functions, loops, and heuristic complexity estimates.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 text-[11px] text-emerald-200">
            Code is parsed on the backend; it is never executed.
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3 rounded-xl border border-indigo-500/30 bg-indigo-950/30 px-4 py-3 text-xs text-indigo-100">
          <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400" />
          <p>
            <strong className="text-white">Static analysis only.</strong> Complexity values come from AST
            heuristics and are estimates, not guaranteed runtime bounds. Findings should be reviewed in context.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Load an example:</span>
          {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => loadPreset(key)}
              className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
                presetKey === key
                  ? 'bg-indigo-600 font-bold text-white'
                  : 'bg-navy-900 text-slate-400 hover:text-white'
              }`}
            >
              {PRESETS[key].title}
            </button>
          ))}
          <span className="text-[11px] text-slate-500">
            Examples only load source code; results always come from the backend.
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-8 xl:grid-cols-2">
          <section className="space-y-4" aria-label="Python source input">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-white">{PRESETS[presetKey].title}</h2>
                <p className="text-[11px] text-slate-400">{PRESETS[presetKey].note}</p>
              </div>
              <span className="font-mono text-[11px] text-slate-500">
                {code.length.toLocaleString()} / {MAX_ANALYZER_SOURCE_CHARACTERS.toLocaleString()} characters
              </span>
            </div>

            <CodeEditor
              initialCode={PRESETS[presetKey].code}
              value={code}
              onCodeChange={setCode}
              language="python"
              supportedLanguages={['python']}
              height="420px"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[11px] text-slate-500">
                Python only. Maximum source size is {MAX_ANALYZER_SOURCE_CHARACTERS.toLocaleString()} characters.
              </p>
              <button
                type="button"
                onClick={() => void handleAnalyze()}
                disabled={!canAnalyze}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {isAnalyzing ? 'Analyzing...' : 'Analyze Code'}
              </button>
            </div>
            {sourceTooLarge && (
              <p role="alert" className="text-xs text-rose-300">
                The source exceeds the allowed size. Shorten it before analyzing.
              </p>
            )}
          </section>

          <section className="space-y-4" aria-label="Analysis results" aria-live="polite">
            {isAnalyzing && (
              <div role="status" className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                  Analyzing Python structure...
                </div>
                <div className="h-24 animate-pulse rounded-2xl border border-slate-800 bg-navy-900/60" />
                <div className="h-40 animate-pulse rounded-2xl border border-slate-800 bg-navy-900/60" />
              </div>
            )}

            {!isAnalyzing && error && (
              <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-5 text-rose-100">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold">{errorTitle(error.kind)}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-rose-200">{error.message}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {error.kind === 'auth' && (
                        <Link
                          href={{ pathname: '/auth/login', query: { redirectTo: '/analyzer' } }}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                        >
                          Sign in
                        </Link>
                      )}
                      {(error.kind === 'network' || error.kind === 'unavailable') && (
                        <button
                          type="button"
                          onClick={() => void handleAnalyze()}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                        >
                          Try again
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!isAnalyzing && !error && result && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-bold text-white">Analysis result</h2>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                      result.valid_syntax
                        ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                        : 'border-rose-500/30 bg-rose-950/20 text-rose-300'
                    }`}
                  >
                    {result.valid_syntax ? 'Valid Python syntax' : 'Syntax error detected'}
                  </span>
                </div>

                {!result.valid_syntax && result.parse_error && (
                  <div role="alert" className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 text-rose-100">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider">Parse error</h3>
                        <p className="mt-1 font-mono text-[11px] leading-relaxed">
                          {formatParseError(result.parse_error)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <StatCard
                    label="Estimated time"
                    value={result.time_complexity}
                    className="border-indigo-500/30 bg-navy-900/80 text-indigo-300"
                  />
                  <StatCard
                    label="Estimated space"
                    value={result.space_complexity}
                    className="border-teal-500/30 bg-navy-900/80 text-teal-300"
                  />
                  <StatCard
                    label="Loops"
                    value={result.loops}
                    className="border-slate-700 bg-navy-900/60 text-slate-200"
                  />
                  <StatCard
                    label="Branches"
                    value={result.branches}
                    className="border-slate-700 bg-navy-900/60 text-slate-200"
                  />
                  <StatCard
                    label="Max loop depth"
                    value={result.max_loop_depth}
                    className="border-slate-700 bg-navy-900/60 text-slate-200"
                  />
                  <StatCard
                    label="Functions"
                    value={result.functions.length}
                    className="border-slate-700 bg-navy-900/60 text-slate-200"
                  />
                </div>

                <p className="rounded-xl border border-amber-500/20 bg-amber-950/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200">
                  {result.complexity_basis}
                </p>

                <div className="rounded-2xl border border-slate-800 bg-navy-900/60 p-5">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-indigo-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Findings</h3>
                  </div>
                  {result.findings.length === 0 ? (
                    <p className="mt-3 text-xs text-slate-400">No structural findings were returned.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {result.findings.map((finding, index) => (
                        <FindingCard key={`${finding.label}-${index}`} finding={finding} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-navy-900/60 p-5">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">Functions</h3>
                  </div>
                  {result.functions.length === 0 ? (
                    <p className="mt-3 text-xs text-slate-400">No function definitions detected.</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {result.functions.map((item) => (
                        <FunctionRow key={`${item.name}-${item.line}`} item={item} />
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-800 bg-navy-900/40 p-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Limitations</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[11px] leading-relaxed text-slate-400">
                    {result.limitations.map((limitation) => (
                      <li key={limitation}>{limitation}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {!isAnalyzing && !error && !result && (
              <div className="rounded-2xl border border-slate-800 bg-navy-900/40 p-10 text-center">
                <Code2 className="mx-auto h-9 w-9 text-slate-500" />
                <h2 className="mt-3 text-sm font-bold text-white">No analysis yet</h2>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
                  Write Python code or load an example, then choose Analyze Code. This panel will show real
                  syntax, loop, function, mutation, and complexity results from the backend.
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
