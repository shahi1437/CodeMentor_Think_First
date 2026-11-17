'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Code2, GraduationCap, Shield, User } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { normalizeRole, setStoredSession } from '@/lib/auth';
import { Role } from '@/types';

const defaultCredentials: Record<Role, { email: string; password: string }> = {
  student: { email: 'student@codementor.ai', password: 'Secret123!' },
  teacher: { email: 'teacher@codementor.ai', password: 'Secret123!' },
  admin: { email: 'admin@codementor.ai', password: 'Secret123!' },
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(defaultCredentials.student.email);
  const [password, setPassword] = useState(defaultCredentials.student.password);
  const [selectedRole, setSelectedRole] = useState<Role>('student');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleQuickLogin = (role: Role) => {
    setSelectedRole(role);
    setEmail(defaultCredentials[role].email);
    setPassword(defaultCredentials[role].password);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setErrorMsg('Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.user) {
        setErrorMsg(error?.message || 'Unable to sign in. Please check your credentials.');
        setIsLoading(false);
        return;
      }

      const role = normalizeRole(data.user.app_metadata?.role ?? data.user.user_metadata?.role ?? 'student');
      setStoredSession({
        role,
        email: data.user.email || email,
        full_name: data.user.user_metadata?.full_name ?? null,
        id: data.user.id,
      });

      setSuccessMsg(`Signed in as ${role}. Redirecting...`);
      const targetRoute = role === 'teacher' ? '/teacher' : role === 'admin' ? '/admin' : '/dashboard';
      setTimeout(() => router.push(targetRoute), 350);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Unexpected authentication error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppShell hideFooter>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-navy-900/80 p-8 shadow-2xl backdrop-blur-xl">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Code2 className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Sign In to CodeMentor AI</h2>
              <p className="mt-1 text-xs text-slate-400">
                Use your Supabase account to access your secure learning workspace.
              </p>
            </div>

            <div className="mt-6">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Quick account template
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {(['student', 'teacher', 'admin'] as Role[]).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleQuickLogin(role)}
                    className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-xs transition-all border ${
                      selectedRole === role
                        ? role === 'student'
                          ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300 font-semibold'
                          : role === 'teacher'
                            ? 'border-teal-500 bg-teal-600/20 text-teal-300 font-semibold'
                            : 'border-rose-500 bg-rose-600/20 text-rose-300 font-semibold'
                        : 'border-slate-800 bg-navy-950/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {role === 'student' ? <User className="h-4 w-4 mb-1" /> : role === 'teacher' ? <GraduationCap className="h-4 w-4 mb-1" /> : <Shield className="h-4 w-4 mb-1" />}
                    <span className="capitalize">{role}</span>
                  </button>
                ))}
              </div>
            </div>

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
                <label className="text-xs font-medium text-slate-300">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-navy-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                />
              </div>

              {errorMsg && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
                  {errorMsg}
                </div>
              )}

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
