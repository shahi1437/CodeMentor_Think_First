'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Code2, ArrowRight, CheckCircle2, Sparkles, BookOpen } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SimulationBanner } from '@/components/ui/SimulationBanner';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [primaryLang, setPrimaryLang] = useState('python');
  const [goal, setGoal] = useState('pass_interviews');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      router.push('/assessment');
    }, 800);
  };

  return (
    <AppShell hideFooter>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <SimulationBanner featureName="Student Registration" />

          <div className="rounded-2xl border border-slate-800 bg-navy-900/80 p-8 shadow-2xl backdrop-blur-xl">
            {/* Step indicator */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-semibold uppercase text-indigo-400">Step {step} of 2</span>
              <div className="flex gap-1.5">
                <span className={`h-1.5 w-6 rounded-full ${step >= 1 ? 'bg-indigo-500' : 'bg-slate-800'}`}></span>
                <span className={`h-1.5 w-6 rounded-full ${step >= 2 ? 'bg-indigo-500' : 'bg-slate-800'}`}></span>
              </div>
            </div>

            {step === 1 ? (
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Create Your Student Account</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Begin your personalized debugging and programming curriculum.
                </p>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Alex Rivera"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300">University / Academic Email</label>
                    <input
                      type="email"
                      placeholder="alex.rivera@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300">Password</label>
                    <input
                      type="password"
                      placeholder="Create a strong password"
                      defaultValue="Secret123!"
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors"
                  >
                    <span>Continue to Learning Profile</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleComplete}>
                <h2 className="text-2xl font-bold tracking-tight text-white">Customize Your Learning Path</h2>
                <p className="mt-1 text-xs text-slate-400">
                  Tell us your target programming language and current learning milestone.
                </p>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300">Primary Programming Language</label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {['python', 'javascript', 'cpp'].map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setPrimaryLang(lang)}
                          className={`rounded-xl border p-2 text-xs font-medium uppercase transition-all ${
                            primaryLang === lang
                              ? 'border-teal-500 bg-teal-500/20 text-teal-300 font-bold'
                              : 'border-slate-800 bg-navy-950/60 text-slate-400 hover:text-white'
                          }`}
                        >
                          {lang === 'cpp' ? 'C++' : lang}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300">Primary Learning Goal</label>
                    <div className="mt-2 space-y-2">
                      {[
                        { id: 'pass_course', label: 'Ace University Computer Science Coursework' },
                        { id: 'pass_interviews', label: 'Technical Coding & Debugging Interview Prep' },
                        { id: 'master_fundamentals', label: 'Master Data Structures & Error Diagnosis' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setGoal(item.id)}
                          className={`flex w-full items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition-all ${
                            goal === item.id
                              ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300 font-semibold'
                              : 'border-slate-800 bg-navy-950/60 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <div className={`h-2 w-2 rounded-full ${goal === item.id ? 'bg-indigo-400' : 'bg-slate-700'}`}></div>
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-teal-500 transition-colors disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>Configuring Workspace...</span>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          <span>Start Placement Diagnostic</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="mt-6 text-center text-xs text-slate-400">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-semibold text-indigo-400 hover:text-indigo-300">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
