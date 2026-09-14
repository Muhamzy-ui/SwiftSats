import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Receipt, DollarSign, Clock, Percent, ArrowRight, RefreshCw, BarChart2, TrendingUp } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { SystemHealthCard } from '../components/SystemHealthCard';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { adminApi } from '../../shared/api/admin';
import { DashboardStats, TrendChartPoint, AdminOrderSummary } from '../../shared/types';
import { formatNaira, formatDateTime, formatSpeed } from '../../shared/utils/formatters';
import { useTheme } from '../../shared/context/ThemeContext';

export const DashboardPage: React.FC = () => {
  const { theme } = useTheme();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<TrendChartPoint[]>([]);
  const [recentOrders, setRecentOrders] = useState<AdminOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartMode, setChartMode] = useState<'line' | 'candle'>('line');

  // Chart high-contrast colors (Neon Green and Electric Red/Crimson - NEVER dark or black)
  const isDark = theme === 'dark';
  const greenColor = isDark ? '#00e676' : '#00c853';
  const redColor = isDark ? '#ff3b5c' : '#e11d48';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const axisColor = isDark ? '#64748b' : '#94a3b8';

  const [isTogglingMode, setIsTogglingMode] = useState(false);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getDashboard();
      if (res.success) {
        setStats(res.stats);
        setChartData(res.charts.orders_trend);
        setRecentOrders(res.recent_activity);
      }
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePayoutMode = async () => {
    const currentMode = stats?.payout_mode || 'AUTOMATED';
    const nextMode = currentMode === 'AUTOMATED' ? 'MANUAL' : 'AUTOMATED';
    setIsTogglingMode(true);
    try {
      const res = await adminApi.updatePayoutMode({ payout_mode: nextMode });
      if (res.success) {
        setStats((prev) => (prev ? { ...prev, payout_mode: res.payout_mode as any } : null));
      }
    } catch (err) {
      console.error('Failed to toggle payout mode', err);
    } finally {
      setIsTogglingMode(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const isAutomated = (stats?.payout_mode || 'AUTOMATED') === 'AUTOMATED';

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full overflow-x-hidden">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Executive Dashboard
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time platform throughput, liquidity flows, and settlement metrics
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={isLoading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-subtle transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 24/7 Nomba Automation & Payout Mode Control Banner */}
      <div className={`p-4 rounded-2xl border transition-all ${
        isAutomated
          ? 'bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border-emerald-500/30'
          : 'bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border-amber-500/30'
      } flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg`}>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isAutomated ? 'bg-[#00e676] animate-ping' : 'bg-amber-400'}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                {isAutomated ? '⚡ 24/7 Nomba Full-Automation' : '🔒 Manual 1-Tap Approval Mode'}
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                isAutomated ? 'bg-[#00e676]/20 text-[#00e676]' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {isAutomated ? 'AUTOPILOT ON' : 'HOLD FOR APPROVAL'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              Settlement: {stats?.settlement_bank_name || 'Nomba MFB'} • {stats?.settlement_account_name || 'SwiftSats Settlement'} • Acct: <strong className="text-white">{stats?.settlement_account_number || '6010450034'}</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTogglePayoutMode}
          disabled={isTogglingMode}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            isAutomated
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              : 'bg-[#00e676] hover:bg-[#00c853] text-slate-950 font-black shadow-lg shadow-emerald-500/20'
          }`}
        >
          {isTogglingMode ? (
            'Switching...'
          ) : isAutomated ? (
            'Switch to Manual Approval'
          ) : (
            '⚡ Activate 24/7 Autopilot'
          )}
        </button>
      </div>

      {/* Top 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders Today"
          value={stats?.total_orders_today ?? 0}
          growthPct={stats?.orders_growth_pct}
          icon={<Receipt className="w-4 h-4 text-slate-700 dark:text-slate-200" />}
        />

        <StatCard
          title="Total Volume (NGN)"
          value={formatNaira(stats?.total_volume_today ?? '0')}
          growthPct={stats?.volume_growth_pct}
          icon={<DollarSign className="w-4 h-4 text-emerald-600 dark:text-[#00e676]" />}
        />

        <StatCard
          title="Pending Payouts"
          value={stats?.pending_payouts ?? 0}
          subtitle="Currently processing"
          icon={<Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
        />

        <StatCard
          title="Spread Revenue (Est.)"
          value={formatNaira(stats?.today_revenue ?? '0')}
          subtitle={`Avg Speed: ${formatSpeed(stats?.avg_speed_ms)}`}
          icon={<Percent className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
        />
      </div>

      {/* Charts & System Health Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders & Volume Trend Chart with Red & Green Lines/Candles */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-subtle flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Orders & Volume Flow (7 Days)
              </h2>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Daily turnover (Green) vs order velocity (Red)
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              {/* Legend with Green and Red Indicators */}
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-[#ff3b5c]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e11d48] dark:bg-[#ff3b5c]" />
                  Orders
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-[#00e676]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00c853] dark:bg-[#00e676]" />
                  Volume (₦)
                </span>
              </div>

              {/* View Switcher: Line vs Candle/Bar */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setChartMode('line')}
                  className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 transition-all ${
                    chartMode === 'line'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                  title="Line View"
                >
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  <span className="hidden sm:inline">Line</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('candle')}
                  className={`px-2 py-1 rounded-md font-bold flex items-center gap-1 transition-all ${
                    chartMode === 'candle'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                  title="Candle / Bar View"
                >
                  <BarChart2 className="w-3 h-3 text-rose-500" />
                  <span className="hidden sm:inline">Candle</span>
                </button>
              </div>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'line' ? (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.5} vertical={false} />
                  <XAxis dataKey="date" stroke={axisColor} fontSize={11} tickLine={false} />
                  <YAxis yAxisId="left" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke={axisColor}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₦${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    }}
                    formatter={(val: unknown, name: unknown) => [
                      name === 'Volume (₦)' ? formatNaira(Number(val) || 0) : String(val),
                      String(name),
                    ]}
                  />
                  {/* RED / CRIMSON LINE FOR ORDERS */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="orders"
                    name="Orders"
                    stroke={redColor}
                    strokeWidth={3}
                    dot={{ r: 4, fill: redColor, strokeWidth: 2, stroke: isDark ? '#07080d' : '#ffffff' }}
                    activeDot={{ r: 6, fill: redColor }}
                  />
                  {/* NEON GREEN LINE FOR VOLUME */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="volume"
                    name="Volume (₦)"
                    stroke={greenColor}
                    strokeWidth={3}
                    dot={{ r: 4, fill: greenColor, strokeWidth: 2, stroke: isDark ? '#07080d' : '#ffffff' }}
                    activeDot={{ r: 6, fill: greenColor }}
                  />
                </LineChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.5} vertical={false} />
                  <XAxis dataKey="date" stroke={axisColor} fontSize={11} tickLine={false} />
                  <YAxis yAxisId="left" stroke={axisColor} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke={axisColor}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₦${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      fontSize: '12px',
                    }}
                    formatter={(val: unknown, name: unknown) => [
                      name === 'Volume (₦)' ? formatNaira(Number(val) || 0) : String(val),
                      String(name),
                    ]}
                  />
                  {/* RED BARS/CANDLES FOR ORDERS */}
                  <Bar yAxisId="left" dataKey="orders" name="Orders" fill={redColor} radius={[4, 4, 0, 0]} />
                  {/* GREEN BARS/CANDLES FOR VOLUME */}
                  <Bar yAxisId="right" dataKey="volume" name="Volume (₦)" fill={greenColor} radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health Widget */}
        <div className="w-full">
          <SystemHealthCard />
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-subtle overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Recent Transactions</h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">Live feed of orders entering the pipeline</span>
          </div>

          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-[#00e676] hover:underline"
          >
            <span>View All Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile View: Clean transactions with circular emblems matching Image 1 */}
        <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
          {recentOrders.map((ord) => {
            const coinName = ord.coin.split('_')[0];
            return (
              <div key={ord.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-slate-700">
                    {coinName.slice(0, 3)}
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate block">
                      {ord.order_reference}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block">
                      {coinName} ({ord.network}) • {formatDateTime(ord.created_at).split(',')[0]}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold font-mono text-xs text-[#00c853] dark:text-[#00e676] block">
                    + {formatNaira(ord.fiat_amount_ngn)}
                  </span>
                  <div className="mt-0.5">
                    <StatusBadge status={ord.status} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Full Enterprise Table */}
        <div className="hidden sm:block overflow-x-auto w-full">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 sm:px-5 py-3">Order Ref</th>
                <th className="px-4 sm:px-5 py-3">Asset</th>
                <th className="px-4 sm:px-5 py-3">Amount (NGN)</th>
                <th className="px-4 sm:px-5 py-3">Crypto Amount</th>
                <th className="px-4 sm:px-5 py-3">Status</th>
                <th className="px-4 sm:px-5 py-3">Speed</th>
                <th className="px-4 sm:px-5 py-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {recentOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 sm:px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                    <Link to={`/admin/orders?search=${ord.order_reference}`} className="hover:underline text-emerald-600 dark:text-[#00e676]">
                      {ord.order_reference}
                    </Link>
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 font-mono">
                    <span className="font-bold text-slate-800 dark:text-slate-200">{ord.coin.split('_')[0]}</span>
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] ml-1 uppercase">({ord.network})</span>
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                    {formatNaira(ord.fiat_amount_ngn)}
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 font-mono text-slate-700 dark:text-slate-300">
                    {ord.crypto_amount} {ord.coin.split('_')[0]}
                  </td>
                  <td className="px-4 sm:px-5 py-3.5">
                    <StatusBadge status={ord.status} />
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                    {formatSpeed(ord.speed_metric_ms)}
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 text-right text-slate-400 dark:text-slate-500 font-mono text-[11px]">
                    {formatDateTime(ord.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
