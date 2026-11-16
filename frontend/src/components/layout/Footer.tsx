import React from 'react';
import Link from 'next/link';
import { Code2, Heart, Shield, Cpu, Terminal, BookOpen } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-navy-950/90 pt-12 pb-8 text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand info */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-400 p-0.5">
                <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-navy-950">
                  <Code2 className="h-4 w-4 text-indigo-400" />
                </div>
              </div>
              <span className="text-base font-bold text-white tracking-tight">CodeMentor AI</span>
            </div>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-slate-400">
              AI-powered debugging intelligence and adaptive programming platform. Empowering students to build deep mental models through Socratic debugging and Learning DNA tracking.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
              <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-slate-300 border border-slate-700/60 flex items-center gap-1">
                <Cpu className="h-3 w-3 text-indigo-400" /> Modular Monolith
              </span>
              <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-slate-300 border border-slate-700/60 flex items-center gap-1">
                <Shield className="h-3 w-3 text-teal-400" /> Judge0 CE Sandboxing
              </span>
              <span className="rounded-full bg-slate-800/80 px-2.5 py-1 text-slate-300 border border-slate-700/60 flex items-center gap-1">
                <Terminal className="h-3 w-3 text-amber-400" /> Scikit-learn Classifier
              </span>
            </div>
          </div>

          {/* Core Learning links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">Learning Modes</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/workspace/coding/p-1" className="hover:text-indigo-400 transition-colors">Normal Coding Workspace</Link>
              </li>
              <li>
                <Link href="/workspace/debugging/p-3" className="hover:text-indigo-400 transition-colors">Debugging Lab</Link>
              </li>
              <li>
                <Link href="/problems" className="hover:text-indigo-400 transition-colors">Problem Hub</Link>
              </li>
              <li>
                <Link href="/assessment" className="hover:text-indigo-400 transition-colors">Diagnostic Assessment</Link>
              </li>
              <li>
                <Link href="/analyzer" className="hover:text-indigo-400 transition-colors">Visual Code Analyzer</Link>
              </li>
            </ul>
          </div>

          {/* AI Intelligence links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">Adaptive AI</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/mentor" className="hover:text-indigo-400 transition-colors">Socratic AI Mentor</Link>
              </li>
              <li>
                <Link href="/learning-dna" className="hover:text-indigo-400 transition-colors">Learning DNA Profile</Link>
              </li>
              <li>
                <Link href="/daily-plan" className="hover:text-indigo-400 transition-colors">Adaptive Daily Plan</Link>
              </li>
              <li>
                <Link href="/history" className="hover:text-indigo-400 transition-colors">Submission History</Link>
              </li>
            </ul>
          </div>

          {/* Faculty & Admin */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">Institutional</h4>
            <ul className="mt-3 space-y-2 text-xs">
              <li>
                <Link href="/teacher" className="hover:text-teal-400 transition-colors">Teacher Cohort Radar</Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-teal-400 transition-colors">Admin Health & Sandbox</Link>
              </li>
              <li>
                <Link href="/admin/problems/new" className="hover:text-teal-400 transition-colors">Problem Studio</Link>
              </li>
              <li>
                <Link href="/auth/login" className="hover:text-teal-400 transition-colors">Role Login</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 CodeMentor AI. Final-Year Engineering Project. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 flex items-center gap-1">
            Built with Next.js, TypeScript, Tailwind CSS & FastAPI
          </p>
        </div>
      </div>
    </footer>
  );
};
