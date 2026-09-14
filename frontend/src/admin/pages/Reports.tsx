import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { adminApi } from '../../shared/api/admin';
import { AdminOrderSummary } from '../../shared/types';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { formatNaira, formatDateTime } from '../../shared/utils/formatters';

export const ReportsPage: React.FC = () => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [coin, setCoin] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [previewData, setPreviewData] = useState<AdminOrderSummary[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleGeneratePreview = async () => {
    setIsGenerating(true);
    try {
      const res = await adminApi.generateReport({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        coin: coin !== 'ALL' ? coin : undefined,
        status: status !== 'ALL' ? status : undefined,
        export_format: 'json',
      });
      if ('results' in res) {
        setPreviewData(res.results);
        setTotalCount(res.count);
      }
    } catch (err) {
      console.error('Failed to generate report preview', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const blob = await adminApi.generateReport({
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        coin: coin !== 'ALL' ? coin : undefined,
        status: status !== 'ALL' ? status : undefined,
        export_format: 'csv',
      });

      if (blob instanceof Blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `swiftsats_reconciliation_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export CSV failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Audit & Reconciliation Report Builder</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Generate compliant financial transaction statements for accounting and audits</p>
      </div>

      {/* 3-Step Filter Builder Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-subtle space-y-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">1. Query Criteria & Scope</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Asset
            </label>
            <select
              value={coin}
              onChange={(e) => setCoin(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-950 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="ALL">All Cryptocurrencies</option>
              <option value="USDT_TRC20">USDT (TRC-20)</option>
              <option value="SOL">Solana (SOL)</option>
              <option value="BNB">BNB Chain</option>
              <option value="BTC">Bitcoin (BTC)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white bg-white dark:bg-slate-950 focus:ring-2 focus:ring-emerald-100"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed Only</option>
              <option value="PAYMENT_CONFIRMED">Payment Confirmed</option>
              <option value="FAILED">Failed / Refunded</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleGeneratePreview}
            disabled={isGenerating}
            className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs shadow-sm transition-colors"
          >
            {isGenerating ? 'Querying...' : 'Preview Matching Records'}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-sm transition-colors flex items-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Exporting...' : 'Export Complete CSV'}</span>
          </button>
        </div>
      </div>

      {/* Preview Table */}
      {totalCount !== null && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-subtle overflow-hidden space-y-4">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">Preview Results</h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">Found {totalCount} matching financial records</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3">Order Ref</th>
                  <th className="px-5 py-3">Asset</th>
                  <th className="px-5 py-3">Amount (NGN)</th>
                  <th className="px-5 py-3">Crypto Amount</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium font-mono">
                {previewData.slice(0, 15).map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">{row.order_reference}</td>
                    <td className="px-5 py-3.5 font-sans">{row.coin.split('_')[0]}</td>
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">{formatNaira(row.fiat_amount_ngn)}</td>
                    <td className="px-5 py-3.5 text-emerald-700 dark:text-emerald-400">{row.crypto_amount}</td>
                    <td className="px-5 py-3.5 font-sans"><StatusBadge status={row.status} /></td>
                    <td className="px-5 py-3.5 text-right text-slate-500 dark:text-slate-400">{formatDateTime(row.created_at)}</td>
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
