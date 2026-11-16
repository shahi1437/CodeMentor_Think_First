import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CodeMentor AI — Adaptive Debugging & Programming Intelligence',
  description: 'AI-powered programming learning platform with interactive bug diagnosis, Learning DNA tracking, and safe sandboxed execution.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-navy-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
