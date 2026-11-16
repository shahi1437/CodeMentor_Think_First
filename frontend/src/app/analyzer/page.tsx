'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Terminal,
  Cpu,
  BarChart2,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Play,
  RotateCcw,
  Sliders,
  Layers,
  Zap,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SimulationBanner } from '@/components/ui/SimulationBanner';
import { CodeEditor } from '@/components/ui/CodeEditor';

export default function VisualCodeAnalyzerPage() {
  const [selectedPreset, setSelectedPreset] = useState<'binary_search' | 'nested_loop' | 'list_mutation'>('binary_search');
  const [currentStep, setCurrentStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const presets = {
    binary_search: {
      title: 'Binary Search (Logarithmic)',
      code: `def binary_search(nums, target):\n    left, right = 0, len(nums) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1`,
      timeComplexity: 'O(log n)',
      spaceComplexity: 'O(1)',
      smells: [
        { label: 'Integer Overflow in other languages', severity: 'low', desc: 'In C++ or Java, (left + right) // 2 can overflow. Use left + (right - left) // 2.' },
        { label: 'Proper variable scoping', severity: 'clean', desc: 'No global variable leaks detected.' },
      ],
      steps: [
        { step: 1, line: 2, left: 0, right: 5, mid: 2, stateText: 'Initialize left=0, right=5, mid=2. nums[mid] = 3.' },
        { step: 2, line: 7, left: 3, right: 5, mid: 4, stateText: 'Target 9 > 3, advance left to mid+1=3. New mid=4.' },
        { step: 3, line: 6, left: 3, right: 5, mid: 4, stateText: 'Match found at mid=4! Return index 4 cleanly.' },
      ],
    },
    nested_loop: {
      title: 'Two Sum (Quadratic Antipattern)',
      code: `def two_sum_naive(nums, target):\n    n = len(nums)\n    for i in range(n):\n        for j in range(i + 1, n):\n            if nums[i] + nums[j] == target:\n                return [i, j]\n    return []`,
      timeComplexity: 'O(n²)',
      spaceComplexity: 'O(1)',
      smells: [
        { label: 'Quadratic Time Antipattern', severity: 'high', desc: 'Nested loops through array. Optimize with a Hash Map to reduce to O(n) runtime.' },
        { label: 'Redundant Calculations', severity: 'medium', desc: 'Re-evaluating pairwise sums repeatedly without memoization.' },
      ],
      steps: [
        { step: 1, line: 3, i: 0, j: 1, stateText: 'Outer loop i=0, inner loop j=1. Sum = 2 + 7 = 9.' },
        { step: 2, line: 6, i: 0, j: 1, stateText: 'Sum equals target 9! Return [0, 1].' },
      ],
    },
    list_mutation: {
      title: 'In-Place Mutation Antipattern',
      code: `def remove_odds(nums):\n    for x in nums:\n        if x % 2 != 0:\n            nums.remove(x)\n    return nums`,
      timeComplexity: 'O(n²)',
      spaceComplexity: 'O(1)',
      smells: [
        { label: 'Collection Mutation During Iteration', severity: 'high', desc: 'Modifying array while iterating causes skipped elements.' },
        { label: 'O(n) remove inside O(n) loop', severity: 'high', desc: 'nums.remove(x) does a linear search, yielding overall O(n²) worst-case runtime.' },
      ],
      steps: [
        { step: 1, line: 2, currentItem: 1, stateText: 'Element 1 is odd. nums.remove(1) shifts remaining items left.' },
        { step: 2, line: 2, currentItem: 3, stateText: 'Iterator advances to index 1, accidentally skipping element 2!' },
      ],
    },
  };

  const currentPresetData = presets[selectedPreset];

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setCurrentStep(1);
    }, 500);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SimulationBanner featureName="AST & Static Complexity Analyzer" />

        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-6 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Visual Code Analyzer</h1>
              <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/30">
                Static & Dynamic Trace
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Inspect asymptotic time/space complexity, visualize execution steps, and catch latent code smells.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-semibold uppercase text-slate-400">Sample Snippet:</span>
            <button
              onClick={() => { setSelectedPreset('binary_search'); handleAnalyze(); }}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                selectedPreset === 'binary_search' ? 'bg-indigo-600 text-white font-bold' : 'bg-navy-900 text-slate-400 hover:text-white'
              }`}
            >
              Binary Search
            </button>
            <button
              onClick={() => { setSelectedPreset('nested_loop'); handleAnalyze(); }}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                selectedPreset === 'nested_loop' ? 'bg-indigo-600 text-white font-bold' : 'bg-navy-900 text-slate-400 hover:text-white'
              }`}
            >
              Nested Loops
            </button>
            <button
              onClick={() => { setSelectedPreset('list_mutation'); handleAnalyze(); }}
              className={`rounded-lg px-2.5 py-1 transition-all ${
                selectedPreset === 'list_mutation' ? 'bg-indigo-600 text-white font-bold' : 'bg-navy-900 text-slate-400 hover:text-white'
              }`}
            >
              List Mutation
            </button>
          </div>
        </div>

        {/* Main Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Code Snippet */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{currentPresetData.title}</h3>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
              >
                <Zap className="h-3.5 w-3.5" />
                <span>{isAnalyzing ? 'Analyzing...' : 'Run Deep Analysis'}</span>
              </button>
            </div>

            <CodeEditor
              initialCode={currentPresetData.code}
              language="python"
              height="360px"
              readOnly
            />

            {/* Static Code Smells & Antipatterns */}
            <div className="rounded-2xl border border-slate-800 bg-navy-900/60 p-5 backdrop-blur-md space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Static Antipattern & Smell Detection
              </h4>
              <div className="space-y-2">
                {currentPresetData.smells.map((smell, i) => (
                  <div
                    key={i}
                    className={`rounded-xl border p-3 text-xs ${
                      smell.severity === 'high'
                        ? 'border-rose-500/30 bg-rose-950/20 text-rose-200'
                        : smell.severity === 'medium'
                        ? 'border-amber-500/30 bg-amber-950/20 text-amber-200'
                        : 'border-emerald-500/30 bg-emerald-950/20 text-emerald-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{smell.label}</span>
                      <span className="text-[10px] uppercase">{smell.severity}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">{smell.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Complexity Gauges & Interactive Step Tracer */}
          <div className="space-y-6">
            {/* Complexity Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-indigo-500/30 bg-navy-900/80 p-5 text-center">
                <span className="text-[11px] font-semibold uppercase text-indigo-400">Time Complexity</span>
                <div className="mt-2 text-3xl font-mono font-extrabold text-white">
                  {currentPresetData.timeComplexity}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Worst-Case Asymptotic Bound</p>
              </div>

              <div className="rounded-2xl border border-teal-500/30 bg-navy-900/80 p-5 text-center">
                <span className="text-[11px] font-semibold uppercase text-teal-400">Space Complexity</span>
                <div className="mt-2 text-3xl font-mono font-extrabold text-white">
                  {currentPresetData.spaceComplexity}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Auxiliary Memory Consumption</p>
              </div>
            </div>

            {/* Interactive Execution Step Visualizer */}
            <div className="rounded-2xl border border-slate-800 bg-navy-900/60 p-6 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">Execution Timeline Simulator</h4>
                  <p className="text-xs text-slate-400">Step through memory states and variable bindings</p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 font-mono text-xs text-indigo-300">
                  Step {currentStep} of {currentPresetData.steps.length}
                </span>
              </div>

              {/* Slider Controller */}
              <div className="space-y-2">
                <input
                  type="range"
                  min={1}
                  max={currentPresetData.steps.length}
                  value={currentStep}
                  onChange={(e) => setCurrentStep(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Start (Init)</span>
                  <span>End (Return)</span>
                </div>
              </div>

              {/* State Display Box */}
              <div className="rounded-xl border border-slate-700 bg-navy-950 p-4 font-mono text-xs space-y-3">
                <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800 text-[11px]">
                  <span>Active Line: #{currentPresetData.steps[currentStep - 1]?.line || 1}</span>
                  <span className="text-teal-400 font-bold">Memory Frame: Local</span>
                </div>
                <p className="text-slate-200 text-xs font-sans leading-relaxed">
                  {currentPresetData.steps[currentStep - 1]?.stateText}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                  disabled={currentStep === 1}
                  className="flex-1 rounded-xl border border-slate-700 bg-navy-950 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                >
                  ← Previous Step
                </button>
                <button
                  onClick={() => setCurrentStep(Math.min(currentPresetData.steps.length, currentStep + 1))}
                  disabled={currentStep === currentPresetData.steps.length}
                  className="flex-1 rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-500 disabled:opacity-40"
                >
                  Next Step →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
