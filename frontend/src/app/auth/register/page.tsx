'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Code2, Sparkles } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { supabaseConfigMessage } from '@/lib/supabase/config';
import { getVerifiedRole, portalDestination } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [primaryLang, setPrimaryLang] = useState('python');
  const [goal, setGoal] = useState('pass_interviews');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) throw new Error(supabaseConfigMessage);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: new URL('/auth/callback', window.location.origin).href,
          data: {
            full_name: name,
            preferred_language: primaryLang,
            learning_goal: goal,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message || 'Registration failed. Please try again.');
        setIsSubmitting(false);
        return;
      }

      if (data.session) {
        const role = await getVerifiedRole(data.session.access_token);
        router.replace(portalDestination(role));
        return;
      }
      setSuccessMessage('Check your email for the confirmation link to continue.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unexpected error during registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell hideFooter>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-navy-900/80 p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs font-semibold uppercase text-indigo-400">Step {step} of 2</span>
              <div className="flex gap-1.5">
                <span className={`h-1.5 w-6 rounded-full ${step >= 1 ? 'bg-indigo-500' : 'bg-slate-800'}`}></span>
                <span className={`h-1.5 w-6 rounded-full ${step >= 2 ? 'bg-indigo-500' : 'bg-slate-800'}`}></span>
              </div>
            </div>

            {step === 1 ? (
              <form onSubmit={(event) => { event.preventDefault(); setStep(2); }}>
                <div className="text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                    <Code2 className="h-6 w-6" />
                  </div>
                  <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Create Your Student Account</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Begin your personalized debugging and programming curriculum.
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300">Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Alex Rivera"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
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
                      required
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300">Password</label>
                    <input
                      type="password"
                      autoComplete="new-password"
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                    />
                  </div>

                  {errorMessage && (
                    <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
                      {errorMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors"
                  >
                    <span>Continue to Learning Profile</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
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

                  {errorMessage && (
                    <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
                      {errorMessage}
                    </div>
                  )}
                  {successMessage && (
                    <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                      <span>{successMessage}</span>
                    </div>
                  )}

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
                          <span>Create Account</span>
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
