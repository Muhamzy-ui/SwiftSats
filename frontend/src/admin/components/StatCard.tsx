import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface StatCardProps {
  label?: string;
  title?: string;
  value: string | number;
  subtext?: string;
  subtitle?: string;
  growthPct?: number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  badgeText?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  title,
  value,
  subtext,
  subtitle,
  growthPct,
  trend,
  icon,
  badgeText,
}) => {
  const displayLabel = title || label || '';
  const displaySubtext = subtitle || subtext;
  const activeGrowth = growthPct !== undefined ? { value: Math.abs(growthPct), isPositive: growthPct >= 0 } : trend;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-subtle flex flex-col justify-between space-y-3 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {displayLabel}
        </span>
        {icon && <div className="text-slate-400 dark:text-slate-500">{icon}</div>}
        {badgeText && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {badgeText}
          </span>
        )}
      </div>

      <div>
        <span className="text-2xl font-black font-mono text-slate-900 dark:text-white tracking-tight block">
          {value}
        </span>

        {(activeGrowth || displaySubtext) && (
          <div className="flex items-center gap-2 mt-1.5 text-xs">
            {activeGrowth && (
              <span
                className={`inline-flex items-center font-bold font-mono text-[11px] ${
                  activeGrowth.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {activeGrowth.isPositive ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {activeGrowth.value}%
              </span>
            )}
            {displaySubtext && <span className="text-slate-400 dark:text-slate-500">{displaySubtext}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
