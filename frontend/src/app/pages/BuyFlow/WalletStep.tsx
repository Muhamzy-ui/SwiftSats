import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { QuoteCreatedResponse, OrderLockedResponse } from '../../../shared/types';
import { ordersApi } from '../../../shared/api/orders';
import { validateCryptoAddress } from '../../../shared/utils/validation';
import { formatNaira } from '../../../shared/utils/formatters';
import { getCoinLogo } from '../../../shared/components/CryptoLogos';
import { useAuth } from '../../../shared/context/AuthContext';

interface WalletStepProps {
  quote: QuoteCreatedResponse;
  onOrderLocked: (order: OrderLockedResponse) => void;
  onBack: () => void;
}

export const WalletStep: React.FC<WalletStepProps> = ({
  quote,
  onOrderLocked,
  onBack,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [walletAddress, setWalletAddress] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(quote.expires_in_seconds || 90);

  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user, email]);

  const [symbol] = quote.coin.split('_');

  // Countdown timer for locked quote
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleWalletChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.trim();
    setWalletAddress(val);
    setServerError(null);

    if (val.length > 5) {
      const check = validateCryptoAddress(val, quote.network);
      setValidationError(check.valid ? null : check.error || 'Invalid address');
    } else {
      setValidationError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walletAddress) {
      setValidationError('Please enter your destination wallet address');
      return;
    }

    const check = validateCryptoAddress(walletAddress, quote.network);
    if (!check.valid) {
      setValidationError(check.error || 'Invalid destination wallet address');
      return;
    }

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setEmailError('Please enter a valid email address to receive your payment receipt');
      return;
    }

    setIsValidating(true);
    setServerError(null);
    setEmailError(null);

    try {
      const order = await ordersApi.lockAndCreateOrder(
        quote.order_reference,
        walletAddress,
        cleanEmail
      );
      onOrderLocked(order);
    } catch (err: any) {
      setServerError(err.message || 'Failed to generate virtual account.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Adjust Amount</span>
        </button>

        <span className={`text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
          timeLeft <= 20
            ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 animate-pulse'
            : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-[#00e676] border border-emerald-300 dark:border-emerald-500/30'
        }`}>
          <Clock className="w-3.5 h-3.5" />
          <span>Rate Locked: {timeLeft}s</span>
        </span>
      </div>

      {/* Hero Delivery Summary Badge */}
      <div className="p-5 rounded-2xl bg-slate-900 dark:bg-slate-900/80 border border-slate-800 dark:border-white/[0.08] text-center space-y-2 shadow-sm">
        <div className="flex items-center justify-center gap-2">
          {getCoinLogo(quote.coin, 24)}
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Delivery Summary
          </span>
        </div>
        <div className="flex items-baseline justify-center gap-1.5">
          <span className="text-3xl font-black font-mono text-white">
            {quote.crypto_amount}
          </span>
          <span className="text-lg font-bold font-mono text-[#00e676]">
            {symbol}
          </span>
        </div>
        <span className="text-xs text-slate-400 block">
          Total to Pay: <strong className="font-mono text-white text-sm">{formatNaira(quote.fiat_amount_ngn)}</strong>
        </span>
      </div>

      {/* Inputs */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
            Destination {symbol} Address ({quote.network})
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={handleWalletChange}
            placeholder={`Paste your ${quote.network} wallet address`}
            className={`w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00c853] dark:focus:ring-[#00e676] transition-all ${
              validationError
                ? 'border-rose-400 ring-1 ring-rose-400'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          />
          {validationError && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{validationError}</span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
            <span>Email Address <span className="text-[#00c853] dark:text-[#00e676] font-black">*</span></span>
            <span className="text-[10px] text-slate-400 font-normal lowercase">for receipt & order recovery</span>
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError(null);
            }}
            placeholder="you@gmail.com (receipt & tracking sent here)"
            className={`w-full px-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00c853] dark:focus:ring-[#00e676] transition-all ${
              emailError
                ? 'border-rose-400 ring-1 ring-rose-400'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          />
          {emailError && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{emailError}</span>
            </p>
          )}

          {isAuthenticated && user ? (
            <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#00c853] dark:text-[#00e676] shrink-0" />
              <span className="text-emerald-800 dark:text-emerald-300 text-[11px] font-medium">
                Order will be saved to your SwiftSats account (<strong>{user.email}</strong>).
              </span>
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>Already registered?</span>
              <Link to="/login" className="font-bold text-[#00c853] dark:text-[#00e676] hover:underline">
                Sign in to link order
              </Link>
            </div>
          )}

          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-normal">
            🔒 In case your device turns off or browser closes, your payment receipt and private tracking link will be safely delivered here.
          </p>
        </div>
      </div>

      {serverError && (
        <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-xs font-semibold text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isValidating || timeLeft === 0}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.99] disabled:opacity-50 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
      >
        <span>{isValidating ? 'Generating Virtual Account...' : 'Get Virtual Bank Account'}</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  );
};
