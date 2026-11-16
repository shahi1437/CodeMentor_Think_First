import React from 'react';
import { AlertCircle, Terminal, Cpu } from 'lucide-react';

interface SimulationBannerProps {
  featureName?: string;
}

export const SimulationBanner: React.FC<SimulationBannerProps> = ({ featureName }) => {
  return (
    <div className="mb-4 rounded-lg border border-indigo-500/30 bg-indigo-950/40 px-4 py-2.5 text-xs text-indigo-200 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400">
            <Cpu className="h-3.5 w-3.5" />
          </span>
          <span>
            <strong className="text-white font-semibold">Demo Simulation Mode:</strong>{' '}
            {featureName ? `${featureName} is currently running with realistic client simulation.` : 'Features are running with simulated client-side logic.'}
            {' '}Full Judge0 CE sandboxes & LLM agent backend will integrate in Phase 2.
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Client Active</span>
        </div>
      </div>
    </div>
  );
};
