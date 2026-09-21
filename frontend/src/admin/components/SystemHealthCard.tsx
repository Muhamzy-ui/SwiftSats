import React, { useEffect, useState } from 'react';
import { Server } from 'lucide-react';
import { adminApi } from '../../shared/api/admin';
import { SystemHealthData } from '../../shared/types';

interface SystemHealthCardProps {
  isHealthy?: boolean;
  healthData?: SystemHealthData | null;
}

export const SystemHealthCard: React.FC<SystemHealthCardProps> = ({ isHealthy = true, healthData: propHealth }) => {
  const [health, setHealth] = useState<SystemHealthData | null>(propHealth || null);

  useEffect(() => {
    if (propHealth) {
      setHealth(propHealth);
      return;
    }

    let isMounted = true;
    const loadHealth = async () => {
      try {
        const data = await adminApi.getSystemHealth();
        if (isMounted && data) {
          setHealth(data);
        }
      } catch (err) {
        // Fallback silently if unauthenticated or network error
      }
    };

    loadHealth();
    const timer = setInterval(loadHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [propHealth]);

  const quidaxSvc = health?.services?.find((s) => s.name.toLowerCase().includes('quidax'));
  const paystackSvc = health?.services?.find((s) => s.name.toLowerCase().includes('paystack'));

  const overallHealthy = isHealthy && (!health || health.services.every((s) => s.status === 'healthy'));

  return (
    <div className="bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
          <Server className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>System Health</span>
        </div>
        <span
          className={`w-2 h-2 rounded-full ${
            overallHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
          }`}
        />
      </div>

      <div className="space-y-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
        <div className="flex justify-between">
          <span>Quidax Gateway:</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-bold">
            {quidaxSvc ? `${quidaxSvc.status === 'healthy' ? 'Online' : 'Degraded'} (${quidaxSvc.latency_ms}ms)` : 'Checking...'}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Paystack Nuban:</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-bold">
            {paystackSvc ? `${paystackSvc.status === 'healthy' ? 'Active' : 'Degraded'} (${paystackSvc.latency_ms}ms)` : 'Checking...'}
          </span>
        </div>
      </div>
    </div>
  );
};

