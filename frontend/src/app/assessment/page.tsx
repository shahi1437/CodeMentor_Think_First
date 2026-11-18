'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Award,
  Zap,
  BarChart,
  Code2,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SimulationBanner } from '@/components/ui/SimulationBanner';
import { DIAGNOSTIC_QUESTIONS } from '@/lib/mock-data';

export default function DiagnosticAssessmentPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const currentQ = DIAGNOSTIC_QUESTIONS[currentIndex];
  const totalQuestions = DIAGNOSTIC_QUESTIONS.length;
  const progressPercent = Math.round(((currentIndex + 1) / totalQuestions) * 100);

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [questionId]: optionId,
    });
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Complete quiz
      setIsEvaluating(true);
      setTimeout(() => {
        setIsEvaluating(false);
        setIsCompleted(true);
      }, 700);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setCurrentIndex(0);
    setIsCompleted(false);
  };

  // Calculate score
  let correctCount = 0;
  DIAGNOSTIC_QUESTIONS.forEach((q) => {
    const selected = selectedAnswers[q.id];
    const correctOption = q.options.find((o) => o.isCorrect);
    if (selected && correctOption && selected === correctOption.id) {
      correctCount += 1;
    }
  });
  const scorePercent = Math.round((correctCount / totalQuestions) * 100);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <SimulationBanner featureName="Diagnostic Placement Evaluator" />

        {/* Assessment Container */}
        <div className="rounded-2xl border border-slate-800 bg-navy-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 pb-5 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-400 border border-teal-500/30">
                  Diagnostic Quiz
                </span>
                <span className="text-xs text-slate-400">Baseline Placement</span>
              </div>
              <h1 className="mt-1 text-xl font-bold tracking-tight text-white sm:text-2xl">
                Programming & Debugging Aptitude Assessment
              </h1>
            </div>

            {!isCompleted && !isEvaluating && (
              <div className="text-right">
                <span className="text-xs font-mono text-indigo-400">
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <div className="mt-1 h-2 w-36 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-teal-400 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Evaluating State */}
          {isEvaluating ? (
            <div className="py-16 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 animate-pulse">
                <Zap className="h-7 w-7 animate-bounce" />
              </div>
              <h3 className="text-lg font-bold text-white">Analyzing Your Diagnostic Profile...</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Synthesizing response patterns across syntax, logic bounds, and time complexity.
              </p>
            </div>
          ) : isCompleted ? (
            /* Results & Placement Report */
            <div className="py-6 space-y-6 animate-in fade-in">
              <div className="rounded-2xl border border-teal-500/30 bg-gradient-to-r from-teal-950/40 to-navy-900 p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-500/20 text-teal-400 mb-2">
                  <Award className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-bold text-white">Assessment Complete!</h2>
                <p className="text-xs text-slate-300 mt-1">
                  You answered <strong className="text-white">{correctCount}</strong> out of <strong className="text-white">{totalQuestions}</strong> questions correctly ({scorePercent}%).
                </p>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-navy-950 px-4 py-1.5 border border-slate-700 text-xs">
                  <span className="text-slate-400">Assigned Level:</span>
                  <span className="font-bold text-teal-400">
                    {scorePercent >= 75 ? 'Intermediate (Proficient)' : scorePercent >= 50 ? 'Foundational Explorer' : 'Beginner Remediation'}
                  </span>
                </div>
              </div>

              {/* Question-by-Question Breakdown */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Detailed Explanations</h3>
                {DIAGNOSTIC_QUESTIONS.map((q, idx) => {
                  const userChoice = selectedAnswers[q.id];
                  const correct = q.options.find((o) => o.isCorrect);
                  const isUserCorrect = userChoice === correct?.id;

                  return (
                    <div
                      key={q.id}
                      className={`rounded-xl border p-4 text-xs ${
                        isUserCorrect
                          ? 'border-emerald-500/30 bg-emerald-950/20'
                          : 'border-rose-500/30 bg-rose-950/20'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="flex items-center gap-1.5 text-white">
                          {isUserCorrect ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <XCircle className="h-4 w-4 text-rose-400" />
                          )}
                          Q{idx + 1}: {q.category}
                        </span>
                        <span className={`text-[10px] uppercase font-bold ${isUserCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isUserCorrect ? 'Correct' : 'Needs Review'}
                        </span>
                      </div>
                      <p className="mt-2 text-slate-300">{q.question}</p>
                      <div className="mt-2 rounded-lg bg-navy-950 p-2.5 text-[11px] text-slate-400 border border-slate-800">
                        <strong className="text-slate-200">Explanation:</strong> {q.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-800">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors shadow-lg"
                >
                  <span>Apply to Student Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/problems?mode=debugging"
                  className="flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-amber-500 transition-colors"
                >
                  <span>Start Recommended Bug Lab</span>
                </Link>
                <button
                  onClick={handleRetake}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-navy-950 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Retake Quiz</span>
                </button>
              </div>
            </div>
          ) : (
            /* Active Question State */
            <div className="py-6 space-y-6">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
                  {currentQ.category}
                </span>
                <h2 className="mt-1 text-base font-semibold text-white leading-relaxed">
                  {currentQ.question}
                </h2>
              </div>

              {/* Code Snippet Box (if question contains code) */}
              {currentQ.codeSnippet && (
                <div className="rounded-xl border border-slate-800 bg-navy-950 p-4 font-mono text-xs text-slate-200">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Code2 className="h-3.5 w-3.5 text-teal-400" /> snippet.py
                    </span>
                    <span>Read-Only</span>
                  </div>
                  <pre className="overflow-x-auto leading-relaxed">{currentQ.codeSnippet}</pre>
                </div>
              )}

              {/* Options Radio List */}
              <div className="space-y-2.5">
                {currentQ.options.map((opt) => {
                  const isSelected = selectedAnswers[currentQ.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleSelectOption(currentQ.id, opt.id)}
                      className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left text-xs transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-600/20 text-white font-medium shadow-md'
                          : 'border-slate-800 bg-navy-950/60 text-slate-300 hover:border-slate-700 hover:bg-navy-950'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold uppercase ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {opt.id}
                        </span>
                        <span>{opt.text}</span>
                      </div>
                      {isSelected && <CheckCircle2 className="h-4 w-4 text-indigo-400 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>

              {/* Footer navigation */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                  className="rounded-lg border border-slate-700 bg-navy-950 px-3.5 py-2 text-xs font-semibold text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>

                <button
                  onClick={handleNext}
                  disabled={!selectedAnswers[currentQ.id]}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg hover:bg-indigo-500 disabled:opacity-40 transition-all"
                >
                  <span>{currentIndex === totalQuestions - 1 ? 'Finish & Grade' : 'Next Question'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
