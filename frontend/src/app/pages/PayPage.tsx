import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ordersApi } from '../../shared/api/orders';
import { OrderPublic, OrderLockedResponse, OrderDetail } from '../../shared/types';
import { PayStep } from './BuyFlow/PayStep';
import { getOpenOrder, updateStoredOrderStatus } from '../../shared/utils/orderStorage';
import { ArrowLeft, RefreshCw, AlertCircle, Zap, Search, ShieldCheck } from 'lucide-react';
import { getCoinLogo } from '../../shared/components/CryptoLogos';

export const PayPage: React.FC = () => {
  const { reference } = useParams<{ reference?: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderPublic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const resolveOrder = async () => {
      setIsLoading(true);
      setErrorMsg(null);

      let targetRef = reference?.trim();

      // If no reference in URL, check if there's an open order on this device
      if (!targetRef) {
        const openOrder = getOpenOrder();
        if (openOrder) {
          navigate(`/pay/${openOrder.order_reference}`, { replace: true });
          return;
        } else {
          setIsLoading(false);
          return;
        }
      }

      try {
        const res = await ordersApi.lookupOrder(targetRef);
        if (res.success && res.order) {
          // If the order is already completed, redirect to track page
          if (res.order.status === 'COMPLETED') {
            navigate(`/track/${res.order.order_reference}`, { replace: true });
            return;
          }
          setOrder(res.order);
        } else {
          setErrorMsg('Order reference not found. Please verify the code.');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to load order payment instructions.');
      } finally {
        setIsLoading(false);
      }
    };

    resolveOrder();
  }, [reference, navigate]);

  // Handle successful payment completion
  const handlePaymentSuccess = (completedOrder: OrderDetail) => {
    updateStoredOrderStatus(
      completedOrder.order_reference,
      'COMPLETED',
      completedOrder.tx_hash || undefined,
      completedOrder.explorer_url || undefined
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-[#00c853] dark:text-[#00e676] animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 font-mono">
          Securing dynamic virtual bank account...
        </p>
      </div>
    );
  }

  // If no reference and no active open order
  if (!reference && !order) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center space-y-6 animate-in fade-in">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] flex items-center justify-center mx-auto shadow-md">
          <Zap className="w-8 h-8 text-[#00c853] dark:text-[#00e676]" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            No Active Payment Pending
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            You don't have an order awaiting payment. Pick a cryptocurrency to lock a live price or track an existing order.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Link
            to="/"
            className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
            <span>Instant Buy</span>
          </Link>
          <Link
            to="/track"
            className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/[0.08] text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Track Order</span>
          </Link>
        </div>
      </div>
    );
  }

  if (errorMsg || !order) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 space-y-4">
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 text-center flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg || 'Order could not be loaded.'}</span>
        </div>
        <div className="text-center">
          <Link
            to="/track"
            className="text-xs font-bold text-[#00c853] dark:text-[#00e676] hover:underline"
          >
            ← Go to Order Tracker
          </Link>
        </div>
      </div>
    );
  }

  // Format OrderLockedResponse for PayStep component
  const orderLockedData: OrderLockedResponse = {
    success: true,
    order: order,
    payment_instructions: {
      bank_name: order.virtual_bank_name || 'Bank Transfer',
      account_number: order.virtual_account_number || '',
      account_name: order.virtual_account_name || 'SwiftSats Settlement',
      amount_ngn: String(order.fiat_amount_expected || order.fiat_amount_ngn),
      salt_kobo: order.salt_kobo_value,
      order_reference: order.order_reference,
      expires_at: order.quote_expires_at,
    },
  };

  return (
    <div className="max-w-lg mx-auto py-4 sm:py-6 px-3 sm:px-4 space-y-4">
      {/* Top Navigation & Status Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Change Order</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold text-[#00c853] dark:text-[#00e676] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-500/30 font-mono shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00c853] dark:bg-[#00e676] animate-pulse" />
            <span>Awaiting Transfer</span>
          </span>
          <Link
            to={`/track/${order.order_reference}`}
            className="text-[11px] font-semibold text-slate-500 hover:text-[#00c853] dark:text-slate-400 dark:hover:text-[#00e676] transition-colors"
          >
            Track Page →
          </Link>
        </div>
      </div>

      {/* Primary Card Shell */}
      <div className="w-full bg-white dark:bg-[#0c1017] border border-slate-200/90 dark:border-white/[0.08] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-2xl space-y-4">
        {/* Coin Target Banner */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            {getCoinLogo(order.coin, 28)}
            <div>
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                {order.crypto_amount} {order.coin.split('_')[0]}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                Network: {order.network}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Reference
            </span>
            <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
              {order.order_reference}
            </span>
          </div>
        </div>

        {/* Embedded PayStep with Live Countdown and Bank Virtual Account */}
        <PayStep orderData={orderLockedData} onSuccess={handlePaymentSuccess} />
      </div>

      {/* Safety & Compliance Micro-Notice */}
      <div className="text-center pt-2">
        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00c853] dark:text-[#00e676]" />
          <span>Direct SEC-regulated execution • Zero customer BVN required</span>
        </p>
      </div>
    </div>
  );
};
