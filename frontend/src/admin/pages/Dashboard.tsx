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
import { DevicePushBanner } from '../components/DevicePushBanner';
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
  const [metricScope, setMetricScope] = useState<'completed' | 'all'>('completed');
  const [timeframe, setTimeframe] = useState<'today' | 'yesterday' | '3d' | '7d' | '30d'>('7d');

  // Chart high-contrast colors (Neon Green and Electric Red/Crimson - NEVER dark or black)
  const isDark = theme === 'dark';
  const greenColor = isDark ? '#00e676' : '#00c853';
  const redColor = isDark ? '#ff3b5c' : '#e11d48';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const axisColor = isDark ? '#64748b' : '#94a3b8';

  const activeChartData = React.useMemo(() => {
    return chartData.map((d) => ({
      ...d,
      chart_orders: metricScope === 'completed' ? (d.completed_orders ?? d.orders) : (d.total_orders ?? d.orders),
      chart_volume: metricScope === 'completed' ? (d.completed_volume ?? d.volume) : (d.total_volume ?? d.volume),
    }));
  }, [chartData, metricScope]);

  const periodStats = React.useMemo(() => {
    const totalOrders = activeChartData.reduce((acc, d) => acc + (d.chart_orders || 0), 0);
    const totalVolume = activeChartData.reduce((acc, d) => acc + (d.chart_volume || 0), 0);
    return { totalOrders, totalVolume };
  }, [activeChartData]);

  const [isTogglingMode, setIsTogglingMode] = useState(false);
  const [payoutMode, setPayoutMode] = useState<'AUTOMATED' | 'MANUAL'>('MANUAL');
  const [toggleNotice, setToggleNotice] = useState<string | null>(null);

  const fetchDashboardData = async (activeTimeframe = timeframe, isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    try {
      const res = await adminApi.getDashboard({ timeframe: activeTimeframe });
      if (res.success) {
        setStats(res.stats);
        if (res.stats?.payout_mode) {
          setPayoutMode(res.stats.payout_mode as any);
        }
        setChartData(res.charts.orders_trend);
        setRecentOrders(res.recent_activity);
      }
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  };

  const handleTogglePayoutMode = async () => {
    const currentMode = payoutMode;
    const nextMode = currentMode === 'AUTOMATED' ? 'MANUAL' : 'AUTOMATED';
    setIsTogglingMode(true);
    setToggleNotice(null);
    try {
      const res = await adminApi.updatePayoutMode({ payout_mode: nextMode });
      if (res.success) {
        const updatedMode = (res.payout_mode || nextMode) as 'AUTOMATED' | 'MANUAL';
        setPayoutMode(updatedMode);
        setStats((prev) => (prev ? { ...prev, payout_mode: updatedMode } : null));
        setToggleNotice(`Switched to ${updatedMode === 'AUTOMATED' ? '24/7 Autopilot' : 'Manual 1-Tap Approval'}`);
        setTimeout(() => setToggleNotice(null), 4000);
      }
    } catch (err) {
      console.error('Failed to toggle payout mode', err);
      setToggleNotice('Failed to switch payout mode. Please try again.');
      setTimeout(() => setToggleNotice(null), 4000);
    } finally {
      setIsTogglingMode(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(timeframe);
    // Real-time ticking / live moving feed every 10 seconds
    const interval = setInterval(() => {
      fetchDashboardData(timeframe, true);
    }, 10000);
    return () => clearInterval(interval);
  }, [timeframe]);

  const isAutomated = payoutMode === 'AUTOMATED';

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
          onClick={() => fetchDashboardData()}
          disabled={isLoading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-subtle transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Native Device Real-Time Push Notifications Banner */}
      <DevicePushBanner />

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

      {toggleNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>{toggleNotice}</span>
          <button onClick={() => setToggleNotice(null)} className="text-emerald-500 hover:text-emerald-300 text-xs">✕</button>
        </div>
      )}

      {/* Top 4 KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Orders Today"
          value={stats?.total_orders_today ?? 0}
          growthPct={stats?.orders_growth_pct}
          icon={<Receipt className="w-4 h-4 text-slate-700 dark:text-slate-200" />}
        />

        <StatCard
          title="Volume Today (NGN)"
          value={formatNaira(stats?.total_volume_today ?? '0')}
          subtitle={(stats as any)?.total_volume_all_time ? `All-time: ${formatNaira((stats as any).total_volume_all_time)}` : undefined}
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
          title="Est. Revenue Today"
          value={formatNaira(stats?.today_revenue ?? '0')}
          subtitle={(stats as any)?.total_revenue_all_time ? `All-time: ${formatNaira((stats as any).total_revenue_all_time)}` : `Avg Speed: ${formatSpeed(stats?.avg_speed_ms)}`}
          icon={<Percent className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
        />
      </div>

      {/* Charts & System Health Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders & Volume Trend Chart with Red & Green Lines/Candles */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-subtle flex flex-col justify-between">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Orders & Volume Flow ({timeframe === 'today' ? 'Today (Hourly)' : timeframe === 'yesterday' ? 'Yesterday (Hourly)' : timeframe === '3d' ? '3 Days' : timeframe === '30d' ? '30 Days' : '1 Week'})
                </h2>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>LIVE FEED</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  metricScope === 'completed'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-[#00e676]'
                    : 'bg-rose-500/15 text-rose-600 dark:text-[#ff3b5c]'
                }`}>
                  {metricScope === 'completed' ? 'Completed Sales' : 'All Quotes'}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500">
                Turnover (Green) vs Velocity (Red) • {periodStats.totalOrders} Orders ({formatNaira(periodStats.totalVolume)}) in this view
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Timeframe Selector: Today | Yesterday | 3 Days | 1 Week | 1 Month */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                {[
                  { key: 'today', label: 'Today' },
                  { key: 'yesterday', label: 'Yesterday' },
                  { key: '3d', label: '3 Days' },
                  { key: '7d', label: '1 Week' },
                  { key: '30d', label: '1 Month' },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTimeframe(t.key as any)}
                    className={`px-2 py-1 rounded-md transition-all text-[11px] ${
                      timeframe === t.key
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-[#00e676] font-bold shadow-xs'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {/* Legend with Green and Red Indicators */}
              <div className="flex items-center gap-3 text-xs font-semibold mr-1">
                <span className="flex items-center gap-1.5 text-rose-600 dark:text-[#ff3b5c]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e11d48] dark:bg-[#ff3b5c]" />
                  Orders
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-[#00e676]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00c853] dark:bg-[#00e676]" />
                  Volume (₦)
                </span>
              </div>

              {/* Scope Switcher: Completed vs All */}
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setMetricScope('completed')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    metricScope === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-[#00e676] font-bold shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                  title="Completed paid sales matching the stat cards"
                >
                  Completed
                </button>
                <button
                  type="button"
                  onClick={() => setMetricScope('all')}
                  className={`px-2 py-1 rounded-md transition-all ${
                    metricScope === 'all'
                      ? 'bg-rose-500/20 text-rose-600 dark:text-[#ff3b5c] font-bold shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                  title="All initiated checkout quotes including draft attempts"
                >
                  All Quotes
                </button>
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
                <LineChart data={activeChartData} margin={{ top: 15, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.5} vertical={false} />
                  <XAxis dataKey="date" stroke={axisColor} fontSize={11} tickLine={false} />
                  <YAxis
                    yAxisId="left"
                    stroke={axisColor}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    domain={[0, (dataMax: number) => Math.max(Math.ceil((dataMax || 5) * 1.35), 5)]}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke={axisColor}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, (dataMax: number) => Math.max(Math.ceil(((dataMax || 50000) * 1.25) / 10000) * 10000, 50000)]}
                    tickFormatter={(val: number) => {
                      if (!val || val === 0) return '₦0';
                      if (val >= 1000000) return `₦${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `₦${(val / 1000).toFixed(0)}k`;
                      return `₦${val}`;
                    }}
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
                      name === 'Volume (₦)' ? formatNaira(Number(val) || 0) : `${Number(val) || 0} Orders`,
                      metricScope === 'completed'
                        ? (name === 'Volume (₦)' ? 'Completed Volume (₦)' : 'Completed Orders')
                        : (name === 'Volume (₦)' ? 'All Quotes Volume (₦)' : 'All Created Orders'),
                    ]}
                  />
                  {/* RED / CRIMSON LINE FOR ORDERS */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="chart_orders"
                    name="Orders"
                    stroke={redColor}
                    strokeWidth={3}
                    isAnimationActive={true}
                    animationDuration={700}
                    animationEasing="ease-in-out"
                    dot={{ r: 4, fill: redColor, strokeWidth: 2, stroke: isDark ? '#07080d' : '#ffffff' }}
                    activeDot={{ r: 6, fill: redColor }}
                  />
                  {/* NEON GREEN LINE FOR VOLUME */}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="chart_volume"
                    name="Volume (₦)"
                    stroke={greenColor}
                    strokeWidth={3}
                    isAnimationActive={true}
                    animationDuration={700}
                    animationEasing="ease-in-out"
                    dot={{ r: 4, fill: greenColor, strokeWidth: 2, stroke: isDark ? '#07080d' : '#ffffff' }}
                    activeDot={{ r: 6, fill: greenColor }}
                  />
                </LineChart>
              ) : (
                <BarChart data={activeChartData} margin={{ top: 15, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.5} vertical={false} />
                  <XAxis dataKey="date" stroke={axisColor} fontSize={11} tickLine={false} />
                  <YAxis
                    yAxisId="left"
                    stroke={axisColor}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    domain={[0, (dataMax: number) => Math.max(Math.ceil((dataMax || 5) * 1.35), 5)]}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke={axisColor}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, (dataMax: number) => Math.max(Math.ceil(((dataMax || 50000) * 1.25) / 10000) * 10000, 50000)]}
                    tickFormatter={(val: number) => {
                      if (!val || val === 0) return '₦0';
                      if (val >= 1000000) return `₦${(val / 1000000).toFixed(1)}M`;
                      if (val >= 1000) return `₦${(val / 1000).toFixed(0)}k`;
                      return `₦${val}`;
                    }}
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
                      name === 'Volume (₦)' ? formatNaira(Number(val) || 0) : `${Number(val) || 0} Orders`,
                      metricScope === 'completed'
                        ? (name === 'Volume (₦)' ? 'Completed Volume (₦)' : 'Completed Orders')
                        : (name === 'Volume (₦)' ? 'All Quotes Volume (₦)' : 'All Created Orders'),
                    ]}
                  />
                  {/* RED BARS/CANDLES FOR ORDERS */}
                  <Bar
                    yAxisId="left"
                    dataKey="chart_orders"
                    name="Orders"
                    fill={redColor}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={700}
                    animationEasing="ease-in-out"
                  />
                  {/* GREEN BARS/CANDLES FOR VOLUME */}
                  <Bar
                    yAxisId="right"
                    dataKey="chart_volume"
                    name="Volume (₦)"
                    fill={greenColor}
                    radius={[4, 4, 0, 0]}
                    isAnimationActive={true}
                    animationDuration={700}
                    animationEasing="ease-in-out"
                  />
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

        {recentOrders.length === 0 ? (
          <div className="py-12 px-4 text-center text-xs text-slate-400 dark:text-slate-500 font-mono">
            No transactions recorded yet. New customer orders from the buy flow will appear here in real-time.
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
  );
};
