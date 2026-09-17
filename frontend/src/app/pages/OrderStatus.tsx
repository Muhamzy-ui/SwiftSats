import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Activity,
} from 'lucide-react';
import { ordersApi } from '../../shared/api/orders';
import { OrderPublic } from '../../shared/types';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { formatNaira, formatDateTime, formatSpeed } from '../../shared/utils/formatters';
import { getCoinLogo } from '../../shared/components/CryptoLogos';
import { getStoredRecentOrders, getOpenOrder, LocalTrackedOrder } from '../../shared/utils/orderStorage';

export const OrderStatusPage: React.FC = () => {
  const { reference } = useParams<{ reference: string }>();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState(reference || '');
  const [order, setOrder] = useState<OrderPublic | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live Telemetry recent orders
  const [inProcessOrders, setInProcessOrders] = useState<Partial<OrderPublic>[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Partial<OrderPublic>[]>([]);
  const [localOrders, setLocalOrders] = useState<LocalTrackedOrder[]>([]);
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'in_process' | 'completed'>('all');

  const fetchOrder = async (ref: string) => {
    if (!ref.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await ordersApi.lookupOrder(ref.trim());
      if (res.success && res.order) {
        // Redirect to payment page ONLY when the order is open
        if (res.order.status === 'AWAITING_PAYMENT' || res.order.status === 'QUOTE_LOCKED') {
          navigate(`/pay/${res.order.order_reference}`);
          return;
        }

        setOrder(res.order);
        // Scroll smoothly to top to inspect tracked order
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setErrorMsg('Order reference not found. Please verify the code.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to locate order.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch recent telemetry orders from backend
  const loadRecentTelemetry = async () => {
    setIsLoadingTelemetry(true);
    try {
      const res = await ordersApi.getRecentTelemetryOrders();
      if (res.success) {
        setInProcessOrders(res.in_process || []);
        setCompletedOrders(res.completed || []);
      }
    } catch (e) {
      console.warn('Could not fetch telemetry feed', e);
    } finally {
      setIsLoadingTelemetry(false);
    }
  };

  useEffect(() => {
    // If no explicit reference in URL, check if there is an open order on this device
    if (!reference) {
      const openOrder = getOpenOrder();
      if (openOrder) {
        navigate(`/pay/${openOrder.order_reference}`, { replace: true });
        return;
      }
    }

    // Load local stored orders from this browser
    setLocalOrders(getStoredRecentOrders());
    // Load network telemetry
    loadRecentTelemetry();
  }, [reference, navigate]);

  useEffect(() => {
    if (reference) {
      setSearchInput(reference);
      fetchOrder(reference);
    }
  }, [reference]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder(searchInput);
  };

  const selectOrderToTrack = (ref: string, orderStatus?: string) => {
    if (orderStatus === 'AWAITING_PAYMENT' || orderStatus === 'QUOTE_LOCKED') {
      navigate(`/pay/${ref}`);
      return;
    }
    setSearchInput(ref);
    fetchOrder(ref);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-6 px-4">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Buy</span>
        </Link>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-[#00c853] dark:text-[#00e676] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 font-mono shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#00c853] dark:bg-[#00e676] animate-pulse" />
          <span>Live Blockchain Telemetry</span>
        </span>
      </div>

      {/* Page Title */}
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Track Your Order
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Enter your order reference below to view live bank transfer confirmation, processing status, and on-chain payout delivery.
        </p>
      </div>

      {/* Search Bar with Emerald Theme */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
            placeholder="e.g. SATS-XXXX-XXXX"
            className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-[#00c853] dark:focus:ring-[#00e676] shadow-sm transition-all"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 disabled:opacity-50 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 shrink-0"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Checking...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4 stroke-[2.5]" />
              <span>Track</span>
            </>
          )}
        </button>
      </form>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-xs font-semibold text-rose-700 dark:text-rose-300 text-center animate-in fade-in">
          {errorMsg}
        </div>
      )}

      {/* Active Tracked Order Card */}
      {order && (
        <div className="rounded-3xl p-6 sm:p-8 space-y-6 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/[0.08] shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/[0.08]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Tracked Reference
              </span>
              <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                {order.order_reference}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={order.status} />
              <button
                type="button"
                onClick={() => fetchOrder(order.order_reference)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="Refresh Status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Hero Numbers */}
          <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/[0.08] text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              {getCoinLogo(order.coin, 24)}
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Crypto Payout Amount
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-[#00c853] dark:text-[#00e676]">
              {order.crypto_amount} {order.coin.split('_')[0]}
            </div>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 block">
              Fiat Paid: <strong className="text-slate-900 dark:text-white font-mono">{formatNaira(order.fiat_amount_ngn)}</strong>
            </span>
          </div>

          <div className="space-y-3 text-xs divide-y divide-slate-100 dark:divide-white/[0.06]">
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-500 dark:text-slate-400">Destination Network</span>
              <span className="font-bold text-slate-900 dark:text-white uppercase">{order.network}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-slate-500 dark:text-slate-400">Masked Wallet</span>
              <span className="font-mono text-slate-900 dark:text-white">{order.masked_wallet_address}</span>
            </div>

            {order.speed_metric_ms && (
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 dark:text-slate-400">Delivery Velocity</span>
                <span className="font-mono font-bold text-[#00c853] dark:text-[#00e676]">
                  {formatSpeed(order.speed_metric_ms)}
                </span>
              </div>
            )}

            {order.tx_hash ? (
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 dark:text-slate-400">On-Chain Transaction</span>
                <a
                  href={order.explorer_url || `https://mempool.space/tx/${order.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[#00c853] dark:text-[#00e676] hover:underline flex items-center gap-1 font-bold"
                >
                  <span>{order.tx_hash.slice(0, 16)}...</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ) : (
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 dark:text-slate-400">Blockchain State</span>
                <span className="text-amber-500 dark:text-amber-400 font-medium">Awaiting final block broadcast</span>
              </div>
            )}

            <div className="flex justify-between items-center py-2">
              <span className="text-slate-500 dark:text-slate-400">Created At</span>
              <span className="text-slate-500 dark:text-slate-400 font-mono">{formatDateTime(order.created_at)}</span>
            </div>
          </div>
        </div>
      )}

      {/* User's Local Orders (if any exist from this device) */}
      {localOrders.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#00c853] dark:text-[#00e676]" />
              <span>Your Orders on This Device</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">
              {localOrders.length} saved
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {localOrders.map((ord) => {
              const isOpen = ord.status === 'AWAITING_PAYMENT' || ord.status === 'QUOTE_LOCKED';
              return (
                <button
                  key={ord.order_reference}
                  type="button"
                  onClick={() => selectOrderToTrack(ord.order_reference, ord.status)}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between group ${
                    searchInput === ord.order_reference
                      ? 'border-[#00c853] dark:border-[#00e676] bg-emerald-500/10'
                      : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-white/[0.08] hover:border-emerald-500/40'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      {getCoinLogo(ord.coin, 16)}
                      <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                        {ord.order_reference}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                      {formatNaira(ord.amount_ngn)} • {ord.crypto_amount} {ord.coin.split('_')[0]}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={ord.status} showDot={false} className="text-[10px] py-0.5 px-2" />
                    <span className="text-[10px] font-bold text-[#00c853] dark:text-[#00e676] group-hover:underline flex items-center">
                      {isOpen ? 'Pay Now' : 'Track'} <ArrowUpRight className="w-3 h-3 ml-0.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Platform Orders Section (In-Process & Completed) */}
      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00c853] dark:text-[#00e676]" />
              <span>Recent Network Activity</span>
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Live non-custodial orders processing & dispatched across Nigeria
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-[#00c853] dark:bg-[#00e676] text-white dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('in_process')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'in_process'
                  ? 'bg-[#00c853] dark:bg-[#00e676] text-white dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span>In Process ({inProcessOrders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'completed'
                  ? 'bg-[#00c853] dark:bg-[#00e676] text-white dark:text-slate-950 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Completed ({completedOrders.length})</span>
            </button>
          </div>
        </div>

        {/* 1. ORDERS IN PROCESS (when tab is 'all' or 'in_process') */}
        {(activeTab === 'all' || activeTab === 'in_process') && inProcessOrders.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-500 dark:text-amber-400 px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Orders In Process (Pending Bank Transfer / Verification)</span>
              </span>
            </div>

            <div className="space-y-2">
              {inProcessOrders.map((procOrder) => (
                <div
                  key={procOrder.order_reference}
                  onClick={() => procOrder.order_reference && selectOrderToTrack(procOrder.order_reference, procOrder.status)}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/[0.08] hover:border-[#00c853] dark:hover:border-[#00e676] transition-all cursor-pointer shadow-xs group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getCoinLogo(procOrder.coin || 'BTC', 22)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                            {procOrder.order_reference}
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {procOrder.coin?.split('_')[0]} • {procOrder.network}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {formatNaira(procOrder.fiat_amount_ngn || 0)} →{' '}
                          <strong className="text-slate-900 dark:text-white">{procOrder.crypto_amount} {procOrder.coin?.split('_')[0]}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={procOrder.status || 'AWAITING_PAYMENT'} />
                      <button
                        type="button"
                        className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-[#00c853] dark:group-hover:bg-[#00e676] group-hover:text-white dark:group-hover:text-slate-950 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <span>Track</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. COMPLETED ORDERS (when tab is 'all' or 'completed') */}
        {(activeTab === 'all' || activeTab === 'completed') && completedOrders.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#00c853] dark:text-[#00e676] px-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00c853] dark:text-[#00e676]" />
                <span>Recently Delivered Payouts</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">
                Instant delivery via Quidax SEC Engine
              </span>
            </div>

            <div className="space-y-2">
              {completedOrders.map((compOrder) => (
                <div
                  key={compOrder.order_reference}
                  onClick={() => compOrder.order_reference && selectOrderToTrack(compOrder.order_reference)}
                  className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/[0.08] hover:border-[#00c853] dark:hover:border-[#00e676] transition-all cursor-pointer shadow-xs group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getCoinLogo(compOrder.coin || 'BTC', 22)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                            {compOrder.order_reference}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-[#00c853] dark:text-[#00e676] border border-emerald-200 dark:border-emerald-500/30">
                            Delivered
                          </span>
                          {compOrder.speed_metric_ms && (
                            <span className="hidden sm:inline-block text-[10px] font-mono text-slate-400">
                              ⚡ {formatSpeed(compOrder.speed_metric_ms)}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          Received: <strong className="text-[#00c853] dark:text-[#00e676]">{compOrder.crypto_amount} {compOrder.coin?.split('_')[0]}</strong>
                          <span className="text-slate-400 ml-2">({formatNaira(compOrder.fiat_amount_ngn || 0)})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {compOrder.tx_hash && (
                        <a
                          href={compOrder.explorer_url || `https://mempool.space/tx/${compOrder.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#00c853] dark:text-[#00e676] transition-colors"
                          title="View on Blockchain Explorer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-[#00c853] dark:group-hover:bg-[#00e676] group-hover:text-white dark:group-hover:text-slate-950 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        <span>Details</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading placeholder when fetching telemetry */}
        {isLoadingTelemetry && inProcessOrders.length === 0 && completedOrders.length === 0 && (
          <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-white/[0.04] text-center space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#00c853] dark:text-[#00e676] mx-auto" />
            <p className="text-xs text-slate-400">Loading live blockchain telemetry orders...</p>
          </div>
        )}
      </div>
    </div>
  );
};
