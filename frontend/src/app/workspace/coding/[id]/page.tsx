'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  CheckCircle2,
  ChevronLeft,
  Play,
  Send,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SimulationBanner } from '@/components/ui/SimulationBanner';
import { CodeEditor } from '@/components/ui/CodeEditor';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { SAMPLE_PROBLEMS } from '@/lib/mock-data';

export default function NormalCodingWorkspace() {
  const params = useParams();
  const problemId = params?.id as string;

  const problem = SAMPLE_PROBLEMS.find((p) => p.id === problemId) || SAMPLE_PROBLEMS[0];

  const [activeTab, setActiveTab] = useState<'description' | 'submissions'>('description');
  const [activeTestCaseTab, setActiveTestCaseTab] = useState<number>(0);
  const [code, setCode] = useState(problem.starterCode.python);
  const [language, setLanguage] = useState<'python' | 'javascript' | 'cpp'>('python');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    status: 'idle' | 'running' | 'accepted' | 'wrong_answer' | 'compilation_error' | 'runtime_error' | 'time_limit_exceeded' | 'memory_limit_exceeded' | 'validation_error' | 'configuration_error' | 'error';
    stdout?: string;
    stderr?: string;
    compileOutput?: string;
    message?: string;
    runtimeMs?: number;
    memoryMb?: number;
    testResults?: { id: string; passed: boolean; output: string; expected: string }[];
  }>({ status: 'idle' });

  const runPlatformRequest = async (endpoint: 'execute' | 'submit', payload: Record<string, unknown>) => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      throw new Error('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error || !session?.access_token) {
      throw new Error('A valid user session is required to run code in the backend sandbox.');
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${backendUrl}/api/v1/platform/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.detail || `The backend request failed with status ${response.status}.`);
    }

    return data;
  };

  const handleRunSampleTests = async () => {
    setIsRunning(true);
    setExecutionResult({ status: 'running' });

    try {
      const payload = {
        language,
        source_code: code,
        stdin: problem.sampleTestCases[activeTestCaseTab]?.input ?? '',
      };
      const result = await runPlatformRequest('execute', payload);
      const normalizedStatus =
        result.status === 'accepted'
          ? 'accepted'
          : result.status === 'wrong_answer'
            ? 'wrong_answer'
            : result.status === 'compilation_error'
              ? 'compilation_error'
              : result.status === 'runtime_error'
                ? 'runtime_error'
                : result.status === 'time_limit_exceeded'
                  ? 'time_limit_exceeded'
                  : result.status === 'memory_limit_exceeded'
                    ? 'memory_limit_exceeded'
                    : result.status === 'validation_error'
                      ? 'validation_error'
                      : result.status === 'unconfigured'
                        ? 'configuration_error'
                        : 'error';

      setExecutionResult({
        status: normalizedStatus,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        compileOutput: result.compile_output || '',
        message: result.message || 'Execution finished.',
        runtimeMs: result.execution_time_ms ?? undefined,
        memoryMb: result.memory_kb ? result.memory_kb / 1024 : undefined,
        testResults: problem.sampleTestCases.map((tc) => ({
          id: tc.id,
          passed: result.status === 'accepted' && (result.stdout || '').trim() === (tc.expectedOutput || '').trim(),
          output: String(result.stdout || '').trim(),
          expected: tc.expectedOutput,
        })),
      });
    } catch (error) {
      setExecutionResult({
        status: 'configuration_error',
        message: error instanceof Error ? error.message : 'Unable to reach the backend execution service.',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setExecutionResult({ status: 'running' });

    try {
      const result = await runPlatformRequest('submit', {
        problem_id: problem.id,
        language,
        source_code: code,
        stdin: problem.sampleTestCases[0]?.input ?? '',
        test_cases: problem.sampleTestCases.map((tc) => ({
          input: tc.input,
          expected_output: tc.expectedOutput,
          is_hidden: false,
        })),
        mode: 'submit',
      });

      const normalizedStatus =
        result.status === 'accepted'
          ? 'accepted'
          : result.status === 'wrong_answer'
            ? 'wrong_answer'
            : result.status === 'compilation_error'
              ? 'compilation_error'
              : result.status === 'runtime_error'
                ? 'runtime_error'
                : result.status === 'time_limit_exceeded'
                  ? 'time_limit_exceeded'
                  : result.status === 'memory_limit_exceeded'
                    ? 'memory_limit_exceeded'
                    : result.status === 'validation_error'
                      ? 'validation_error'
                      : result.status === 'unconfigured'
                        ? 'configuration_error'
                        : 'error';

      setExecutionResult({
        status: normalizedStatus,
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        message: result.message || 'Submission processed.',
        runtimeMs: result.execution_time_ms ?? undefined,
        memoryMb: result.memory_kb ? result.memory_kb / 1024 : undefined,
        testResults: problem.sampleTestCases.map((tc) => ({
          id: tc.id,
          passed: result.passed_test_count > 0,
          output: String(result.stdout || '').trim(),
          expected: tc.expectedOutput,
        })),
      });
    } catch (error) {
      setExecutionResult({
        status: 'configuration_error',
        message: error instanceof Error ? error.message : 'Unable to submit the solution.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell hideFooter>
      <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden bg-navy-950">
        {/* Workspace Top Toolbar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-navy-900/90 px-4 py-2.5 text-xs">
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
              <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-400 border border-indigo-500/30">
                Normal Coding Mode
              </span>
              <span className="font-bold text-white">{problem.title}</span>
              <span
                className={`rounded px-1.5 py-0.2 text-[10px] font-semibold ${
                  problem.difficulty === 'Easy'
                    ? 'text-emerald-400 bg-emerald-500/10'
                    : 'text-amber-400 bg-amber-500/10'
                }`}
              >
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
              <span>Ask AI Mentor</span>
            </Link>

            <button
              onClick={handleRunSampleTests}
              disabled={isRunning || isSubmitting}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50"
            >
              <Play className="h-3 w-3 fill-slate-300" />
              <span>{isRunning ? 'Running Sandbox...' : 'Run Samples'}</span>
            </button>

            <button
              onClick={handleSubmit}
              disabled={isRunning || isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              <Send className="h-3 w-3" />
              <span>{isSubmitting ? 'Grading...' : 'Submit Solution'}</span>
            </button>
          </div>
        </div>

        {/* Notice Banner */}
        <div className="px-4 pt-2">
          <SimulationBanner featureName="Judge0 CE Code Execution" />
        </div>

        {/* Main Split Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 flex-1 overflow-hidden p-4 gap-4">
          {/* Left Panel: Description & Problem Details */}
          <div className="flex flex-col rounded-2xl border border-slate-800 bg-navy-900/60 overflow-hidden backdrop-blur-md">
            {/* Tab Header */}
            <div className="flex items-center border-b border-slate-800 bg-navy-950/80 px-4 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('description')}
                className={`py-3 px-3 border-b-2 transition-colors ${
                  activeTab === 'description'
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Description
              </button>
              <button
                onClick={() => setActiveTab('submissions')}
                className={`py-3 px-3 border-b-2 transition-colors ${
                  activeTab === 'submissions'
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Submissions (5)
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 text-slate-300 text-xs leading-relaxed">
              {activeTab === 'description' ? (
                <>
                  <div className="prose prose-invert max-w-none text-xs">
                    <h2 className="text-lg font-bold text-white mb-2">{problem.title}</h2>
                    <p className="whitespace-pre-line text-slate-300">{problem.description}</p>
                  </div>

                  {/* Sample Test Cases Overview */}
                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold text-white uppercase text-[11px] tracking-wider">
                      Sample Examples
                    </h4>
                    {problem.sampleTestCases.map((tc, idx) => (
                      <div key={tc.id} className="rounded-xl border border-slate-800 bg-navy-950/80 p-3 font-mono text-[11px]">
                        <span className="text-slate-400 font-bold block mb-1">Example {idx + 1}:</span>
                        <div className="text-slate-300">
                          <span className="text-slate-500">Input: </span>{tc.input}
                        </div>
                        <div className="text-emerald-400">
                          <span className="text-slate-500">Expected Output: </span>{tc.expectedOutput}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-navy-950/40 p-3 text-[11px] text-slate-400">
                    <span className="font-bold text-slate-300 block mb-1">Constraints:</span>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>2 &le; nums.length &le; 10⁴</li>
                      <li>-10⁹ &le; nums[i] &le; 10⁹</li>
                      <li>Only one valid answer exists.</li>
                    </ul>
                  </div>
                </>
              ) : (
                /* Submissions Tab */
                <div className="space-y-3">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-emerald-400">Accepted</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Runtime: 42ms • Memory: 15.2MB</p>
                    </div>
                    <span className="text-[11px] text-slate-500">10 mins ago</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Editor + Console Runner */}
          <div className="flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <CodeEditor
                initialCode={code}
                language={language}
                onCodeChange={(newCode) => setCode(newCode)}
                onLanguageChange={(nextLanguage) => setLanguage(nextLanguage)}
                height="320px"
              />
            </div>

            <div className="h-56 flex flex-col rounded-2xl border border-slate-800 bg-navy-900/80 overflow-hidden backdrop-blur-md">
              {/* Console Tabs */}
              <div className="flex items-center justify-between border-b border-slate-800 bg-navy-950 px-4 py-2 text-xs">
                <div className="flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-teal-400" />
                  <span className="font-semibold text-slate-300">Test Console</span>
                  <div className="h-3 w-px bg-slate-800 mx-1"></div>
                  {problem.sampleTestCases.map((tc, idx) => (
                    <button
                      key={tc.id}
                      onClick={() => setActiveTestCaseTab(idx)}
                      className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                        activeTestCaseTab === idx
                          ? 'bg-slate-800 text-white font-bold'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Case {idx + 1}
                    </button>
                  ))}
                </div>

                {executionResult.runtimeMs && (
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                    <span>⏱ {executionResult.runtimeMs}ms</span>
                    <span>💾 {executionResult.memoryMb}MB</span>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 text-xs font-mono">
                {executionResult.status === 'running' ? (
                  <div className="flex items-center justify-center h-full gap-2 text-indigo-400">
                    <span className="h-4 w-4 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin"></span>
                    <span>Transmitting code to Judge0 CE container...</span>
                  </div>
                ) : executionResult.status === 'accepted' ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>All Sample Tests Passed!</span>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-navy-950 p-3 space-y-1.5 text-[11px]">
                      <div className="text-slate-400">
                        <span className="text-slate-500">Input: </span>
                        {problem.sampleTestCases[activeTestCaseTab]?.input}
                      </div>
                      <div className="text-emerald-400">
                        <span className="text-slate-500">Your Output: </span>
                        {executionResult.stdout || problem.sampleTestCases[activeTestCaseTab]?.expectedOutput}
                      </div>
                    </div>
                    {executionResult.message && <div className="text-slate-300">{executionResult.message}</div>}
                  </div>
                ) : executionResult.status === 'configuration_error' ? (
                  <div className="space-y-2 text-amber-300">
                    <p className="font-semibold">Execution is not configured yet.</p>
                    <p className="text-[11px] text-slate-300">{executionResult.message}</p>
                  </div>
                ) : executionResult.status !== 'idle' ? (
                  <div className="space-y-2 text-slate-300">
                    <p className="font-semibold text-rose-300">Execution status: {executionResult.status}</p>
                    {executionResult.message && <p>{executionResult.message}</p>}
                    {executionResult.stdout && (
                      <div className="rounded-lg bg-navy-950 p-2.5 border border-slate-800">
                        <span className="block text-[10px] uppercase text-slate-500 mb-1">Output</span>
                        <pre className="whitespace-pre-wrap text-[11px] text-slate-200">{executionResult.stdout}</pre>
                      </div>
                    )}
                    {executionResult.stderr && (
                      <div className="rounded-lg bg-rose-950/20 p-2.5 border border-rose-500/20">
                        <span className="block text-[10px] uppercase text-rose-400 mb-1">Error</span>
                        <pre className="whitespace-pre-wrap text-[11px] text-rose-200">{executionResult.stderr}</pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400 text-xs font-sans space-y-2">
                    <p className="font-semibold text-slate-300">Sample Case {activeTestCaseTab + 1}:</p>
                    <div className="rounded-lg bg-navy-950 p-2.5 font-mono text-[11px] border border-slate-800">
                      {problem.sampleTestCases[activeTestCaseTab]?.input}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Click <strong className="text-slate-300">Run Samples</strong> to evaluate your code against public test cases.
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
