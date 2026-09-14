import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, ShieldCheck, Lock, KeyRound, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { adminApi } from '../../shared/api/admin';
import { useAdminAuth } from '../../shared/hooks/useAdminAuth';

export const AdminLoginPage: React.FC = () => {
  const [stage, setStage] = useState<'CREDENTIALS' | '2FA'>('CREDENTIALS');
  const [email, setEmail] = useState('admin@swiftsats.com');
  const [password, setPassword] = useState('SwiftAdmin2026!');
  const [totpCode, setTotpCode] = useState('123456');
  const [tempToken, setTempToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { login } = useAdminAuth();
  const navigate = useNavigate();

  // Step 1: Submit email & password
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await adminApi.loginInit(email, password);
      if (res.success && res.requires_2fa) {
        setTempToken(res.temp_session_token);
        setStage('2FA');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid administrator credentials.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Submit 2FA TOTP code
  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await adminApi.verify2FA(email, tempToken, totpCode);
      if (res.success && res.token) {
        login(res.token, res.user);
        navigate('/admin');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid 2FA verification code.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6 font-sans transition-colors duration-200">
      <div className="max-w-4xl w-full bg-white dark:bg-slate-900 rounded-2xl shadow-elevated border border-slate-200/80 dark:border-slate-800 overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Col: Brand & Trust Messaging (Split-Screen) */}
        <div className="bg-slate-900 text-white p-8 sm:p-12 flex flex-col justify-between space-y-8">
          <div>
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                <Zap className="w-5 h-5 fill-white" />
              </div>
              <span className="text-xl font-bold tracking-tight font-sans">
                Swift<span className="text-emerald-400">Sats</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              Enterprise Operations & Settlement Console
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-3 leading-relaxed">
              Internal mission control for Quidax crypto withdrawals, Paystack virtual bank accounts, and real-time transaction monitoring.
            </p>
          </div>

          <div className="space-y-4 pt-6 border-t border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Mandatory Time-Based One-Time Password (TOTP)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Immutable Forensic Audit Logging</span>
            </div>
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Zero Card Data / Parameterized ORM Protection</span>
            </div>
          </div>
        </div>

        {/* Right Col: Login Form */}
        <div className="p-8 sm:p-12 flex flex-col justify-center">
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Multi-Factor Authentication Enabled</span>
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {stage === 'CREDENTIALS' ? 'Operator Sign In' : 'Two-Factor Verification'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {stage === 'CREDENTIALS'
                ? 'Enter your administrative credentials to continue'
                : `Enter the 6-digit code for ${email}`}
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {stage === 'CREDENTIALS' ? (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-600"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-600"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 active:bg-slate-950 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isLoading ? 'Verifying...' : 'Continue to 2FA'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handle2FASubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5">
                  Authenticator 6-Digit Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-center font-mono font-black text-2xl tracking-widest text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-100 focus:border-emerald-600"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 text-center">
                  In development mode, enter code <strong>123456</strong> or your TOTP app token.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStage('CREDENTIALS')}
                  className="py-2.5 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading || totpCode.length !== 6}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{isLoading ? 'Verifying TOTP...' : 'Authorize & Enter'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
