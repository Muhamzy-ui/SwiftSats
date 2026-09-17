import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Search,
  ExternalLink,
  RefreshCw,
  ArrowLeft,
  Clock,
  ArrowUpRight,
  Mail,
  Shield,
  KeyRound,
  Check,
  LogOut,
  AlertCircle,
  Lock,
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

  // Search Mode: 'reference' or 'email'
  const [searchMode, setSearchMode] = useState<'reference' | 'email'>('reference');

  // Direct Reference Lookup
  const [searchInput, setSearchInput] = useState(reference || '');
  const [order, setOrder] = useState<OrderPublic | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Local Device Orders
  const [localOrders, setLocalOrders] = useState<LocalTrackedOrder[]>([]);

  // Secure Email OTP Recovery State
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [userOrders, setUserOrders] = useState<Partial<OrderPublic>[]>([]);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState<string | null>(null);

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

  // OTP Handlers
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = recoveryEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setOtpError('Please enter a valid email address.');
      return;
    }

    setIsSendingOtp(true);
    setOtpError(null);
    setOtpSuccessMsg(null);

    try {
      const res = await ordersApi.sendEmailOTP(clean);
      if (res.success) {
        setOtpSent(true);
        setOtpSuccessMsg(res.message || 'Verification code sent to your email.');
      } else {
        setOtpError(res.message || 'Could not send verification code.');
      }
    } catch (err: any) {
      setOtpError(err.message || 'No orders found for this email address.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanOtp = otpInput.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      setOtpError('Please enter the verification code sent to your email.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);

    try {
      const res = await ordersApi.verifyEmailOTP(recoveryEmail.trim().toLowerCase(), cleanOtp);
      if (res.success) {
        setEmailVerified(true);
        setUserOrders(res.orders || []);
        setOtpSuccessMsg(`Found ${res.orders?.length || 0} order(s) for your email.`);
      } else {
        setOtpError(res.message || 'Invalid or expired verification code.');
      }
    } catch (err: any) {
      setOtpError(err.message || 'Verification failed. Please check code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResetEmail = () => {
    setEmailVerified(false);
    setOtpSent(false);
    setOtpInput('');
    setUserOrders([]);
    setOtpError(null);
    setOtpSuccessMsg(null);
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
          <Lock className="w-3.5 h-3.5" />
          <span>Private & Encrypted</span>
        </span>
      </div>

      {/* Page Title */}
      <div className="text-center space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Track Your Order
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          View real-time payment confirmation, settlement status, and on-chain blockchain delivery.
        </p>
      </div>

      {/* Search Mode Switcher Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] shadow-xs">
          <button
            type="button"
            onClick={() => setSearchMode('reference')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              searchMode === 'reference'
                ? 'bg-[#00c853] dark:bg-[#00e676] text-white dark:text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search by Code</span>
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('email')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              searchMode === 'email'
                ? 'bg-[#00c853] dark:bg-[#00e676] text-white dark:text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Find by Email (OTP)</span>
          </button>
        </div>
      </div>

      {/* MODE 1: Search by Order Reference Code */}
      {searchMode === 'reference' && (
        <form onSubmit={handleSearch} className="flex gap-2 animate-in fade-in duration-150">
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
      )}

      {/* MODE 2: Secure Email OTP Order Recovery */}
      {searchMode === 'email' && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-white/[0.08] shadow-xl space-y-4 animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-[#00c853] dark:text-[#00e676] flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Private Order Recovery
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Enter your email to receive a secure 6-digit verification code and view all your transactions.
              </p>
            </div>
          </div>

          {otpError && (
            <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{otpError}</span>
            </div>
          )}

          {otpSuccessMsg && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 text-xs font-semibold text-emerald-800 dark:text-[#00e676] flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 stroke-[3]" />
              <span>{otpSuccessMsg}</span>
            </div>
          )}

          {/* Step 1: Input Email */}
          {!otpSent && !emailVerified && (
            <form onSubmit={handleSendOtp} className="flex flex-col sm:flex-row gap-2 pt-1">
              <div className="relative flex-1">
                <input
                  type="email"
                  required
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="Enter the email used during purchase"
                  className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00c853] dark:focus:ring-[#00e676]"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
              </div>
              <button
                type="submit"
                disabled={isSendingOtp}
                className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 disabled:opacity-50 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 shrink-0"
              >
                {isSendingOtp ? 'Sending Code...' : 'Send Verification Code'}
              </button>
            </form>
          )}

          {/* Step 2: Input 6-Digit OTP */}
          {otpSent && !emailVerified && (
            <form onSubmit={handleVerifyOtp} className="space-y-3 pt-1">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit code"
                    className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-sm font-mono font-bold tracking-widest text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00c853] dark:focus:ring-[#00e676]"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
                </div>
                <button
                  type="submit"
                  disabled={isVerifyingOtp || otpInput.length < 6}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 disabled:opacity-50 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 shrink-0"
                >
                  {isVerifyingOtp ? 'Verifying...' : 'Verify & View Orders'}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <span>Didn't receive code?</span>
                <button
                  type="button"
                  onClick={handleResetEmail}
                  className="text-[#00c853] dark:text-[#00e676] font-bold hover:underline"
                >
                  Change Email / Resend
                </button>
              </div>
            </form>
          )}

          {/* Step 3: Verified User Orders List */}
          {emailVerified && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-500/30 text-xs">
                <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Verified: <strong className="font-mono text-emerald-950 dark:text-white">{recoveryEmail}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleResetEmail}
                  className="text-xs font-bold text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 transition-colors flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

              {userOrders.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No orders found for this email address.
                </div>
              ) : (
                <div className="space-y-2">
                  {userOrders.map((ord) => (
                    <div
                      key={ord.order_reference}
                      onClick={() => ord.order_reference && selectOrderToTrack(ord.order_reference, ord.status)}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-white/[0.08] hover:border-[#00c853] dark:hover:border-[#00e676] transition-all cursor-pointer shadow-xs group flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        {getCoinLogo(ord.coin || 'BTC', 22)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                              {ord.order_reference}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {ord.coin?.split('_')[0]} • {ord.network}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            {formatNaira(ord.fiat_amount_ngn || 0)} → {ord.crypto_amount} {ord.coin?.split('_')[0]}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <StatusBadge status={ord.status || 'AWAITING_PAYMENT'} />
                        <span className="text-xs font-bold text-[#00c853] dark:text-[#00e676] group-hover:underline flex items-center">
                          Track <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 text-xs font-semibold text-rose-700 dark:text-rose-300 text-center animate-in fade-in">
          {errorMsg}
        </div>
      )}

      {/* Active Tracked Order Detailed Card */}
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
                <span className="text-amber-500 dark:text-amber-400 font-medium">Awaiting payment verification</span>
              </div>
            )}

            <div className="flex justify-between items-center py-2">
              <span className="text-slate-500 dark:text-slate-400">Created At</span>
              <span className="text-slate-500 dark:text-slate-400 font-mono">{formatDateTime(order.created_at)}</span>
            </div>
          </div>
        </div>
      )}

      {/* User's Local Orders (saved only on this device's browser) */}
      {localOrders.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#00c853] dark:text-[#00e676]" />
              <span>Orders on This Device</span>
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
                      {isOpen ? 'Pay Now' : 'Track'} <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
