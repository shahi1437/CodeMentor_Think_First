'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Layers,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Bug,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  Terminal,
  ShieldCheck,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SimulationBanner } from '@/components/ui/SimulationBanner';
import { CodeEditor } from '@/components/ui/CodeEditor';
import { ProblemDifficulty, ProblemMode } from '@/types';

export default function AdminProblemStudioPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'meta' | 'statement' | 'starter' | 'tests' | 'debugging'>('meta');

  // Form State
  const [title, setTitle] = useState('Off-by-One in Quickselect');
  const [slug, setSlug] = useState('quickselect-boundary-bug');
  const [difficulty, setDifficulty] = useState<ProblemDifficulty>('Medium');
  const [mode, setMode] = useState<ProblemMode>('debugging');
  const [category, setCategory] = useState('Divide & Conquer');
  const [tags, setTags] = useState('Quickselect, Boundary Condition, Recursion');
  const [description, setDescription] = useState(
    '### Bug Scenario: Partition Index Out of Bounds\nThe student implemented the Lomuto partition scheme for Quickselect to find the k-th smallest element. When k equals the array length, partition logic accesses an invalid index.\n\nFix the boundary condition without altering the average O(n) runtime.'
  );

  const [starterCode, setStarterCode] = useState(
    `def quickselect(nums, k):\n    # Buggy Lomuto Partition\n    pivot = nums[-1]\n    i = 0\n    for j in range(len(nums)):\n        if nums[j] < pivot:\n            nums[i], nums[j] = nums[j], nums[i]\n            i += 1\n    nums[i], nums[-1] = nums[-1], nums[i]\n    return nums[k] # BUG: missing bounds check\n`
  );

  const [sampleInput, setSampleInput] = useState('nums = [3,2,1,5,6,4], k = 2');
  const [sampleOutput, setSampleOutput] = useState('2');
  const [hiddenInput, setHiddenInput] = useState('nums = [1], k = 1');
  const [hiddenOutput, setHiddenOutput] = useState('1');

  // Debugging specifics
  const [symptom, setSymptom] = useState('IndexError on single-element list');
  const [hint1, setHint1] = useState('Notice the 0-based vs 1-based indexing for k.');
  const [hint2, setHint2] = useState('Convert k to 0-indexed k - 1 before comparison.');

  // Pre-verification state (Rule 14)
  const [isValidated, setIsValidated] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedSuccess, setPublishedSuccess] = useState(false);

  const handleValidateVariant = () => {
    setIsValidating(true);
    setTimeout(() => {
      setIsValidating(false);
      setIsValidated(true);
    }, 700);
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidated && mode === 'debugging') {
      alert('Rule 14 Enforced: Debugging variants must be pre-validated by the test harness before publishing.');
      return;
    }

    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      setPublishedSuccess(true);
      setTimeout(() => {
        router.push('/problems');
      }, 1000);
    }, 800);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <SimulationBanner featureName="Problem Studio Authoring Harness" />

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link href="/admin" className="text-slate-400 hover:text-white transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Problem Studio</h1>
              <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/30">
                Authoring Mode
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Create and calibrate new algorithmic challenges or pre-seeded debugging variants.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleValidateVariant}
              disabled={isValidating}
              className="flex items-center gap-1.5 rounded-xl border border-teal-500/30 bg-teal-500/10 px-3.5 py-2 text-xs font-bold text-teal-300 hover:bg-teal-500/20 transition-colors"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{isValidating ? 'Validating Variant...' : isValidated ? '✓ Variant Pre-Verified' : 'Pre-Verify Bug Variant'}</span>
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={isPublishing}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isPublishing ? 'Publishing...' : 'Publish to Bank'}</span>
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {publishedSuccess && (
          <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-xs text-emerald-300 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Problem "{title}" successfully published to Problem Hub! Redirecting...</span>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mt-6 flex border-b border-slate-800 text-xs font-semibold text-slate-400">
          {[
            { id: 'meta', label: '1. Metadata & Mode' },
            { id: 'statement', label: '2. Statement & Markdown' },
            { id: 'starter', label: '3. Starter Code' },
            { id: 'tests', label: '4. Test Case Suites' },
            { id: 'debugging', label: '5. Bug Variant Calibration' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-4 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-white font-bold'
                  : 'border-transparent hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Panes */}
        <div className="mt-6 rounded-2xl border border-slate-800 bg-navy-900/60 p-6 backdrop-blur-md">
          {activeTab === 'meta' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300">Problem Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">URL Slug</label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300">Learning Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as ProblemMode)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="normal">Normal Coding Mode</option>
                    <option value="debugging">Debugging Lab Mode</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as ProblemDifficulty)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 p-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {activeTab === 'statement' && (
            <div className="space-y-4">
              <label className="text-xs font-medium text-slate-300">Problem Statement (Markdown)</label>
              <textarea
                rows={8}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-navy-950 p-3 text-xs text-white font-mono leading-relaxed outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {activeTab === 'starter' && (
            <div className="space-y-4">
              <label className="text-xs font-medium text-slate-300">Starter Code Template</label>
              <textarea
                rows={10}
                value={starterCode}
                onChange={(e) => setStarterCode(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-navy-950 p-3 text-xs text-slate-200 font-mono leading-relaxed outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {activeTab === 'tests' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                  Public Sample Test Case (Visible to Students)
                </span>
                <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400">Sample Input</label>
                    <input
                      type="text"
                      value={sampleInput}
                      onChange={(e) => setSampleInput(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400">Sample Expected Output</label>
                    <input
                      type="text"
                      value={sampleOutput}
                      onChange={(e) => setSampleOutput(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 p-2 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-800">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                  Hidden Grading Test Case (Never sent to Client)
                </span>
                <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                  <div>
                    <label className="text-[11px] text-slate-400">Hidden Edge Input</label>
                    <input
                      type="text"
                      value={hiddenInput}
                      onChange={(e) => setHiddenInput(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400">Hidden Expected Output</label>
                    <input
                      type="text"
                      value={hiddenOutput}
                      onChange={(e) => setHiddenOutput(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 p-2 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'debugging' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-200">
                <strong className="block text-white font-bold mb-1">Rule 14 Validation Requirement:</strong>
                Never present unvalidated buggy code variants to students. All buggy snippets must be verified to ensure they reproduce the stated bug and pass upon applying the fix.
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300">Observed Bug Symptom Description</label>
                <input
                  type="text"
                  value={symptom}
                  onChange={(e) => setSymptom(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300">Socratic Hint Tier 1 (Nudge)</label>
                  <input
                    type="text"
                    value={hint1}
                    onChange={(e) => setHint1(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300">Socratic Hint Tier 2 (Clue)</label>
                  <input
                    type="text"
                    value={hint2}
                    onChange={(e) => setHint2(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
