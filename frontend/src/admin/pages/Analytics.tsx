import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { TrendingUp, Clock, DollarSign, RefreshCw } from 'lucide-react';
import { adminApi } from '../../shared/api/admin';
import { formatNaira } from '../../shared/utils/formatters';
import { useTheme } from '../../shared/context/ThemeContext';

interface CoinDist {
  coin: string;
  name: string;
  symbol: string;
  network: string;
  orders_count: number;
  volume_ngn: number;
  share_pct: number;
}

export const AnalyticsPage: React.FC = () => {
  const { theme } = useTheme();
  const [coinDistribution, setCoinDistribution] = useState<CoinDist[]>([]);
  const [avgOrderSize, setAvgOrderSize] = useState<number>(0);
  const [peakHours, setPeakHours] = useState<Array<{ hour: string; orders: number }>>([]);
  const [peakWindow, setPeakWindow] = useState<string>('No volume yet');
  const [dominantAsset, setDominantAsset] = useState<CoinDist | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isDark = theme === 'dark';
  const greenColor = isDark ? '#00e676' : '#00c853';
  const blueColor = isDark ? '#38bdf8' : '#0284c7';
  const mutedBarColor = isDark ? '#1e293b' : '#e2e8f0';
  const gridColor = isDark ? '#1e293b' : '#e2e8f0';
  const axisColor = isDark ? '#64748b' : '#94a3b8';

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getAnalytics();
      if (res.success) {
        setCoinDistribution(res.coin_distribution || []);
        setAvgOrderSize(res.avg_order_size_ngn || 0);
        setPeakHours(res.peak_hours || []);
        if ((res as any).peak_window) {
          setPeakWindow((res as any).peak_window);
        }
        if ((res as any).dominant_asset) {
          setDominantAsset((res as any).dominant_asset);
        } else if (res.coin_distribution && res.coin_distribution.length > 0 && res.coin_distribution[0].volume_ngn > 0) {
          setDominantAsset(res.coin_distribution[0]);
        } else {
          setDominantAsset(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const maxOrders = Math.max(...peakHours.map((p) => p.orders), 0);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Platform Analytics & Intelligence
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Asset liquidity shares, customer order sizes, and hourly trading velocity
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={isLoading}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-subtle transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Average Order Size</span>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-[#00e676]" />
          </div>
          <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">{formatNaira(avgOrderSize)}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500 block mt-1">
            {avgOrderSize > 0 ? 'Per successful transaction' : 'No settled transactions yet'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dominant Asset</span>
            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
            {dominantAsset ? `${dominantAsset.name} (${dominantAsset.share_pct}%)` : 'None yet'}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 block mt-1">
            {dominantAsset ? 'Leading total platform turnover' : 'Awaiting completed trades'}
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Peak Window</span>
            <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">{peakWindow}</span>
          <span className="text-xs text-slate-400 dark:text-slate-500 block mt-1">
            {peakWindow === 'No volume yet' ? 'Velocity calculated upon order creation' : 'West Africa Time (WAT)'}
          </span>
        </div>
      </div>

      {/* Hourly Velocity Histogram Recharts */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">24-Hour Trading Volume Velocity</h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">Order arrival frequency distribution by hour of day (WAT)</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-[#00e676]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00c853] dark:bg-[#00e676]" />
              Peak Hour
            </span>
            <span className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7] dark:bg-[#38bdf8]" />
              Active Hours
            </span>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={peakHours} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} opacity={0.4} vertical={false} />
              <XAxis dataKey="hour" stroke={axisColor} fontSize={10} tickLine={false} />
              <YAxis stroke={axisColor} fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  color: isDark ? '#f8fafc' : '#0f172a',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="orders" name="Orders Placed" radius={[4, 4, 0, 0]}>
                {peakHours.map((entry, index) => {
                  const isPeak = maxOrders > 0 && entry.orders === maxOrders;
                  const hasOrders = entry.orders > 0;
                  const barFill = isPeak ? greenColor : hasOrders ? blueColor : mutedBarColor;
                  return <Cell key={`cell-${index}`} fill={barFill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Coin Share Breakdown Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-subtle overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Asset Share & Liquidity Performance</h2>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 sm:px-5 py-3">Asset</th>
                <th className="px-4 sm:px-5 py-3">Network</th>
                <th className="px-4 sm:px-5 py-3">Orders Settled</th>
                <th className="px-4 sm:px-5 py-3">Total Volume (NGN)</th>
                <th className="px-4 sm:px-5 py-3">Share %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium font-mono">
              {coinDistribution.map((c) => (
                <tr key={c.coin} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="px-4 sm:px-5 py-3.5 font-bold text-slate-900 dark:text-white font-sans">
                    {c.name} ({c.symbol})
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 text-slate-600 dark:text-slate-300 uppercase">
                    {c.network}
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 text-slate-900 dark:text-white">
                    {c.orders_count}
                  </td>
                  <td className="px-4 sm:px-5 py-3.5 text-slate-900 dark:text-white font-bold">
                    {formatNaira(c.volume_ngn)}
                  </td>
                  <td className="px-4 sm:px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${c.share_pct}%` }} />
                      </div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{c.share_pct}%</span>
                    </div>
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
