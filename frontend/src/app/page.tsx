'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Code2,
  Bug,
  Sparkles,
  Dna,
  ShieldCheck,
  Cpu,
  ArrowRight,
  Terminal,
  CheckCircle2,
  Zap,
  BarChart3,
  Layers,
  ChevronRight,
  Play,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'normal' | 'debugging'>('debugging');

  return (
    <AppShell>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
        {/* Ambient Gradient Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[750px] rounded-full bg-gradient-to-tr from-indigo-600/20 via-teal-500/15 to-transparent blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-semibold text-indigo-300 backdrop-blur-md mb-8">
            <Sparkles className="h-3.5 w-3.5 text-teal-400" />
            <span>Next-Gen EdTech — AI Debugging Intelligence</span>
            <span className="h-1 w-1 rounded-full bg-indigo-400"></span>
            <span className="text-teal-300 font-mono text-[11px]">v1.0 Final-Year Project</span>
          </div>

          {/* Headline */}
          <h1 className="mx-auto max-w-4xl text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.15]">
            Master Programming Through <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-400 via-teal-300 to-indigo-300 bg-clip-text text-transparent">
              Interactive Bug Diagnosis
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed">
            Stop guessing errors. CodeMentor AI pairs real sandboxed problem solving with an in-house Machine Learning error classifier, Socratic AI mentor, and personalized Learning DNA profiling.
          </p>

          {/* Call to Actions */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/assessment"
              className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:from-indigo-500 hover:to-indigo-400 hover:scale-[1.02]"
            >
              <Zap className="h-4 w-4 text-teal-300" />
              <span>Take Free Diagnostic Assessment</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>

            <Link
              href="/problems"
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-navy-900/80 px-6 py-3.5 text-sm font-semibold text-slate-200 backdrop-blur-md transition-all hover:bg-slate-800 hover:border-slate-600 hover:text-white"
            >
              <Layers className="h-4 w-4 text-indigo-400" />
              <span>Browse Problem Hub</span>
            </Link>
          </div>

          {/* Feature Highlights Grid */}
          <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-4xl mx-auto">
            <div className="rounded-xl border border-slate-800 bg-navy-900/40 p-4 text-left">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 mb-2">
                <Code2 className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Normal Coding Mode</h4>
              <p className="mt-1 text-[11px] text-slate-400">Standard algorithm solving with private test-case safety.</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-navy-900/40 p-4 text-left">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-400 mb-2">
                <Bug className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Debugging Lab</h4>
              <p className="mt-1 text-[11px] text-slate-400">Diagnose real-world seeded bugs and logic flaws step-by-step.</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-navy-900/40 p-4 text-left">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 mb-2">
                <Dna className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Learning DNA</h4>
              <p className="mt-1 text-[11px] text-slate-400">Uncover your recurring mistake archetypes and blindspots.</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-navy-900/40 p-4 text-left">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 mb-2">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <h4 className="text-xs font-bold text-white">Judge0 CE Sandbox</h4>
              <p className="mt-1 text-[11px] text-slate-400">Isolated execution without touching the main backend server.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Mode Showcase Slider */}
      <section className="relative border-y border-slate-800/80 bg-navy-900/50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Two Distinct Learning Modes. One Unified Platform.
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Switch seamlessly between building algorithms from scratch and diagnosing tricky runtime bugs.
            </p>

            {/* Mode Toggle Buttons */}
            <div className="mt-6 inline-flex rounded-xl border border-slate-700 bg-navy-950 p-1">
              <button
                onClick={() => setActiveTab('normal')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                  activeTab === 'normal'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Normal Coding Mode</span>
              </button>
              <button
                onClick={() => setActiveTab('debugging')}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
                  activeTab === 'debugging'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Bug className="h-3.5 w-3.5" />
                <span>Debugging Lab Mode</span>
              </button>
            </div>
          </div>

          {/* Interactive Mode Preview Card */}
          <div className="rounded-2xl border border-slate-800 bg-navy-950 p-6 shadow-2xl backdrop-blur-xl">
            {activeTab === 'normal' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div>
                  <span className="rounded bg-indigo-500/20 px-2.5 py-1 text-xs font-bold text-indigo-400 border border-indigo-500/30">
                    Normal Coding Mode
                  </span>
                  <h3 className="mt-3 text-xl font-bold text-white">Build from Scratch with Instant Validation</h3>
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                    Write standard algorithmic solutions in Python, JavaScript, or C++. Run sample test cases in real-time, inspect performance metrics, and submit against confidential grading suites.
                  </p>
                  <ul className="mt-4 space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Monaco Editor integration with multi-language syntax
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Split public vs hidden test case execution
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Execution memory and runtime benchmarks
                    </li>
                  </ul>
                  <div className="mt-6">
                    <Link
                      href="/workspace/coding/p-1"
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                    >
                      <Play className="h-3.5 w-3.5 fill-white" />
                      <span>Launch Normal Coding Workspace</span>
                    </Link>
                  </div>
                </div>

                {/* Code Window Mockup */}
                <div className="rounded-xl border border-slate-800 bg-navy-900 p-4 font-mono text-xs">
                  <div className="text-slate-400 pb-2 border-b border-slate-800 flex items-center justify-between">
                    <span>two_sum.py</span>
                    <span className="text-[10px] text-emerald-400 font-sans">Ready to Run</span>
                  </div>
                  <pre className="mt-3 text-slate-200 overflow-x-auto leading-relaxed">
{`def two_sum(nums: list[int], target: int) -> list[int]:
    seen = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in seen:
            return [seen[diff], i]
        seen[num] = i
    return []`}
                  </pre>
                  <div className="mt-4 rounded-lg bg-slate-950 p-3 border border-slate-800 text-[11px]">
                    <span className="text-emerald-400 font-bold">✓ Sample Test Case 1 Passed</span>
                    <p className="text-slate-400 mt-1">Input: nums = [2,7,11,15], target = 9 | Output: [0,1]</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                <div>
                  <span className="rounded bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-300 border border-amber-500/30">
                    Debugging Lab Mode
                  </span>
                  <h3 className="mt-3 text-xl font-bold text-white">Pre-Seeded Bug Variants & Stack Trace Diagnostics</h3>
                  <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                    Face realistic buggy implementations written by other students. Analyze why edge cases fail, read Socratic clues, diagnose off-by-one errors, and repair the code.
                  </p>
                  <ul className="mt-4 space-y-2 text-xs text-slate-300">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-400" /> Highlighted faulty lines with regression testing
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-400" /> Multi-tier Socratic hints that teach without spoiling
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-amber-400" /> Direct feeding into your Learning DNA error profile
                    </li>
                  </ul>
                  <div className="mt-6">
                    <Link
                      href="/workspace/debugging/p-3"
                      className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 transition-colors"
                    >
                      <Bug className="h-3.5 w-3.5" />
                      <span>Launch Debugging Lab Workspace</span>
                    </Link>
                  </div>
                </div>

                {/* Bug Window Mockup */}
                <div className="rounded-xl border border-rose-500/30 bg-navy-900 p-4 font-mono text-xs">
                  <div className="text-rose-400 pb-2 border-b border-slate-800 flex items-center justify-between">
                    <span>buggy_binary_search.py</span>
                    <span className="text-[10px] text-rose-400 font-sans font-bold">Bug Detected (Line 7)</span>
                  </div>
                  <pre className="mt-3 text-slate-200 overflow-x-auto leading-relaxed">
{`def binary_search(nums, target):
    left = 0
    right = len(nums)
    while left < right:
        mid = (left + right) // 2
        if nums[mid] < target:
            left = mid  # 🐞 BUG: Infinite loop when left == mid!
        else:
            right = mid - 1`}
                  </pre>
                  <div className="mt-4 rounded-lg bg-rose-500/10 p-3 border border-rose-500/20 text-[11px]">
                    <span className="text-rose-400 font-bold">❌ Time Limit Exceeded</span>
                    <p className="text-slate-300 mt-1">Symptom: CPU timed out on missing target. The pointers never converge.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Learning Architecture Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              The CodeMentor AI Advantage
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Built on verified educational science and sandboxed engineering principles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-slate-800 bg-navy-900/60 p-6 backdrop-blur-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 mb-4">
                <Dna className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Learning DNA Tracking</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                We analyze your recurring logic slips over time — whether you struggle with loop bounds, state mutation, or recursion depth. You get a personalized profile of your programming cognitive fingerprint.
              </p>
              <Link href="/learning-dna" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                View your DNA profile <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-navy-900/60 p-6 backdrop-blur-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 mb-4">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Socratic AI Mentor</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Rather than giving away code answers that stunt student learning, our AI mentor asks probing Socratic questions, points out unhandled edge cases, and guides you to the &quot;Aha!&quot; moment.
              </p>
              <Link href="/mentor" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-teal-400 hover:text-teal-300">
                Meet AI Mentor <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-navy-900/60 p-6 backdrop-blur-md">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 mb-4">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Teacher Cohort Radar</h3>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                Instructors get real-time struggle alerts when students get stuck on debugging exercises for more than 15 minutes, enabling timely pedagogical intervention before dropouts occur.
              </p>
              <Link href="/teacher" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300">
                Instructor Dashboard <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="relative overflow-hidden border-t border-slate-800/80 bg-gradient-to-b from-navy-900 to-navy-950 py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold text-white">Ready to elevate your debugging intelligence?</h2>
          <p className="mt-3 text-sm text-slate-300 max-w-xl mx-auto">
            Take our 5-minute diagnostic placement quiz to map your programming strengths and error patterns right now.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/assessment"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-500 transition-colors"
            >
              Start Diagnostic Quiz
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-700 bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Explore Student Dashboard
            </Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
