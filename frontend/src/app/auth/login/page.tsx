'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Code2, ArrowRight, Shield, User, GraduationCap, Sparkles, CheckCircle2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { SimulationBanner } from '@/components/ui/SimulationBanner';
import { Role } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('alex.rivera@university.edu');
  const [password, setPassword] = useState('••••••••••••');
  const [selectedRole, setSelectedRole] = useState<Role>('student');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleQuickLogin = (role: Role) => {
    setSelectedRole(role);
    if (role === 'student') {
      setEmail('alex.rivera@university.edu');
    } else if (role === 'teacher') {
      setEmail('prof.marcus@university.edu');
    } else {
      setEmail('admin.root@codementor.ai');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg('');

    setTimeout(() => {
      setIsLoading(false);
      setSuccessMsg(`Authenticated as ${selectedRole.toUpperCase()}! Redirecting...`);
      setTimeout(() => {
        if (selectedRole === 'teacher') {
          router.push('/teacher');
        } else if (selectedRole === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      }, 700);
    }, 600);
  };

  return (
    <AppShell hideFooter>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <SimulationBanner featureName="Demo Authentication" />

          {/* Form Card */}
          <div className="rounded-2xl border border-slate-800 bg-navy-900/80 p-8 shadow-2xl backdrop-blur-xl">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Code2 className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Sign In to CodeMentor AI</h2>
              <p className="mt-1 text-xs text-slate-400">
                Choose a demo profile or enter test credentials to explore the platform.
              </p>
            </div>

            {/* Quick Role Switcher Chips */}
            <div className="mt-6">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Quick 1-Click Role Preview
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('student')}
                  className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-xs transition-all border ${
                    selectedRole === 'student'
                      ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300 font-semibold'
                      : 'border-slate-800 bg-navy-950/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User className="h-4 w-4 mb-1" />
                  <span>Student</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('teacher')}
                  className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-xs transition-all border ${
                    selectedRole === 'teacher'
                      ? 'border-teal-500 bg-teal-600/20 text-teal-300 font-semibold'
                      : 'border-slate-800 bg-navy-950/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <GraduationCap className="h-4 w-4 mb-1" />
                  <span>Teacher</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin')}
                  className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-xs transition-all border ${
                    selectedRole === 'admin'
                      ? 'border-rose-500 bg-rose-600/20 text-rose-300 font-semibold'
                      : 'border-slate-800 bg-navy-950/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Shield className="h-4 w-4 mb-1" />
                  <span>Admin</span>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => alert('Demo Mode: Any password string works!')}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              {successMsg && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                    Authenticating...
                  </span>
                ) : (
                  <>
                    <span>Enter {selectedRole.toUpperCase()} Portal</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-400">
              New to CodeMentor AI?{' '}
              <Link href="/auth/register" className="font-semibold text-indigo-400 hover:text-indigo-300">
                Create student account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
