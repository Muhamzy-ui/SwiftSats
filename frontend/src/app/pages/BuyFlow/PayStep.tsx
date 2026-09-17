import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, ExternalLink, Zap, Clock, ShieldAlert, Upload, CheckCircle2 } from 'lucide-react';
import { OrderLockedResponse, OrderDetail } from '../../../shared/types';
import { ordersApi } from '../../../shared/api/orders';
import { formatNaira, formatSpeed } from '../../../shared/utils/formatters';

interface PayStepProps {
  orderData: OrderLockedResponse;
  onSuccess: (completedOrder: OrderDetail) => void;
}

export const PayStep: React.FC<PayStepProps> = ({ orderData, onSuccess }) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [currentOrder, setCurrentOrder] = useState<OrderDetail>(orderData.order);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptSubmitted, setReceiptSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (orderData.payment_instructions?.expires_at) {
      const diff = Math.floor((new Date(orderData.payment_instructions.expires_at).getTime() - Date.now()) / 1000);
      return Math.max(0, diff);
    }
    return 900; // Default 15 minutes
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { payment_instructions } = orderData;
  const orderRef = currentOrder.order_reference;

  // 15-Minute Countdown Timer
  useEffect(() => {
    if (timeLeft <= 0 || currentOrder.status === 'COMPLETED') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, currentOrder.status]);

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
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
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

  const handleSimulatePayment = async () => {
    setIsSimulating(true);
    try {
      // Simulate Nomba webhook transfer
      const expectedAmount = parseFloat(payment_instructions.amount_ngn);
      const response = await fetch('/api/v1/payments/webhook/nomba/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'payment_success',
          data: {
            amount: expectedAmount,
            transaction_reference: `NMB_SIM_${Date.now()}`,
            sender_name: 'Simulated Customer',
            status: 'SUCCESS',
          },
        }),
      });

      if (response.ok) {
        const refreshed = await ordersApi.lookupOrder(orderRef);
        if (refreshed.success) {
          setCurrentOrder(refreshed.order);
          onSuccess(refreshed.order);
        }
      }
    } catch (err) {
      console.error('Simulation failed', err);
    } finally {
      setIsSimulating(false);
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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-white">
          Transfer to {payment_instructions.bank_name || 'Bank Settlement'}
        </h2>
        <p className="text-xs text-slate-400">
          Transfer the exact amount below from your bank app. Crypto releases in seconds!
        </p>
      </div>

      {/* 15-Minute Countdown Timer & Kobo Salt Warning */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 text-xs">
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

      {/* Hero Primary Element: Large, Confident Exact Naira with Kobo Salt */}
      <div className="text-center space-y-1 py-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
          Exact Amount to Pay (Include Kobo Decimal)
        </span>
        <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-[#00e676]">
          {formatNaira(payment_instructions.amount_ngn)}
        </div>
        <div className="flex items-center justify-center gap-1 text-[11px] text-amber-400 font-medium">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>You MUST pay the exact kobo amount shown above</span>
        </div>
      </div>

      {/* Dynamic Virtual Bank Settlement Card */}
      <div className="p-5 rounded-3xl bg-slate-900/80 border border-white/[0.08] space-y-4 shadow-xl">
        {/* Account Number Box */}
        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between shadow-inner">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Dynamic Virtual Account Number
            </span>
            <span className="text-2xl font-black font-mono tracking-wider text-white">
              {payment_instructions.account_number || '—'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => copyToClipboard(payment_instructions.account_number || '', 'acc')}
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
            <span className="font-bold text-white text-sm">
              {payment_instructions.bank_name || 'Bank Transfer'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-t border-slate-800">
            <span className="text-slate-400">Beneficiary Name</span>
            <span className="font-semibold text-slate-200 font-mono text-[11px]">
              {payment_instructions.account_name || 'SwiftSats Settlement'}
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-t border-slate-800">
            <span className="text-slate-400">Order Reference</span>
            <span className="font-bold text-indigo-400 font-mono">
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

      {/* Dev Simulation Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleSimulatePayment}
          disabled={isSimulating}
          className="w-full py-3 rounded-2xl bg-emerald-950/20 hover:bg-emerald-950/40 border border-emerald-500/20 text-[#00e676] font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>{isSimulating ? 'Simulating Nomba Transfer...' : '⚡ Simulate Nomba Bank Transfer'}</span>
        </button>
      </div>
    </div>
  );
};
