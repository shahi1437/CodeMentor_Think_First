import React from 'react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface AppShellProps {
  children: React.ReactNode;
  hideFooter?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({ children, hideFooter = false }) => {
  return (
    <div className="min-h-screen flex flex-col bg-navy-950 text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
      <Navbar />
      <main className="flex-1 w-full">{children}</main>
      {!hideFooter && <Footer />}
    </div>
  );
};
