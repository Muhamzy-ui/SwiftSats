import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  ExternalLink,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { adminApi } from '../../shared/api/admin';
import { AdminOrderSummary, AdminOrderDetail } from '../../shared/types';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { formatNaira, formatDateTime, formatSpeed } from '../../shared/utils/formatters';

const STATUS_FILTERS = [
  'ALL',
  'COMPLETED',
  'PAYOUT_PROCESSING',
  'PAYMENT_CONFIRMED',
  'AWAITING_PAYMENT',
  'QUOTE_LOCKED',
  'FAILED',
  'REFUNDED',
];

const COIN_FILTERS = ['ALL', 'USDT_TRC20', 'SOL', 'BNB', 'BTC', 'USDC_BASE'];

export const OrdersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [summary, setSummary] = useState({ total: 0, completed: 0, pending: 0, failed: 0 });
  const [pagination, setPagination] = useState({ total: 0, page: 1, page_size: 20, total_pages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal State
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<AdminOrderDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const currentStatus = searchParams.get('status') || 'ALL';
  const currentCoin = searchParams.get('coin') || 'ALL';
  const currentSearch = searchParams.get('search') || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getOrders({
        page: currentPage,
        status: currentStatus,
        coin: currentCoin,
        search: currentSearch,
      });
      if (res.success) {
        setOrders(res.results);
        setSummary(res.summary);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [currentStatus, currentCoin, currentSearch, currentPage]);

  const handleStatusFilterChange = (status: string) => {
    const next = new URLSearchParams(searchParams);
    if (status === 'ALL') next.delete('status');
    else next.set('status', status);
    next.set('page', '1');
    setSearchParams(next);
  };

  const handleCoinFilterChange = (coin: string) => {
    const next = new URLSearchParams(searchParams);
    if (coin === 'ALL') next.delete('coin');
    else next.set('coin', coin);
    next.set('page', '1');
    setSearchParams(next);
  };

  const handleSearchChange = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem('search') as HTMLInputElement;
    const next = new URLSearchParams(searchParams);
    if (input.value.trim()) next.set('search', input.value.trim());
    else next.delete('search');
    next.set('page', '1');
    setSearchParams(next);
  };

  const openOrderDetail = async (id: string) => {
    setSelectedOrderId(id);
    setIsLoadingDetail(true);
    try {
      const res = await adminApi.getOrderDetail(id);
      if (res.success) {
        setOrderDetail(res.order);
      }
    } catch (err) {
      console.error('Failed to load order detail', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Orders Pipeline</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Comprehensive audit and status control for all crypto conversions</p>
        </div>

        <button
          onClick={fetchOrders}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-subtle transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-subtle">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Orders</span>
          <span className="text-xl font-black font-mono text-slate-900 dark:text-white">{summary.total}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-subtle">
          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">Completed</span>
          <span className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400">{summary.completed}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-amber-200 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/20 shadow-subtle">
          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">In Progress</span>
          <span className="text-xl font-black font-mono text-amber-700 dark:text-amber-400">{summary.pending}</span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-rose-200 dark:border-rose-800/80 bg-rose-50/20 dark:bg-rose-950/20 shadow-subtle">
          <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">Failed / Stalled</span>
          <span className="text-xl font-black font-mono text-rose-700 dark:text-rose-400">{summary.failed}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-subtle space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Form */}
          <form onSubmit={handleSearchChange} className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute inset-y-0 left-3 my-auto text-slate-400" />
            <input
              type="text"
              name="search"
              defaultValue={currentSearch}
              placeholder="Search reference, wallet, Paystack ref, or tx hash..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 dark:focus:ring-emerald-950"
            />
          </form>

          {/* Coin Select */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">Asset:</span>
            <select
              value={currentCoin}
              onChange={(e) => handleCoinFilterChange(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              {COIN_FILTERS.map((c) => (
                <option key={c} value={c}>
                  {c === 'ALL' ? 'All Coins' : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              onClick={() => handleStatusFilterChange(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                currentStatus === st
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Orders Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3">Order Ref</th>
                <th className="px-5 py-3">Asset</th>
                <th className="px-5 py-3">Fiat (NGN)</th>
                <th className="px-5 py-3">Crypto Amount</th>
                <th className="px-5 py-3">Destination Wallet</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Speed</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium font-mono">
              {orders.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                    {ord.order_reference}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="font-bold text-slate-800 dark:text-slate-200 font-sans">{ord.coin.split('_')[0]}</span>
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] ml-1 uppercase">({ord.network})</span>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                    {formatNaira(ord.fiat_amount_ngn)}
                  </td>
                  <td className="px-5 py-3.5 text-emerald-700 dark:text-emerald-400 font-bold">
                    {ord.crypto_amount}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 dark:text-slate-400 text-[11px]">
                    {ord.masked_wallet}
                  </td>
                  <td className="px-5 py-3.5 font-sans">
                    <StatusBadge status={ord.status} />
                  </td>
                  <td className="px-5 py-3.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                    {formatSpeed(ord.speed_metric_ms)}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                    {formatDateTime(ord.created_at)}
                  </td>
                  <td className="px-5 py-3.5 text-right font-sans">
                    <button
                      onClick={() => openOrderDetail(ord.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Inspect Order Forensic Timeline"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            Showing page <strong className="text-slate-800 dark:text-slate-200">{pagination.page}</strong> of{' '}
            <strong className="text-slate-800 dark:text-slate-200">{pagination.total_pages || 1}</strong> ({pagination.total} orders)
          </span>

          <div className="flex gap-1">
            <button
              disabled={pagination.page <= 1}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set('page', (pagination.page - 1).toString());
                setSearchParams(next);
              }}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set('page', (pagination.page + 1).toString());
                setSearchParams(next);
              }}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Forensic Audit Detail Modal */}
      {selectedOrderId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Forensic Order Audit
                </span>
                <h2 className="text-lg font-black font-mono text-slate-900 dark:text-white">
                  {orderDetail?.order_reference || 'Loading...'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setSelectedOrderId(null);
                  setOrderDetail(null);
                }}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingDetail || !orderDetail ? (
              <div className="py-12 text-center text-xs text-slate-400 font-mono">
                Loading audit trail...
              </div>
            ) : (
              <div className="space-y-6 text-xs">
                {/* Status & Amounts */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Status</span>
                    <StatusBadge status={orderDetail.status} />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Fiat Amount</span>
                    <span className="font-bold text-slate-900 dark:text-white">{formatNaira(orderDetail.fiat_amount_ngn)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Crypto Sent</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{orderDetail.crypto_amount} {orderDetail.coin.split('_')[0]}</span>
                  </div>
                </div>

                {/* Gateway Details */}
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <h3 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-[11px]">
                    Banking & Gateway Telemetry
                  </h3>
                  <div className="space-y-1.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Paystack Virtual Nuban:</span>
                      <span>{orderDetail.virtual_account_number} ({orderDetail.virtual_bank_name})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Paystack Reference:</span>
                      <span>{orderDetail.paystack_reference || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Quidax Withdrawal ID:</span>
                      <span>{orderDetail.quidax_payout_id || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Blockchain Tx Hash:</span>
                      {orderDetail.tx_hash ? (
                        <a
                          href={orderDetail.explorer_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 dark:text-emerald-400 underline flex items-center gap-1"
                        >
                          <span>{orderDetail.tx_hash.slice(0, 18)}...</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audit Trail Timeline */}
                <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <h3 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 text-[11px]">
                    Immutable State Audit Trail
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {orderDetail.audit_logs.map((log) => (
                      <div key={log.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {log.from_state ? `${log.from_state} ➔ ` : ''}{log.to_state}
                          </span>
                          <span className="text-slate-400 font-mono">{formatDateTime(log.timestamp)}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{String(log.metadata?.notes || 'State transitioned successfully.')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
