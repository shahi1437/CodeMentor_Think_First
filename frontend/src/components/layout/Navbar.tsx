'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Code2,
  Bug,
  Sparkles,
  Dna,
  Calendar,
  History,
  GraduationCap,
  ShieldCheck,
  Menu,
  X,
  Flame,
  Search,
  Bell,
  ChevronDown,
  Layers,
  Terminal,
} from 'lucide-react';
import { Role } from '@/types';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<Role>('student');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const navLinks = [
    { label: 'Problem Hub', href: '/problems', icon: Layers },
    { label: 'Normal Coding', href: '/workspace/coding/p-1', icon: Code2, modeTag: 'Normal' },
    { label: 'Debugging Lab', href: '/workspace/debugging/p-3', icon: Bug, modeTag: 'Debug' },
    { label: 'AI Mentor', href: '/mentor', icon: Sparkles },
    { label: 'Learning DNA', href: '/learning-dna', icon: Dna },
    { label: 'Daily Plan', href: '/daily-plan', icon: Calendar },
    { label: 'Analyzer', href: '/analyzer', icon: Terminal },
    { label: 'Teacher', href: '/teacher', icon: GraduationCap, role: 'teacher' },
    { label: 'Admin', href: '/admin', icon: ShieldCheck, role: 'admin' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-navy-950/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href="/" className="group flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-teal-400 p-0.5 shadow-lg shadow-indigo-500/20">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-navy-950">
                <Code2 className="h-5 w-5 text-indigo-400 transition-colors group-hover:text-teal-300" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-white flex items-center gap-1.5">
                CodeMentor <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-bold text-indigo-400 uppercase tracking-wider border border-indigo-500/30">AI</span>
              </span>
              <span className="text-[10px] font-medium text-slate-400 tracking-wide">Adaptive Debugging</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.slice(0, 7).map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.modeTag === 'Debug' && (
                    <span className="ml-0.5 rounded bg-amber-500/20 px-1 py-0.2 text-[9px] font-bold text-amber-300 border border-amber-500/30">
                      Bug Lab
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Quick Assessment link */}
          <Link
            href="/assessment"
            className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-teal-400 hover:text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Diagnostic Test</span>
          </Link>

          {/* Role Preview Switcher */}
          <div className="relative hidden sm:block">
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900/90 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:border-slate-600"
              title="Switch role view to preview Student, Teacher, or Admin UI"
            >
              <span className="text-[10px] uppercase text-slate-400 font-semibold">Role:</span>
              <span className="capitalize font-semibold text-indigo-400">{currentRole}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {roleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-700 bg-navy-900 p-1.5 shadow-2xl backdrop-blur-xl z-50">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Switch Active Role
                </div>
                <button
                  onClick={() => { setCurrentRole('student'); setRoleDropdownOpen(false); }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${currentRole === 'student' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <span className="font-medium">Student (Alex R.)</span>
                  {currentRole === 'student' && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>}
                </button>
                <Link
                  href="/teacher"
                  onClick={() => { setCurrentRole('teacher'); setRoleDropdownOpen(false); }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${currentRole === 'teacher' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <span className="font-medium">Teacher (Prof. Marcus)</span>
                  {currentRole === 'teacher' && <span className="h-1.5 w-1.5 rounded-full bg-teal-400"></span>}
                </Link>
                <Link
                  href="/admin"
                  onClick={() => { setCurrentRole('admin'); setRoleDropdownOpen(false); }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${currentRole === 'admin' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-300 hover:bg-slate-800'}`}
                >
                  <span className="font-medium">Admin (System)</span>
                  {currentRole === 'admin' && <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>}
                </Link>
              </div>
            )}
          </div>

          {/* Student Streak Badge */}
          <Link
            href="/dashboard"
            className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300 transition-transform hover:scale-105"
            title="14-day learning streak"
          >
            <Flame className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            <span>14d</span>
          </Link>

          {/* Auth Button or User Avatar */}
          <Link
            href="/auth/login"
            className="hidden sm:inline-flex items-center justify-center rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-500"
          >
            Sign In
          </Link>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="border-b border-slate-800 bg-navy-950 px-4 pt-2 pb-6 lg:hidden animate-in slide-in-from-top-4">
          <div className="grid grid-cols-2 gap-2 pt-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-900/60 p-2.5 text-xs font-medium text-slate-200 hover:border-indigo-500/40 hover:text-white"
                >
                  <Icon className="h-4 w-4 text-indigo-400" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <Link
              href="/history"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-900/60 p-2.5 text-xs font-medium text-slate-200 hover:border-indigo-500/40"
            >
              <History className="h-4 w-4 text-teal-400" />
              <span>Learning History</span>
            </Link>
            <Link
              href="/auth/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-600/20 p-2.5 text-xs font-semibold text-indigo-300"
            >
              <Code2 className="h-4 w-4" />
              <span>Login / Register</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
