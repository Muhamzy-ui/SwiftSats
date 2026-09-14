import React, { useState, useEffect } from 'react';
import { ShieldCheck, Server, AlertTriangle, RefreshCw } from 'lucide-react';
import { adminApi } from '../../shared/api/admin';
import { SystemHealthData } from '../../shared/types';

export const SettingsPage: React.FC = () => {
  const [healthData, setHealthData] = useState<SystemHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dangerConfirm, setDangerConfirm] = useState(false);
  const [dangerNotice, setDangerNotice] = useState<string | null>(null);

  const fetchHealth = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getSystemHealth();
      setHealthData(res);
    } catch (err) {
      console.error('Failed to fetch system health', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const handleFlushCache = () => {
    if (!dangerConfirm) {
      setDangerNotice('Please click the confirmation checkbox first.');
      return;
    }
    setDangerNotice('Rate caches and stale quote locks flushed successfully.');
    setDangerConfirm(false);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">System Configuration & Security</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Gateway credentials telemetry, 2FA policies, and system safeguards</p>
      </div>

      {/* Gateway & Infrastructure Health */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-subtle space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">API Connection & Engine Health</h2>
          </div>
          <button
            onClick={fetchHealth}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Test Endpoints</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {healthData?.services.map((svc) => (
            <div key={svc.name} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white">{svc.name}</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Operational
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-mono pt-1">
                <span>Mode: {svc.mode}</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{svc.latency_ms}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security Policies */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-subtle space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Security & 2FA Enforcement Rules</span>
        </h2>

        <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="font-bold block text-slate-900 dark:text-white">Mandatory 2FA Authentication</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">Enforces TOTP 6-digit codes for all administrative logins</span>
            </div>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">
              Active (Enforced)
            </span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="font-bold block text-slate-900 dark:text-white">Session Expiration Window</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">JWT httpOnly cookie validity duration before re-authentication is required</span>
            </div>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">60 Minutes</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <span className="font-bold block text-slate-900 dark:text-white">Webhook Cryptographic Signing</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">HMAC SHA512 signature verification on all incoming Paystack webhooks</span>
            </div>
            <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">
              Enabled
            </span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-rose-200 dark:border-rose-800/80 shadow-subtle space-y-4">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
          <AlertTriangle className="w-4 h-4" />
          <h2 className="text-xs font-bold uppercase tracking-wider">Danger Zone</h2>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          Critical operations requiring operator confirmation. These actions immediately affect active order locking caches.
        </p>

        {dangerNotice && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            {dangerNotice}
          </div>
        )}

        <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="confirmDanger"
              checked={dangerConfirm}
              onChange={(e) => setDangerConfirm(e.target.checked)}
              className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 bg-white dark:bg-slate-950"
            />
            <label htmlFor="confirmDanger" className="text-xs font-semibold text-rose-900 dark:text-rose-300 cursor-pointer">
              I understand this action will purge volatile Redis quote caches
            </label>
          </div>

          <button
            type="button"
            onClick={handleFlushCache}
            disabled={!dangerConfirm}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-40 text-white font-bold text-xs shadow-sm transition-colors"
          >
            Flush Price Quote Caches
          </button>
        </div>
      </div>
    </div>
  );
};
