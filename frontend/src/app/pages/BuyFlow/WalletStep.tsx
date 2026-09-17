import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  Sparkles,
  LogIn,
  Phone,
} from 'lucide-react';
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
  const { user, isAuthenticated, login, register } = useAuth();

  const [walletAddress, setWalletAddress] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(quote.expires_in_seconds || 90);

  // Auth gate state for unregistered buyers
  const [authMode, setAuthMode] = useState<'REGISTER' | 'LOGIN'>('REGISTER');
  const [authFullName, setAuthFullName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

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

  // Primary submission flow
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate destination wallet address
    if (!walletAddress) {
      setValidationError(`Please enter your destination ${quote.network} wallet address.`);
      return;
    }

    const check = validateCryptoAddress(walletAddress, quote.network);
    if (!check.valid) {
      setValidationError(check.error || 'Invalid destination wallet address');
      return;
    }

    setServerError(null);
    setAuthError(null);

    // 2. If user is not authenticated, perform inline registration or login first
    let activeEmail = user?.email || '';

    if (!isAuthenticated) {
      const cleanEmail = authEmail.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        setAuthError('Please provide a valid email address to create your account.');
        return;
      }

      if (!authPassword || authPassword.length < 6) {
        setAuthError('Password must be at least 6 characters.');
        return;
      }

      if (authMode === 'REGISTER' && authPassword !== authConfirmPassword) {
        setAuthError('Passwords do not match. Please verify.');
        return;
      }

      setIsValidating(true);

      try {
        if (authMode === 'REGISTER') {
          await register({
            email: cleanEmail,
            password: authPassword,
            full_name: authFullName.trim(),
            phone: authPhone.trim(),
          });
        } else {
          await login(cleanEmail, authPassword);
        }
        activeEmail = cleanEmail;
      } catch (err: any) {
        setAuthError(err.message || 'Authentication failed. Please check your credentials.');
        setIsValidating(false);
        return;
      }
    }

    // 3. Complete order and generate virtual bank account
    setIsValidating(true);
    try {
      const order = await ordersApi.lockAndCreateOrder(
        quote.order_reference,
        walletAddress,
        activeEmail
      );
      onOrderLocked(order);
    } catch (err: any) {
      setServerError(err.message || 'Failed to complete order. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 animate-in fade-in duration-200">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Adjust Amount</span>
        </button>

        <span
          className={`text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
            timeLeft <= 20
              ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 animate-pulse'
              : 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-[#00e676] border border-emerald-300 dark:border-emerald-500/30'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Rate Locked: {timeLeft}s</span>
        </span>
      </div>

      {/* Hero Delivery Summary Badge */}
      <div className="p-4 rounded-2xl bg-slate-900 dark:bg-slate-900/90 border border-slate-800 dark:border-white/[0.08] text-center space-y-1.5 shadow-sm">
        <div className="flex items-center justify-center gap-2">
          {getCoinLogo(quote.coin, 22)}
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Delivery Summary
          </span>
        </div>
        <div className="flex items-baseline justify-center gap-1.5">
          <span className="text-2xl sm:text-3xl font-black font-mono text-white">
            {quote.crypto_amount}
          </span>
          <span className="text-base sm:text-lg font-bold font-mono text-[#00e676]">
            {symbol}
          </span>
        </div>
        <span className="text-xs text-slate-400 block">
          Total to Pay: <strong className="font-mono text-white text-sm">{formatNaira(quote.fiat_amount_ngn)}</strong>
        </span>
      </div>

      {/* Wallet Address Input */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Destination {symbol} Address ({quote.network}) <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          value={walletAddress}
          onChange={handleWalletChange}
          placeholder={`Paste your ${quote.network} wallet address`}
          required
          className={`w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#00c853] dark:focus:ring-[#00e676] transition-all ${
            validationError
              ? 'border-rose-400 ring-1 ring-rose-400'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        />
        {validationError && (
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{validationError}</span>
          </p>
        )}
      </div>

      {/* Authenticated Customer View */}
      {isAuthenticated && user ? (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#00c853] dark:bg-[#00e676] text-slate-950 flex items-center justify-center font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 stroke-[3]" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                Logged in as {user.full_name || user.email}
              </span>
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-mono">
                Order will be securely bound to {user.email}
              </span>
            </div>
          </div>

          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-[#00e676] bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">
            Verified
          </span>
        </div>
      ) : (
        /* Guest View: Mandatory Sign Up / Login Auth Gate */
        <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-950/90 border-2 border-emerald-500/30 dark:border-emerald-500/40 shadow-lg space-y-4">
          {/* Header Badge & Warning */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-[#00c853] dark:text-[#00e676] shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-[#00e676]">
                  Account Required
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50">
                  Step Mandatory
                </span>
              </div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                Sign up or log in to complete your order
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                To guarantee your funds are safeguarded and you can track your crypto payout, all orders must belong to a registered account.
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-200/80 dark:bg-slate-900 p-1 border border-slate-300/60 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => {
                setAuthMode('REGISTER');
                setAuthError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'REGISTER'
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00c853] dark:text-[#00e676]" />
              <span>Create Account</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('LOGIN');
                setAuthError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'LOGIN'
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>I Have an Account</span>
            </button>
          </div>

          {/* Error Message */}
          {authError && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2 text-rose-600 dark:text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {/* Inline Input Fields */}
          <div className="space-y-2.5">
            {authMode === 'REGISTER' && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Full Name <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                    placeholder="e.g. Alex Johnson"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00c853] dark:focus:ring-[#00e676]"
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => {
                    setAuthEmail(e.target.value);
                    setAuthError(null);
                  }}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00c853] dark:focus:ring-[#00e676]"
                />
              </div>
            </div>

            {authMode === 'REGISTER' && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Phone Number <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    placeholder="0801 234 5678"
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00c853] dark:focus:ring-[#00e676]"
                  />
                </div>
              </div>
            )}

            {/* Password Field */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={authPassword}
                  onChange={(e) => {
                    setAuthPassword(e.target.value);
                    setAuthError(null);
                  }}
                  placeholder="At least 6 characters"
                  required
                  className="w-full pl-9 pr-9 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00c853] dark:focus:ring-[#00e676]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {authMode === 'REGISTER' && (
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={authConfirmPassword}
                    onChange={(e) => {
                      setAuthConfirmPassword(e.target.value);
                      setAuthError(null);
                    }}
                    placeholder="Repeat your password"
                    required
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00c853] dark:focus:ring-[#00e676]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Server Error */}
      {serverError && (
        <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-xs font-semibold text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Main Action Button */}
      <button
        type="submit"
        disabled={isValidating || timeLeft === 0}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.99] disabled:opacity-50 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        {isValidating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>
              {!isAuthenticated
                ? authMode === 'REGISTER'
                  ? 'Creating Account & Securing Order...'
                  : 'Signing In & Securing Order...'
                : 'Generating Virtual Account...'}
            </span>
          </>
        ) : !isAuthenticated ? (
          <>
            <Lock className="w-4 h-4" />
            <span>
              {authMode === 'REGISTER' ? 'Sign Up & Get Bank Account' : 'Sign In & Get Bank Account'}
            </span>
            <ArrowRight className="w-4 h-4" />
          </>
        ) : (
          <>
            <span>Get Virtual Bank Account</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Security guarantee footer note */}
      <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
        🔒 Non-custodial payout • Guaranteed rates locked with SEC-licensed Quidax engine.
      </p>
    </form>
  );
};
