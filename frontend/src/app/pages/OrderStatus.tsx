import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Search, ExternalLink, RefreshCw, ArrowLeft } from 'lucide-react';
import { ordersApi } from '../../shared/api/orders';
import { OrderPublic } from '../../shared/types';
import { StatusBadge } from '../../shared/components/StatusBadge';
import { formatNaira, formatDateTime, formatSpeed } from '../../shared/utils/formatters';
import { getCoinLogo } from '../../shared/components/CryptoLogos';

export const OrderStatusPage: React.FC = () => {
  const { reference } = useParams<{ reference: string }>();
  const [searchInput, setSearchInput] = useState(reference || '');
  const [order, setOrder] = useState<OrderPublic | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchOrder = async (ref: string) => {
    if (!ref.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await ordersApi.lookupOrder(ref.trim());
      if (res.success && res.order) {
        setOrder(res.order);
      } else {
        setErrorMsg('Order reference not found.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to locate order.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (reference) {
      fetchOrder(reference);
    }
  }, [reference]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder(searchInput);
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 py-6 px-4">
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Buy</span>
        </Link>
        <span className="text-xs font-bold text-indigo-400 font-mono">Live Blockchain Telemetry</span>
      </div>

      <div className="text-center space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Track Your Order
        </h1>
        <p className="text-xs text-slate-400">
          Enter your SwiftSats order reference to verify live bank & blockchain state
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
            placeholder="e.g. SATS-XXXX-XXXX"
            className="w-full pl-10 pr-4 py-3.5 rounded-2xl glass-panel text-xs font-mono font-bold text-white uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-inner"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-4" />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="px-5 py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 active:scale-95 text-white font-bold text-xs shadow-md transition-all"
        >
          {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Track'}
        </button>
      </form>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-xs font-semibold text-rose-300 text-center">
          {errorMsg}
        </div>
      )}

      {order && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Reference
              </span>
              <span className="text-base font-black font-mono text-white">
                {order.order_reference}
              </span>
            </div>
            <StatusBadge status={order.status} />
          </div>

          {/* Hero Numbers */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/[0.08] text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              {getCoinLogo(order.coin, 22)}
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Crypto Payout Amount
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono text-[#00e676]">
              {order.crypto_amount} {order.coin.split('_')[0]}
            </div>
            <span className="text-xs font-mono text-slate-400 block">
              Paid: <strong className="text-white font-mono">{formatNaira(order.fiat_amount_ngn)}</strong>
            </span>
          </div>

          <div className="space-y-3 text-xs divide-y divide-white/[0.06]">
            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400">Destination Network</span>
              <span className="font-bold text-white uppercase">{order.network}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400">Masked Wallet</span>
              <span className="font-mono text-white">{order.masked_wallet_address}</span>
            </div>

            {order.speed_metric_ms && (
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">Delivery Velocity</span>
                <span className="font-mono font-bold text-indigo-400">
                  {formatSpeed(order.speed_metric_ms)}
                </span>
              </div>
            )}

            {order.tx_hash && (
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">On-Chain Transaction</span>
                <a
                  href={order.explorer_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-indigo-400 hover:underline flex items-center gap-1 font-bold"
                >
                  <span>{order.tx_hash.slice(0, 14)}...</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            <div className="flex justify-between items-center py-2">
              <span className="text-slate-400">Created At</span>
              <span className="text-slate-400 font-mono">{formatDateTime(order.created_at)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
