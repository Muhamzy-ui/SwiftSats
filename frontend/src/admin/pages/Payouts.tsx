import React, { useState, useEffect } from 'react';
import { Send, ExternalLink, RefreshCw, Zap } from 'lucide-react';
import { adminApi } from '../../shared/api/admin';
import { AdminOrderSummary } from '../../shared/types';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { formatNaira, formatDateTime, formatSpeed } from '../../shared/utils/formatters';

export const PayoutsPage: React.FC = () => {
  const [payouts, setPayouts] = useState<AdminOrderSummary[]>([]);
  const [metrics, setMetrics] = useState({ total_payouts: 0, total_crypto_volume_ngn: '0' });
  const [isLoading, setIsLoading] = useState(true);

  const fetchPayouts = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getPayouts();
      if (res.success) {
        setPayouts(res.payouts);
        setMetrics(res.metrics);
      }
    } catch (err) {
      console.error('Failed to fetch payouts', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Quidax Payouts Ledger</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Automated blockchain withdrawal dispatches and explorer transaction hashes</p>
        </div>

        <button
          onClick={fetchPayouts}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-subtle transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Top Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-subtle flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Total Blockchain Dispatches</span>
            <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">{metrics.total_payouts}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Send className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-subtle flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">Settled Turnover (NGN)</span>
            <span className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">{formatNaira(metrics.total_crypto_volume_ngn)}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-subtle overflow-hidden">
        {payouts.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 font-mono">
            No payout records found. Completed blockchain withdrawals will appear here automatically.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3">Order Ref</th>
                  <th className="px-5 py-3">Asset</th>
                  <th className="px-5 py-3">Crypto Sent</th>
                  <th className="px-5 py-3">Fiat Equivalent</th>
                  <th className="px-5 py-3">Tx Hash</th>
                  <th className="px-5 py-3">Speed</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Settled Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                      {p.order_reference}
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-sans">{p.coin.split('_')[0]}</span>
                      <span className="text-slate-400 dark:text-slate-500 text-[10px] ml-1 uppercase">({p.network})</span>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {p.crypto_amount}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-800 dark:text-slate-200">
                      {formatNaira(p.fiat_amount_ngn)}
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      {p.tx_hash ? (
                        <a
                          href={p.explorer_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 underline flex items-center gap-1 font-mono text-[11px]"
                        >
                          <span>{p.tx_hash.slice(0, 12)}...</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500 text-[11px]">Pending broadcast</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-emerald-700 dark:text-emerald-400 font-bold">
                      {formatSpeed(p.speed_metric_ms)}
                    </td>
                    <td className="px-5 py-3.5 font-sans">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-slate-500 dark:text-slate-400">
                      {p.completed_at ? formatDateTime(p.completed_at) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
