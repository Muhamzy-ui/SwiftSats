import React, { useState, useEffect } from 'react';
import { RefreshCw, Check, RotateCcw, Ban } from 'lucide-react';
import { adminApi } from '../../shared/api/admin';
import { AdminOrderSummary } from '../../shared/types';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { formatNaira, formatDateTime } from '../../shared/utils/formatters';

export const DisputesPage: React.FC = () => {
  const [disputes, setDisputes] = useState<AdminOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const fetchDisputes = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getDisputes();
      if (res.success) {
        setDisputes(res.disputes);
      }
    } catch (err) {
      console.error('Failed to fetch disputes', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleAction = async (orderId: string, action: 'RETRY_PAYOUT' | 'MARK_REFUNDED' | 'CANCEL') => {
    setActiveActionId(orderId);
    try {
      await adminApi.resolveDispute(orderId, action, 'Manual intervention from operator console.');
      await fetchDisputes();
    } catch (err) {
      console.error('Action failed', err);
    } finally {
      setActiveActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Manual Review & Disputes Queue</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Operator resolution workflow for stalled orders, underpayments, and payout exceptions</p>
        </div>

        <button
          onClick={fetchDisputes}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-subtle transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {disputes.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-200 dark:border-slate-800 shadow-subtle text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6 stroke-[2.5]" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Review Queue Clear</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            All customer transactions are processing automatically through the Celery pipeline with zero pending exceptions.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3">Order Ref</th>
                  <th className="px-5 py-3">Asset</th>
                  <th className="px-5 py-3">Naira Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Destination Wallet</th>
                  <th className="px-5 py-3">Created</th>
                  <th className="px-5 py-3 text-right">Operator Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {disputes.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                      {d.order_reference}
                    </td>
                    <td className="px-5 py-3.5 font-mono">
                      <span className="font-bold text-slate-800 dark:text-slate-200 font-sans">{d.coin.split('_')[0]}</span>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                      {formatNaira(d.fiat_amount_ngn)}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={d.status} />
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-600 dark:text-slate-300">
                      {d.masked_wallet}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-mono">
                      {formatDateTime(d.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1.5 font-sans">
                      <button
                        onClick={() => handleAction(d.id, 'RETRY_PAYOUT')}
                        disabled={activeActionId === d.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-[11px] transition-colors shadow-subtle"
                        title="Retry Quidax Payout Worker"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Retry Payout</span>
                      </button>

                      <button
                        onClick={() => handleAction(d.id, 'MARK_REFUNDED')}
                        disabled={activeActionId === d.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-[11px] transition-colors"
                        title="Mark as refunded"
                      >
                        <span>Mark Refunded</span>
                      </button>

                      <button
                        onClick={() => handleAction(d.id, 'CANCEL')}
                        disabled={activeActionId === d.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold text-[11px] transition-colors"
                        title="Cancel order"
                      >
                        <Ban className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
