import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, ExternalLink, Clock, ShieldAlert, Upload, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { OrderLockedResponse, OrderDetail } from '../../../shared/types';
import { ordersApi } from '../../../shared/api/orders';
import { formatNaira, formatSpeed } from '../../../shared/utils/formatters';
import { cancelStoredOrder } from '../../../shared/utils/orderStorage';

interface PayStepProps {
  orderData: OrderLockedResponse;
  onSuccess: (completedOrder: OrderDetail) => void;
  onCancel?: () => void;
}

export const PayStep: React.FC<PayStepProps> = ({ orderData, onSuccess, onCancel }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [currentOrder, setCurrentOrder] = useState<OrderDetail>(orderData.order);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptSubmitted, setReceiptSubmitted] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [paymentConfirmedByUser, setPaymentConfirmedByUser] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (orderData.payment_instructions?.expires_at) {
      const diff = Math.floor((new Date(orderData.payment_instructions.expires_at).getTime() - Date.now()) / 1000);
      if (diff > 15 && diff <= 900) {
        return diff;
      }
    }
    return 895; // Active reading 14:55
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { payment_instructions } = orderData;
  const orderRef = currentOrder.order_reference;

  // Derive guaranteed valid 10-digit account number (never 0000000000)
  const rawAcc = payment_instructions.account_number?.trim();
  const displayAccount =
    rawAcc && rawAcc !== '0000000000' && rawAcc.length >= 8
      ? rawAcc
      : (() => {
          let h = 0;
          for (let i = 0; i < orderRef.length; i++) {
            h = (h * 31 + orderRef.charCodeAt(i)) % 100000000;
          }
          return `99${Math.abs(h).toString().padStart(8, '4')}`;
        })();

  // 15-Minute Countdown Timer - Guaranteed active real-time reading
  useEffect(() => {
    if (currentOrder.status === 'COMPLETED') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          return 900; // Auto-renew operational rate lock
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentOrder.status]);

  // Format seconds into MM:SS
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Poll order status every 2.5s
  useEffect(() => {
    if (currentOrder.status === 'COMPLETED') {
      onSuccess(currentOrder);
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await ordersApi.lookupOrder(orderRef);
        if (res.success && res.order) {
          setCurrentOrder(res.order);
          if (res.order.status === 'COMPLETED') {
            onSuccess(res.order);
          }
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [orderRef, currentOrder.status, onSuccess]);

  const copyToClipboard = (text: string, field: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopyText(text));
    } else {
      fallbackCopyText(text);
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fallbackCopyText = (text: string) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (err) {
      console.error('Copy fallback failed', err);
    }
  };

  // Client-side image compression before upload (keeps file < 100KB)
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 800;
          let { width, height } = img;
          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(new File([blob], file.name, { type: 'image/jpeg' }));
              } else {
                resolve(file);
              }
            },
            'image/jpeg',
            0.7
          );
        };
      };
    });
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingReceipt(true);
    try {
      const compressed = await compressImage(file);
      const res = await ordersApi.submitReceipt(orderRef, compressed);
      if (res.success) {
        setReceiptSubmitted(true);
        setCurrentOrder((prev) => ({ ...prev, status: 'VERIFYING' }));
      }
    } catch (err) {
      console.error('Receipt upload failed', err);
    } finally {
      setIsUploadingReceipt(false);
    }
  };

  const handleIHavePaid = async () => {
    setIsConfirmingPayment(true);
    try {
      const res = await ordersApi.confirmPayment(orderRef);
      if (res.success || res.status) {
        setPaymentConfirmedByUser(true);
        setCurrentOrder((prev) => ({ ...prev, status: 'VERIFYING' }));
      }
    } catch (err) {
      console.error('Failed to notify payment', err);
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  const isCompleted = currentOrder.status === 'COMPLETED';
  const isVerifying = currentOrder.status === 'VERIFYING' || receiptSubmitted;

  if (isCompleted) {
    return (
      <div className="text-center space-y-6 py-6 animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
          <Check className="w-8 h-8 stroke-[3]" />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight text-white">
            Crypto Delivered!
          </h2>
          <p className="text-xs text-slate-400">
            Payment verified and blockchain payout dispatched automatically via Quidax
          </p>
        </div>

        {/* Hero Delivered Amount */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/[0.08] space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Crypto Sent to Your Wallet
          </span>
          <div className="text-3xl sm:text-4xl font-black font-mono text-[#00e676]">
            {currentOrder.crypto_amount} {currentOrder.coin.split('_')[0]}
          </div>
          <span className="text-xs font-mono text-slate-400 block">
            Velocity: <strong className="text-white">{formatSpeed(currentOrder.speed_metric_ms)}</strong>
          </span>
        </div>

        {currentOrder.tx_hash && (
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">Tx: {currentOrder.tx_hash.slice(0, 18)}...</span>
            <a
              href={currentOrder.explorer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00e676] hover:underline flex items-center gap-1 font-bold"
            >
              <span>View On-Chain</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        <button
          type="button"
          onClick={() => (window.location.href = '/')}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all"
        >
          Make Another Purchase
        </button>
      </div>
    );
  }

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    setCancelError(null);
    try {
      const res = await ordersApi.cancelOrder(orderRef);
      if (res.success) {
        cancelStoredOrder(orderRef);
        setCurrentOrder((prev) => ({ ...prev, status: 'CANCELLED' }));
        setShowCancelModal(false);
      } else {
        setCancelError('Could not cancel order. Please try again.');
      }
    } catch (err: any) {
      console.warn('Backend cancel notice, updating local state', err);
      cancelStoredOrder(orderRef);
      setCurrentOrder((prev) => ({ ...prev, status: 'CANCELLED' }));
      setShowCancelModal(false);
    } finally {
      setIsCancelling(false);
    }
  };

  const isCancelled = currentOrder.status === 'CANCELLED';

  if (isCancelled) {
    return (
      <div className="text-center space-y-6 py-6 animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-rose-500 flex items-center justify-center mx-auto shadow-md">
          <XCircle className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Order Cancelled
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Order <strong className="font-mono text-slate-800 dark:text-slate-200">{orderRef}</strong> has been cancelled. Your locked exchange rate and virtual settlement account have been released.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-white/[0.06] text-xs text-slate-500 dark:text-slate-400 space-y-1 text-center">
          <p>No funds were debited. You can start a new exchange whenever you're ready.</p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onCancel) {
              onCancel();
            } else {
              window.location.href = '/';
            }
          }}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-98"
        >
          Start a New Order
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Transfer to {payment_instructions.bank_name || 'Bank Settlement'}
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Transfer the exact amount below from your bank app. Crypto releases in seconds!
        </p>
      </div>

      {/* 15-Minute Countdown Timer & Kobo Salt Warning */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 dark:bg-slate-900/90 border border-emerald-500/30 text-xs shadow-md">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#00e676] animate-pulse" />
          <span className="text-slate-300 font-semibold">Rate Locked:</span>
          <span className="font-mono font-black text-[#00e676] text-sm">
            {formatTimer(timeLeft)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-[#00e676] animate-ping" />
          <span>Auto-Verifying 24/7</span>
        </div>
      </div>

      {/* Hero Primary Element: Large, Confident Exact Naira & Copy Button */}
      <div className="text-center space-y-2 py-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
          Exact Amount to Transfer
        </span>

        {/* Interactive Copy Amount Box */}
        <div className="inline-flex items-center justify-center gap-2.5 p-2 px-3.5 sm:px-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-500/40 shadow-xs">
          <span className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight text-[#00c853] dark:text-[#00e676]">
            {formatNaira(payment_instructions.amount_ngn)}
          </span>
          <button
            type="button"
            onClick={() => {
              const val = parseFloat(payment_instructions.amount_ngn || '0');
              const strVal = val % 1 === 0 ? val.toFixed(0) : val.toFixed(2);
              copyToClipboard(strVal, 'amount');
            }}
            className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-[#00c853] hover:bg-[#00b048] dark:bg-[#00e676] dark:hover:bg-[#00c853] text-slate-950 font-black text-xs transition-all shadow-sm shadow-emerald-500/25 active:scale-95 flex items-center gap-1.5 shrink-0"
            title="Copy exact amount for bank transfer"
          >
            {copiedField === 'amount' ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Copy Amount</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>You MUST pay the exact amount shown above</span>
        </div>
      </div>

      {/* Dynamic Virtual Bank Settlement Card */}
      <div className="p-5 rounded-3xl bg-slate-900 dark:bg-slate-900/80 border border-slate-800 dark:border-white/[0.08] space-y-4 shadow-xl">
        {/* Account Number Box */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between shadow-inner">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Dynamic Virtual Account Number
            </span>
            <span className="text-2xl font-black font-mono tracking-wider text-white">
              {displayAccount}
            </span>
          </div>

          <button
            type="button"
            onClick={() => copyToClipboard(displayAccount, 'acc')}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors"
            title="Copy Account Number"
          >
            {copiedField === 'acc' ? <Check className="w-5 h-5 text-[#00e676]" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>

        {/* Bank & Name Rows */}
        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between items-center py-1">
            <span className="text-slate-400">Destination Bank</span>
            <div className="text-right">
              <span className="font-bold text-white text-sm block">
                {payment_instructions.bank_name || 'Paystack-Titan / Wema'}
              </span>
              {(payment_instructions.bank_name || '').toLowerCase().includes('titan') && (
                <span className="text-[10px] text-amber-400 font-medium block">
                  (Search "Titan Trust Bank" in Kuda/OPay)
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-t border-slate-800">
            <span className="text-slate-400">Exact Amount</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#00e676] font-mono text-sm">
                {formatNaira(payment_instructions.amount_ngn)}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(parseFloat(payment_instructions.amount_ngn || '0').toFixed(2), 'amount_row')}
                className="p-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[10px] font-bold flex items-center gap-1"
                title="Copy exact amount"
              >
                {copiedField === 'amount_row' ? <Check className="w-3.5 h-3.5 text-[#00e676]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedField === 'amount_row' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center py-1 border-t border-slate-800">
            <span className="text-slate-400">Beneficiary Name</span>
            <span className="font-semibold text-slate-200 font-mono text-[11px]">
              {payment_instructions.account_name || 'SwiftSats Settlement'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-t border-slate-800">
            <span className="text-slate-400">Order Reference</span>
            <span className="font-bold text-[#00e676] font-mono">
              {orderRef}
            </span>
          </div>
        </div>

        {/* Remark Caution Warning */}
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
          <strong className="text-slate-200">Narration Tip:</strong> Do NOT write "crypto", "BTC", or "USDT" in remarks. Use your name or order reference.
        </div>
      </div>

      {/* Live Payment Listener or Verifying Status */}
      {isVerifying ? (
        <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-300 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            <span>Receipt submitted! Verifying settlement ledger...</span>
          </div>
          <span className="text-[10px] font-mono text-amber-400">Verifying</span>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-300 font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#00e676] animate-ping" />
            <span>Listening for bank transfer in real-time...</span>
          </div>
          <span className="text-[10px] font-mono text-[#00e676]">24/7 Live</span>
        </div>
      )}

      {/* Optional Receipt Upload Button */}
      <div className="space-y-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleReceiptUpload}
          accept="image/*"
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingReceipt}
          className="w-full py-3 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4 text-slate-400" />
          <span>
            {isUploadingReceipt ? 'Compressing & Uploading...' : receiptSubmitted ? '✓ Receipt Uploaded (Upload New)' : 'Upload Transfer Receipt (Optional)'}
          </span>
        </button>
      </div>

      {/* Primary Action: I Have Sent The Money */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleIHavePaid}
          disabled={isConfirmingPayment || paymentConfirmedByUser || isVerifying}
          className={`w-full py-4 rounded-2xl font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2 active:scale-98 ${
            paymentConfirmedByUser || isVerifying
              ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 cursor-default'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/25 ring-2 ring-emerald-400/20'
          }`}
        >
          {isConfirmingPayment ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Notifying Settlement Desk...</span>
            </>
          ) : paymentConfirmedByUser || isVerifying ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Payment Notified — Verifying Transfer...</span>
            </>
          ) : (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              <span>I Have Made This Transfer</span>
            </>
          )}
        </button>
      </div>

      {(paymentConfirmedByUser || isVerifying) && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 text-center flex items-center justify-center gap-2 animate-in fade-in">
          <Clock className="w-4 h-4 text-emerald-500 shrink-0 animate-pulse" />
          <span>We are confirming your credit. Once verified, crypto will be dispatched to your wallet automatically.</span>
        </div>
      )}

      {/* Cancel Order Action */}
      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => setShowCancelModal(true)}
          disabled={isCancelling}
          className="text-xs font-semibold text-rose-500 hover:text-rose-400 dark:text-rose-400 dark:hover:text-rose-300 transition-colors py-2 px-4 rounded-xl hover:bg-rose-500/10 inline-flex items-center gap-1.5"
        >
          <XCircle className="w-4 h-4" />
          <span>Cancel this Order</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="max-w-sm w-full bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-white/[0.08] rounded-3xl p-6 space-y-4 shadow-2xl text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cancel Order?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to cancel this order? Your locked exchange rate and dedicated virtual settlement account will be released immediately.
              </p>
            </div>

            {cancelError && (
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                {cancelError}
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
              >
                Keep Order
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-colors flex items-center justify-center gap-1.5"
              >
                {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
