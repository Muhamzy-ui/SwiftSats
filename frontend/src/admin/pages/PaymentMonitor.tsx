import React, { useEffect, useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Activity, RefreshCw } from 'lucide-react';
import { adminApi } from '../../shared/api/admin';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { AdminOrderSummary, FunnelDonutItem } from '../../shared/types';
import { formatNaira, formatDateTime } from '../../shared/utils/formatters';

export const PaymentMonitorPage: React.FC = () => {
  const [funnel, setFunnel] = useState<Record<string, number>>({});
  const [donutData, setDonutData] = useState<FunnelDonutItem[]>([]);
  const [liveFeed, setLiveFeed] = useState<AdminOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMonitorData = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getPaymentMonitor();
      if (res.success) {
        setFunnel(res.funnel);
        setDonutData(res.donut_data);
        setLiveFeed(res.live_feed);
      }
    } catch (err) {
      console.error('Failed to load payment monitor', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitorData();
    const interval = setInterval(fetchMonitorData, 5000); // 5s auto-refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Real-Time Payment Monitor</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Live conversion funnel and active bank transfer telemetry (5s polling)</p>
        </div>

        <button
          onClick={fetchMonitorData}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-subtle transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh Now</span>
        </button>
      </div>

      {/* Funnel Stage Progress Blocks */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/20 dark:bg-amber-950/20 shadow-subtle relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">1. Awaiting Payment</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          </div>
          <span className="text-2xl font-black font-mono text-amber-900 dark:text-amber-200">{funnel.awaiting_payment ?? 0}</span>
          <span className="text-[11px] text-amber-700 dark:text-amber-400 block mt-1">Virtual accounts issued</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/20 dark:bg-blue-950/20 shadow-subtle relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 dark:text-blue-300">2. Paystack Confirmed</span>
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          </div>
          <span className="text-2xl font-black font-mono text-blue-900 dark:text-blue-200">{funnel.payment_confirmed ?? 0}</span>
          <span className="text-[11px] text-blue-700 dark:text-blue-400 block mt-1">Webhook verified</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/20 dark:bg-purple-950/20 shadow-subtle relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800 dark:text-purple-300">3. Quidax Payout</span>
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          </div>
          <span className="text-2xl font-black font-mono text-purple-900 dark:text-purple-200">{funnel.payout_processing ?? 0}</span>
          <span className="text-[11px] text-purple-700 dark:text-purple-400 block mt-1">Celery worker dispatching</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-subtle relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">4. Completed</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
          <span className="text-2xl font-black font-mono text-emerald-900 dark:text-emerald-200">{funnel.completed ?? 0}</span>
          <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block mt-1">Tx broadcast to chain</span>
        </div>
      </div>

      {/* Donut Chart & Funnel Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-subtle flex flex-col items-center justify-between">
          <div className="w-full text-left mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Conversion Funnel Distribution</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">Total pipeline breakdown</span>
          </div>

          <div className="h-48 w-48 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="w-full space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {donutData.map((d) => (
              <div key={d.status} className="flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.status}
                </span>
                <span className="font-bold font-mono text-slate-900 dark:text-white">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Event Stream */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-subtle p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Live Transaction Stream
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">Auto-updating</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-96 overflow-y-auto">
            {liveFeed.map((ord) => (
              <div key={ord.id} className="py-3 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{ord.order_reference}</span>
                    <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded text-[10px]">
                      {ord.coin.split('_')[0]}
                    </span>
                  </div>
                  <span className="text-slate-400 dark:text-slate-500 font-mono text-[11px] block">
                    {formatNaira(ord.fiat_amount_ngn)} ➔ {ord.crypto_amount}
                  </span>
                </div>

                <div className="text-right space-y-1">
                  <StatusBadge status={ord.status} />
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block">
                    {formatDateTime(ord.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
