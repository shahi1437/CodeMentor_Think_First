import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  accentColor?: 'indigo' | 'teal' | 'amber' | 'rose';
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'indigo',
}) => {
  const colorMap = {
    indigo: {
      bg: 'bg-indigo-500/10',
      text: 'text-indigo-400',
      border: 'border-indigo-500/20',
      glow: 'group-hover:border-indigo-500/40',
    },
    teal: {
      bg: 'bg-teal-500/10',
      text: 'text-teal-400',
      border: 'border-teal-500/20',
      glow: 'group-hover:border-teal-500/40',
    },
    amber: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      glow: 'group-hover:border-amber-500/40',
    },
    rose: {
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      border: 'border-rose-500/20',
      glow: 'group-hover:border-rose-500/40',
    },
  };

  const colors = colorMap[accentColor];

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border ${colors.border} bg-navy-900/60 p-5 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${colors.glow}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-400 tracking-wide uppercase">{title}</p>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors.bg} ${colors.text}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
        {trend && (
          <span
            className={`text-xs font-semibold ${
              trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {trend.isPositive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};
