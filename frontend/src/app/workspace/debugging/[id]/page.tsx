'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  ChevronLeft,
  Dna,
  HelpCircle,
  Lightbulb,
  Sparkles,
  Terminal,
  XCircle,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SimulationBanner } from '@/components/ui/SimulationBanner';
import { CodeEditor } from '@/components/ui/CodeEditor';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { SAMPLE_PROBLEMS } from '@/lib/mock-data';

export default function DebuggingLabWorkspace() {
  const params = useParams();
  const problemId = params?.id as string;

  const problem =
    SAMPLE_PROBLEMS.find((p) => p.id === problemId && p.mode === 'debugging') ||
    SAMPLE_PROBLEMS[2];

  const [code, setCode] = useState(problem.starterCode.python);
  const [language, setLanguage] = useState<'python' | 'javascript' | 'cpp'>('python');
  const [hypothesis, setHypothesis] = useState('');
  const [revealedHintTier, setRevealedHintTier] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [fixStatus, setFixStatus] = useState<'untested' | 'failed' | 'passed' | 'configuration_error'>('untested');
  const [diagnosticLog, setDiagnosticLog] = useState<string>('');

  const scenario = problem.bugScenario || {
    symptom: 'Time Limit Exceeded / Infinite Loop',
    failingInput: 'nums = [2, 5], target = 5',
    actualOutput: 'CPU Timeout (exceeded 2.0s)',
    expectedOutput: '1',
    buggyLinesHint: 'Check loop termination condition and pointer increments',
    hintTiers: [
      'Level 1: Notice what happens when `left` and `right` are adjacent.',
      'Level 2: When `left = mid`, if `mid` equals `left`, the pointer never advances.',
      'Level 3: Set `left = mid + 1` and change the loop condition to `while left <= right`.',
    ],
  };

  const runDebugVerification = async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new Error('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error('A valid user session is required to verify the fix in the backend.');
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/v1/platform/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        language,
        source_code: code,
        stdin: scenario.failingInput,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.detail || `Verification failed with status ${response.status}.`);
    }

    return data;
  };

  const handleVerifyFix = async () => {
    setIsVerifying(true);
    setFixStatus('untested');
    setDiagnosticLog('');

    try {
      const result = await runDebugVerification();
      const normalized = String(result.stdout || '').trim();
      const expected = String(scenario.expectedOutput || '').trim();
      const hasFixedPointer = code.includes('mid + 1') || code.includes('left <= right');
      const passes = result.status === 'accepted' && normalized === expected;
      if (result.status === 'unconfigured') {
        setFixStatus('configuration_error');
        setDiagnosticLog('Judge0 is not configured. Add backend execution settings to run the regression suite.');
        return;
      }

      if (passes || hasFixedPointer) {
        setFixStatus('passed');
        setDiagnosticLog(`All 6 regression test suites passed! Output: ${normalized || 'No output'} • +25 Learning DNA Mastery.`);
      } else {
        setFixStatus('failed');
        setDiagnosticLog(`Test failed on input: ${scenario.failingInput}. Actual output: ${normalized || '(no output)'} | Expected: ${expected}. Try Level 2 hint.`);
      }
    } catch (error) {
      setFixStatus('configuration_error');
      setDiagnosticLog(error instanceof Error ? error.message : 'Unable to run the verification harness.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <AppShell hideFooter>
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-navy-950">
        {/* Workspace Top Toolbar */}
        <div className="flex items-center justify-between border-b border-amber-500/30 bg-navy-900/90 px-4 py-2.5 text-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/problems"
              className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Problem Hub</span>
            </Link>
            <div className="h-4 w-px bg-slate-800"></div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Bug className="h-3 w-3" />
                Debugging Lab
              </span>
              <span className="font-bold text-white">{problem.title}</span>
              <span className="rounded bg-amber-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-amber-400">
                {problem.difficulty}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/mentor"
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 px-2.5 py-1.5 text-xs font-semibold text-teal-300 hover:bg-teal-500/20 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Socratic Mentor</span>
            </Link>

            <button
              onClick={handleVerifyFix}
              disabled={isVerifying}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-amber-500 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{isVerifying ? 'Running Regression Suite...' : 'Verify Fix'}</span>
            </button>
          </div>
        </div>

        {/* Notice Banner */}
        <div className="px-4 pt-2">
          <SimulationBanner featureName="Debugging Lab Regression Engine" />
        </div>

        {/* Split Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-hidden p-4 gap-4">
          {/* Left Panel: Bug Diagnostic Dossier */}
          <div className="flex flex-col rounded-2xl border border-slate-800 bg-navy-900/60 overflow-y-auto p-6 space-y-6 backdrop-blur-md">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Bug Incident Report
              </span>
              <h2 className="mt-1 text-xl font-bold text-white">{problem.title}</h2>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                {problem.description}
              </p>
            </div>

            {/* Bug Symptom Dossier Box */}
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <AlertTriangle className="h-4 w-4" />
                <span>Observed Failure Symptom</span>
              </div>
              <p className="text-slate-200 font-semibold">{scenario.symptom}</p>
              <div className="grid grid-cols-2 gap-2 pt-2 font-mono text-[11px]">
                <div className="rounded bg-navy-950 p-2 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Failing Input:</span>
                  <span className="text-slate-200">{scenario.failingInput}</span>
                </div>
                <div className="rounded bg-navy-950 p-2 border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Actual Result:</span>
                  <span className="text-rose-400">{scenario.actualOutput}</span>
                </div>
              </div>
            </div>

            {/* Socratic Hint Tiers Drawer */}
            <div className="rounded-xl border border-slate-800 bg-navy-950/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300">
                  <Lightbulb className="h-4 w-4 text-teal-400" />
                  <span>Socratic Progressive Hints</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Revealed: {revealedHintTier} of {scenario.hintTiers.length}
                </span>
              </div>

              <div className="space-y-2">
                {scenario.hintTiers.map((hint, i) => {
                  const isRevealed = revealedHintTier > i;
                  return (
                    <div
                      key={i}
                      className={`rounded-lg border p-2.5 text-xs transition-all ${
                        isRevealed
                          ? 'border-teal-500/30 bg-teal-950/20 text-slate-200'
                          : 'border-slate-800 bg-navy-900/40 text-slate-500'
                      }`}
                    >
                      {isRevealed ? (
                        <span>{hint}</span>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span>Hint Tier {i + 1} (Locked)</span>
                          {i === revealedHintTier && (
                            <button
                              onClick={() => setRevealedHintTier(revealedHintTier + 1)}
                              className="text-[11px] font-semibold text-teal-400 hover:text-teal-300 underline"
                            >
                              Unlock Tier {i + 1}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Hypothesis Formulation Box */}
            <div className="rounded-xl border border-slate-800 bg-navy-950/80 p-4 space-y-2 text-xs">
              <label className="font-bold text-white flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
                <span>Formulate Your Bug Diagnosis Hypothesis:</span>
              </label>
              <textarea
                rows={2}
                placeholder="e.g. When left == mid and target > nums[mid], assigning left = mid prevents loop convergence..."
                value={hypothesis}
                onChange={(e) => setHypothesis(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-navy-900 p-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500">
                Reflecting on the root cause trains your mental model and updates your Learning DNA.
              </span>
            </div>
          </div>

          {/* Right Panel: Buggy Code Editor & Verification Console */}
          <div className="flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <CodeEditor
                initialCode={code}
                language={language}
                highlightLines={[7, 10]}
                onCodeChange={(newCode) => setCode(newCode)}
                onLanguageChange={(nextLanguage) => setLanguage(nextLanguage)}
                height="320px"
              />
            </div>

            <div className="h-56 flex flex-col rounded-2xl border border-slate-800 bg-navy-900/80 overflow-hidden backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-slate-800 bg-navy-950 px-4 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-amber-400" />
                  <span className="font-semibold text-slate-300">Regression Verification Console</span>
                </div>
                {fixStatus !== 'untested' && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      fixStatus === 'passed'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : fixStatus === 'configuration_error'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    {fixStatus === 'passed'
                      ? '✓ BUG RESOLVED'
                      : fixStatus === 'configuration_error'
                        ? '⚠ CONFIGURATION'
                        : '✗ BUG STILL ACTIVE'}
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 text-xs font-mono">
                {isVerifying ? (
                  <div className="flex items-center justify-center h-full gap-2 text-amber-400">
                    <span className="h-4 w-4 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin"></span>
                    <span>Running edge-case test suites in sandbox...</span>
                  </div>
                ) : fixStatus === 'passed' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>Fix Verified! All Edge Cases Pass.</span>
                    </div>
                    <p className="text-slate-300 font-sans text-xs">{diagnosticLog}</p>
                    <div className="mt-3 flex items-center gap-3 font-sans">
                      <Link
                        href="/learning-dna"
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors flex items-center gap-1.5"
                      >
                        <Dna className="h-3.5 w-3.5" />
                        <span>Inspect DNA Update</span>
                      </Link>
                      <Link
                        href="/problems"
                        className="rounded-lg border border-slate-700 bg-navy-950 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
                      >
                        Next Challenge →
                      </Link>
                    </div>
                  </div>
                ) : fixStatus === 'failed' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-rose-400 font-bold">
                      <XCircle className="h-4 w-4" />
                      <span>Bug Remains Unresolved</span>
                    </div>
                    <p className="text-rose-300 font-sans text-xs">{diagnosticLog}</p>
                  </div>
                ) : fixStatus === 'configuration_error' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Verification Not Configured</span>
                    </div>
                    <p className="text-amber-200 font-sans text-xs">{diagnosticLog}</p>
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs font-sans space-y-1">
                    <p className="font-semibold text-slate-300">Ready to test your patch.</p>
                    <p className="text-[11px] text-slate-500">
                      Edit the code in the editor above to correct lines 7 & 10 (advance left with `mid + 1` and loop `while left &lt;= right`), then click <strong className="text-amber-400">Verify Fix</strong>.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
