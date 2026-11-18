'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
import { CodeEditor } from '@/components/ui/CodeEditor';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type Language = 'python' | 'javascript' | 'cpp';
interface ProblemRecord {
  id: string;
  title: string;
  difficulty: string;
  category: string;
  description: string;
  problem_mode: 'normal' | 'debugging' | 'both';
  supported_languages: string[];
  debugging_starter_code?: Partial<Record<Language, string>>;
}
interface SampleCase {
  id: string;
  name: string;
  input_text: string;
  expected_output: string;
}

const backendUrl =
  process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
const languages: Language[] = ['python', 'javascript', 'cpp'];

async function getAccessToken() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error('Supabase authentication is not configured in this environment.');
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.access_token) throw new Error('A valid user session is required for debugging.');
  return session.access_token;
}

export default function DebuggingLabWorkspace() {
  const params = useParams();
  const problemId = params?.id as string;
  const [problem, setProblem] = useState<ProblemRecord | null>(null);
  const [sampleCases, setSampleCases] = useState<SampleCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<'python' | 'javascript' | 'cpp'>('python');
  const [hypothesis, setHypothesis] = useState('');
  const [hints, setHints] = useState<string[]>([]);
  const [hintError, setHintError] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRunningSample, setIsRunningSample] = useState(false);
  const [fixStatus, setFixStatus] = useState<'untested' | 'failed' | 'passed' | 'configuration_error'>('untested');
  const [diagnosticLog, setDiagnosticLog] = useState<string>('');
  const [sampleOutput, setSampleOutput] = useState<string | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);
  const supportedLanguages = useMemo(
    () => (problem?.supported_languages || []).filter((item): item is Language =>
      languages.includes(item as Language),
    ),
    [problem],
  );

  useEffect(() => {
    let active = true;
    const loadChallenge = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        if (!backendUrl) throw new Error('Set NEXT_PUBLIC_API_URL or NEXT_PUBLIC_BACKEND_URL to connect to the backend.');
        const accessToken = await getAccessToken();
        const headers = { Authorization: `Bearer ${accessToken}` };
        const encodedId = encodeURIComponent(problemId);
        const [problemResponse, samplesResponse] = await Promise.all([
          fetch(`${backendUrl}/api/v1/platform/problems/${encodedId}`, { headers }),
          fetch(`${backendUrl}/api/v1/platform/problems/${encodedId}/samples`, { headers }),
        ]);
        const problemBody = await problemResponse.json().catch(() => null);
        const samplesBody = await samplesResponse.json().catch(() => null);
        if (!problemResponse.ok) throw new Error(problemBody?.detail || 'Unable to load this challenge.');
        if (!samplesResponse.ok) throw new Error(samplesBody?.detail || 'Unable to load public regression cases.');
        if (!problemBody || !Array.isArray(samplesBody)) throw new Error('The server returned invalid challenge data.');
        if (problemBody.problem_mode === 'normal') throw new Error('This problem is not a debugging challenge.');
        if (!Object.values(problemBody.debugging_starter_code || {}).some(value => typeof value === 'string' && value.trim())) {
          throw new Error('This debugging challenge is awaiting verification.');
        }
        if (active) {
          const record = problemBody as ProblemRecord;
          setProblem(record);
          setSampleCases(samplesBody as SampleCase[]);
          const initialLanguage = (record.supported_languages || []).find((item) =>
            languages.includes(item as Language),
          ) as Language | undefined;
          if (!initialLanguage) {
            setLoadError('This challenge does not have a supported execution language configured.');
          } else {
            setLanguage(initialLanguage);
            setCode(record.debugging_starter_code?.[initialLanguage] || '');
          }
        }
      } catch (error) {
        if (active) setLoadError(error instanceof Error ? error.message : 'Unable to load the challenge.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void loadChallenge();
    return () => { active = false; };
  }, [problemId]);

  const fetchPlatformResult = async (endpoint: 'execute' | 'submit', payload: Record<string, unknown>) => {
    if (!backendUrl) throw new Error('Set NEXT_PUBLIC_API_URL or NEXT_PUBLIC_BACKEND_URL to connect to the backend.');
    const accessToken = await getAccessToken();
    const response = await fetch(`${backendUrl}/api/v1/platform/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body?.detail || `Request failed with status ${response.status}.`);
    return body;
  };

  const requestHint = async () => {
    if (hintLoading || hints.length >= 4) return;
    setHintLoading(true);
    setHintError(null);
    try {
      const accessToken = await getAccessToken();
      if (!backendUrl) throw new Error('Set NEXT_PUBLIC_API_URL or NEXT_PUBLIC_BACKEND_URL to connect to the backend.');
      const nextTier = hints.length + 1;
      const response = await fetch(
        `${backendUrl}/api/v1/platform/problems/${encodeURIComponent(problemId)}/hints/${nextTier}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.detail || 'Unable to load the next hint.');
      if (typeof body.hint !== 'string') throw new Error('The server returned an invalid hint.');
      setHints((current) => [...current, body.hint]);
    } catch (error) {
      setHintError(error instanceof Error ? error.message : 'Unable to load the next hint.');
    } finally {
      setHintLoading(false);
    }
  };

  const runPublicSample = async () => {
    const sample = sampleCases[0];
    if (!sample) {
      setSampleError('No public sample test case has been configured.');
      return;
    }
    setIsRunningSample(true);
    setSampleError(null);
    setSampleOutput(null);
    try {
      const result = await fetchPlatformResult('execute', {
        language,
        source_code: code,
        stdin: sample.input_text,
      });
      if (result.status !== 'success') {
        throw new Error(result.message || result.stderr || result.compile_output || 'Sample execution did not complete successfully.');
      }
      setSampleOutput(String(result.stdout || ''));
    } catch (error) {
      setSampleError(error instanceof Error ? error.message : 'Unable to run the public sample.');
    } finally {
      setIsRunningSample(false);
    }
  };

  const handleVerifyFix = async () => {
    if (!problem) return;
    setIsVerifying(true);
    setFixStatus('untested');
    setDiagnosticLog('');

    try {
      const result = await fetchPlatformResult('submit', {
        problem_id: problem.id,
        language,
        source_code: code,
        mode: 'submit',
      });
      if (result.status === 'unconfigured' || result.status === 'configuration_error') {
        setFixStatus('configuration_error');
        setDiagnosticLog(result.message || 'Judge0 is not configured, so the regression suite could not run.');
        return;
      }

      if (result.status === 'accepted') {
        setFixStatus('passed');
        setDiagnosticLog(`The backend verified ${result.passed_test_count} of ${result.total_test_count} configured regression cases.`);
      } else {
        setFixStatus('failed');
        setDiagnosticLog(
          `The submitted fix did not pass the regression suite (${result.passed_test_count} of ${result.total_test_count} cases passed). Hidden test details are withheld.`,
        );
      }
    } catch (error) {
      setFixStatus('configuration_error');
      setDiagnosticLog(error instanceof Error ? error.message : 'Unable to run the verification harness.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell hideFooter>
        <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-slate-300" role="status">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
          Loading debugging challenge from the database...
        </div>
      </AppShell>
    );
  }

  if (!problem || loadError) {
    return (
      <AppShell hideFooter>
        <div className="mx-auto mt-12 max-w-xl rounded-2xl border border-rose-500/30 bg-navy-900 p-6 text-center" role="alert">
          <h1 className="text-lg font-bold text-white">Debugging challenge unavailable</h1>
          <p className="mt-2 text-sm text-slate-300">{loadError || 'The requested challenge could not be loaded.'}</p>
          <Link href="/problems" className="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
            Return to Problem Hub
          </Link>
        </div>
      </AppShell>
    );
  }

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
              onClick={runPublicSample}
              disabled={isVerifying || isRunningSample || sampleCases.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>{isRunningSample ? 'Running Sample...' : 'Run Sample'}</span>
            </button>
            <button
              onClick={handleVerifyFix}
              disabled={isVerifying || isRunningSample}
              className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-amber-500 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{isVerifying ? 'Running Regression Suite...' : 'Verify Fix'}</span>
            </button>
          </div>
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

            {/* Public test-case context */}
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <AlertTriangle className="h-4 w-4" />
                <span>Debugging Challenge</span>
              </div>
              <p className="text-slate-200 font-semibold">Topic: {problem.category}</p>
              {sampleCases.length === 0 ? (
                <p className="pt-2 text-amber-200">No public regression cases are configured for this challenge.</p>
              ) : (
                <div className="space-y-2 pt-2 font-mono text-[11px]">
                  {sampleCases.map((sample, index) => (
                    <div key={sample.id} className="rounded bg-navy-950 p-2 border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">Public case {index + 1} input:</span>
                      <pre className="whitespace-pre-wrap text-slate-200">{sample.input_text}</pre>
                      <span className="mt-2 text-slate-500 block text-[10px]">Expected output:</span>
                      <pre className="whitespace-pre-wrap text-emerald-300">{sample.expected_output}</pre>
                    </div>
                  ))}
                </div>
              )}
              {sampleOutput !== null && (
                <div className="rounded bg-navy-950 p-2 border border-slate-800 font-mono text-[11px]">
                  <span className="text-slate-500 block text-[10px]">Actual output from Judge0:</span>
                  <pre className="whitespace-pre-wrap text-slate-200">{sampleOutput || '(no output)'}</pre>
                </div>
              )}
              {sampleError && <p className="text-rose-200" role="alert">{sampleError}</p>}
            </div>

            {/* Socratic Hint Tiers Drawer */}
            <div className="rounded-xl border border-slate-800 bg-navy-950/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300">
                  <Lightbulb className="h-4 w-4 text-teal-400" />
                  <span>Socratic Progressive Hints</span>
                </div>
                <span className="text-[11px] text-slate-400">
                  Revealed: {hints.length} of 4
                </span>
              </div>

              <div className="space-y-2">
                {hints.map((hint, index) => (
                  <div key={index} className="rounded-lg border border-teal-500/30 bg-teal-950/20 p-2.5 text-xs text-slate-200">
                    <span className="mb-1 block text-[10px] font-bold uppercase text-teal-300">Hint Tier {index + 1}</span>
                    {hint}
                  </div>
                ))}
                {hintError && <p className="text-xs text-rose-300" role="alert">{hintError}</p>}
                <button
                  onClick={() => void requestHint()}
                  disabled={hintLoading || hints.length >= 4}
                  className="text-[11px] font-semibold text-teal-400 underline hover:text-teal-300 disabled:opacity-50"
                >
                  {hintLoading ? 'Loading hint...' : hints.length >= 4 ? 'All hint tiers requested' : `Request Hint Tier ${hints.length + 1}`}
                </button>
              </div>
            </div>

            {/* Hypothesis Formulation Box */}
            <div className="rounded-xl border border-slate-800 bg-navy-950/80 p-4 space-y-2 text-xs">
              <label className="font-bold text-white flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-indigo-400" />
                <span>Write Your Bug Diagnosis Hypothesis:</span>
              </label>
              <textarea
                rows={2}
                placeholder="Describe the suspected cause and how you would test it..."
                value={hypothesis}
                onChange={(e) => setHypothesis(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-navy-900 p-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500">
                Use this space for your own notes; they are not saved or scored.
              </span>
            </div>
          </div>

          {/* Right Panel: Buggy Code Editor & Verification Console */}
          <div className="flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <CodeEditor
                initialCode={code}
                language={language}
                supportedLanguages={supportedLanguages}
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
                    <span>Running configured regression cases in Judge0...</span>
                  </div>
                ) : fixStatus === 'passed' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>Fix Verified! Configured Regression Cases Passed.</span>
                    </div>
                    <p className="text-slate-300 font-sans text-xs">{diagnosticLog}</p>
                    <div className="mt-3 flex items-center gap-3 font-sans">
                      <Link
                        href="/learning-dna"
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors flex items-center gap-1.5"
                      >
                        <Dna className="h-3.5 w-3.5" />
                        <span>View Learning DNA</span>
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
                      Edit the challenge code, run a public sample if needed, then submit your fix for backend regression testing.
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
