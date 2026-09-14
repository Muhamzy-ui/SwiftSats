import React from 'react';
import { Server } from 'lucide-react';

interface SystemHealthCardProps {
  isHealthy?: boolean;
}

export const SystemHealthCard: React.FC<SystemHealthCardProps> = ({ isHealthy = true }) => {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
          <Server className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>System Health</span>
        </div>
        <span
          className={`w-2 h-2 rounded-full ${
            isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
          }`}
        />
      </div>

      <div className="space-y-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
        <div className="flex justify-between">
          <span>Quidax Gateway:</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-bold">Online (12ms)</span>
        </div>
        <div className="flex justify-between">
          <span>Paystack Nuban:</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-bold">Active (18ms)</span>
        </div>
      </div>
    </div>
  );
};
